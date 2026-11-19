-- Cria pedido recalculando preços no servidor
create or replace function public.create_order(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  it jsonb;
  prod public.products;
  qty int;
  items jsonb := '[]'::jsonb;
  subtotal numeric := 0;
  discount numeric := 0;
  fee numeric := 0;
  s jsonb;
  cp jsonb;
  method text := coalesce(p->'shipping'->>'method', 'retirada');
  new_code text;
begin
  if coalesce(trim(p->'customer'->>'name'), '') = '' or coalesce(trim(p->'customer'->>'phone'), '') = '' then
    raise exception 'Informe nome e WhatsApp';
  end if;
  if jsonb_typeof(p->'items') <> 'array' or jsonb_array_length(p->'items') = 0 then
    raise exception 'Carrinho vazio';
  end if;
  if jsonb_array_length(p->'items') > 30 then raise exception 'Itens demais'; end if;

  for it in select * from jsonb_array_elements(p->'items') loop
    qty := greatest(1, least(20, coalesce((it->>'qty')::int, 1)));
    select * into prod from public.products where id = (it->>'id')::uuid and active for update;
    if not found then raise exception 'Produto indisponível'; end if;
    if not prod.made_to_order then
      if prod.stock < qty then raise exception 'Estoque insuficiente para %', prod.name; end if;
      update public.products set stock = stock - qty where id = prod.id;
    end if;
    items := items || jsonb_build_object(
      'id', prod.id, 'name', prod.name, 'price', prod.price, 'qty', qty,
      'color', left(coalesce(it->>'color', ''), 60),
      'image', coalesce(prod.images[1], ''),
      'made_to_order', prod.made_to_order);
    subtotal := subtotal + prod.price * qty;
  end loop;

  if coalesce(p->>'coupon', '') <> '' then
    cp := public.check_coupon(p->>'coupon', subtotal);
    if (cp->>'ok')::boolean then discount := (cp->>'discount')::numeric; end if;
  end if;

  select data into s from public.settings where id = 1;
  if method = 'envio' then
    fee := coalesce((s->>'shipping_flat')::numeric, 0);
    if coalesce((s->>'free_shipping_over')::numeric, 0) > 0
       and subtotal - discount >= (s->>'free_shipping_over')::numeric then fee := 0; end if;
  elsif method = 'combinar' then
    fee := 0;
  else
    method := 'retirada'; fee := 0;
  end if;

  loop
    new_code := 'TL' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.orders where code = new_code);
  end loop;

  insert into public.orders (code, customer, shipping, items, subtotal, discount, shipping_fee, total, coupon, payment_method, notes, status)
  values (
    new_code,
    jsonb_build_object(
      'name', left(trim(p->'customer'->>'name'), 120),
      'phone', left(trim(p->'customer'->>'phone'), 30),
      'email', left(trim(coalesce(p->'customer'->>'email', '')), 120)),
    jsonb_build_object('method', method, 'address', coalesce(p->'shipping'->'address', '{}'::jsonb)),
    items, subtotal, discount, fee, subtotal - discount + fee,
    case when discount > 0 then upper(p->>'coupon') end,
    case when p->>'payment_method' in ('pix','cartao_link','combinar') then p->>'payment_method' else 'pix' end,
    left(coalesce(p->>'notes', ''), 1000),
    'aguardando_pagamento');

  return jsonb_build_object('code', new_code, 'subtotal', subtotal, 'discount', discount,
    'shipping_fee', fee, 'total', subtotal - discount + fee, 'items', items);
end $$;

