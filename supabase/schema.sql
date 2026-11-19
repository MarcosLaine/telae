-- =========================================================
-- Telaé Bolsas Artesanais — schema Supabase
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------- Admins ----------
create table if not exists public.admins (
  email text primary key,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------- Configurações da loja (linha única) ----------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- Categorias ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Produtos ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  details text not null default '',
  price numeric(10,2) not null default 0 check (price >= 0),
  compare_at_price numeric(10,2),
  category_id uuid references public.categories(id) on delete set null,
  images text[] not null default '{}',
  colors text[] not null default '{}',
  stock int not null default 0,
  made_to_order boolean not null default true,
  production_days int not null default 15,
  featured boolean not null default false,
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_category_idx on public.products(category_id);

-- ---------- Cupons ----------
create table if not exists public.coupons (
  code text primary key,
  kind text not null default 'percent' check (kind in ('percent','fixed')),
  value numeric(10,2) not null check (value > 0),
  min_total numeric(10,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Pedidos ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer jsonb not null,
  shipping jsonb not null,
  items jsonb not null,
  subtotal numeric(10,2) not null,
  discount numeric(10,2) not null default 0,
  shipping_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  coupon text,
  payment_method text not null default 'pix',
  status text not null default 'novo'
    check (status in ('novo','aguardando_pagamento','pago','em_producao','enviado','entregue','cancelado')),
  notes text not null default '',
  admin_notes text not null default '',
  tracking_code text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders(created_at desc);

-- ---------- RLS ----------
alter table public.admins     enable row level security;
alter table public.settings   enable row level security;
alter table public.categories enable row level security;
alter table public.products   enable row level security;
alter table public.coupons    enable row level security;
alter table public.orders     enable row level security;

drop policy if exists admins_admin on public.admins;
create policy admins_admin on public.admins for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select using (true);
drop policy if exists settings_admin on public.settings;
create policy settings_admin on public.settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select using (true);
drop policy if exists categories_admin on public.categories;
create policy categories_admin on public.categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_read on public.products;
create policy products_read on public.products for select using (active or public.is_admin());
drop policy if exists products_admin on public.products;
create policy products_admin on public.products for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists coupons_admin on public.coupons;
create policy coupons_admin on public.coupons for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists orders_admin on public.orders;
create policy orders_admin on public.orders for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Funções públicas (checkout) ----------

-- Valida cupom sem expor a tabela
create or replace function public.check_coupon(p_code text, p_subtotal numeric)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c public.coupons;
begin
  select * into c from public.coupons where upper(code) = upper(trim(p_code)) and active;
  if not found then return jsonb_build_object('ok', false, 'error', 'Cupom inválido'); end if;
  if p_subtotal < c.min_total then
    return jsonb_build_object('ok', false, 'error', 'Valor mínimo para este cupom: R$ ' || to_char(c.min_total, 'FM999990D00'));
  end if;
  return jsonb_build_object('ok', true, 'code', c.code, 'kind', c.kind, 'value', c.value,
    'discount', least(p_subtotal, case when c.kind = 'percent' then round(p_subtotal * c.value / 100, 2) else c.value end));
end $$;

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

-- Acompanhamento do pedido pelo cliente (código + telefone)
create or replace function public.track_order(p_code text, p_phone text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', code, 'status', status, 'items', items, 'total', total,
    'shipping', shipping->>'method', 'tracking_code', tracking_code, 'created_at', created_at)
  from public.orders
  where upper(code) = upper(trim(p_code))
    and right(regexp_replace(customer->>'phone', '\D', '', 'g'), 8) = right(regexp_replace(p_phone, '\D', '', 'g'), 8)
  limit 1;
$$;

grant execute on function public.check_coupon(text, numeric) to anon, authenticated;
grant execute on function public.create_order(jsonb) to anon, authenticated;
grant execute on function public.track_order(text, text) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- Storage (fotos) ----------
insert into storage.buckets (id, name, public) values ('products', 'products', true)
on conflict (id) do nothing;

drop policy if exists "products public read" on storage.objects;
create policy "products public read" on storage.objects for select using (bucket_id = 'products');
drop policy if exists "products admin write" on storage.objects;
create policy "products admin write" on storage.objects for insert with check (bucket_id = 'products' and public.is_admin());
drop policy if exists "products admin update" on storage.objects;
create policy "products admin update" on storage.objects for update using (bucket_id = 'products' and public.is_admin());
drop policy if exists "products admin delete" on storage.objects;
create policy "products admin delete" on storage.objects for delete using (bucket_id = 'products' and public.is_admin());
