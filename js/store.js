import { sb, money, esc, img, waLink, toast, getSettings, onlyDigits, STATUS, SHIPPING, PAYMENT, fmtDate } from './common.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $('#app');

let S = {};             // configurações da loja
let products = [];      // produtos ativos
let categories = [];
let dataReady;

/* ---------------- Carrinho ---------------- */
const CART_KEY = 'telae_cart_v1';
const cart = {
  items: [],
  load() { try { this.items = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { this.items = []; } },
  save() { try { localStorage.setItem(CART_KEY, JSON.stringify(this.items)); } catch {} renderCartBadge(); },
  add(id, qty = 1, color = '') {
    const ex = this.items.find((i) => i.id === id && i.color === color);
    if (ex) ex.qty = Math.min(20, ex.qty + qty); else this.items.push({ id, qty, color });
    this.save();
  },
  set(idx, qty) { if (qty <= 0) this.items.splice(idx, 1); else this.items[idx].qty = Math.min(20, qty); this.save(); },
  clear() { this.items = []; this.save(); },
  lines() {
    return this.items.map((i) => ({ ...i, p: products.find((p) => p.id === i.id) })).filter((l) => l.p);
  },
  count() { return this.lines().reduce((a, l) => a + l.qty, 0); },
  subtotal() { return this.lines().reduce((a, l) => a + l.qty * Number(l.p.price), 0); },
};

function renderCartBadge() {
  const n = cart.count();
  const b = $('#cartCount');
  b.textContent = n; b.hidden = n === 0;
}

/* ---------------- Dados ---------------- */
async function loadData() {
  const [s, c, p] = await Promise.all([
    getSettings(),
    sb.from('categories').select('*').order('sort'),
    sb.from('products').select('*').eq('active', true).order('sort').order('created_at', { ascending: false }),
  ]);
  S = s || {};
  categories = c.data || [];
  products = p.data || [];
  if (p.error) console.error(p.error);
  applySettings();
}

function applySettings() {
  $('#announce').textContent = S.announcement || '';
  const wa = waLink(S.whatsapp || '', 'Olá! Vim pelo site da Telaé 💛');
  $('#waFloat').href = wa; $('#footWa').href = wa;
  $('#footIg').href = `https://instagram.com/${(S.instagram || 'telaebolsas').replace('@', '')}`;
  $('#footCity').textContent = S.city || '';
  $('#year').textContent = new Date().getFullYear();
  if (S.tagline) $('#footTagline').textContent = `${S.tagline}, feitas à mão por Raquel Júnia.`;
}

/* ---------------- Componentes ---------------- */
const catName = (id) => categories.find((c) => c.id === id)?.name || '';

function card(p) {
  const sale = p.compare_at_price && Number(p.compare_at_price) > Number(p.price);
  const soldOut = !p.made_to_order && p.stock <= 0;
  return `
  <article class="card">
    <a href="#/produto/${esc(p.slug)}" class="card-img">
      <img src="${esc(img(p.images?.[0]))}" alt="${esc(p.name)}" loading="lazy" width="440" height="550">
      ${soldOut ? '<span class="badge">Esgotada</span>' : sale ? '<span class="badge sale">Oferta</span>' : p.featured ? '<span class="badge">Destaque</span>' : ''}
      ${soldOut ? '' : `<button class="btn btn-sm btn-block card-quick" data-add="${p.id}">Adicionar à sacola</button>`}
    </a>
    <a href="#/produto/${esc(p.slug)}" class="card-name">${esc(p.name)}</a>
    <div class="card-meta">
      <span class="price">${sale ? `<span class="price-old">${money(p.compare_at_price)}</span>` : ''}${money(p.price)}</span>
      <span class="card-color">${esc(p.colors?.[0] || '')}</span>
    </div>
  </article>`;
}

function bindCards(root = app) {
  $$('[data-add]', root).forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    const p = products.find((x) => x.id === b.dataset.add);
    cart.add(p.id, 1, p.colors?.[0] || '');
    toast(`${p.name} foi para a sacola`);
    openCart();
  }));
}

const icons = {
  hand: '<svg viewBox="0 0 24 24"><path d="M7 11V5.5a1.5 1.5 0 0 1 3 0V10m0-5.5v-1a1.5 1.5 0 0 1 3 0V10m0-4.5a1.5 1.5 0 0 1 3 0V12m0-3.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.4L4 15.5a1.5 1.5 0 0 1 2.6-1.5L7 15"/></svg>',
  drop: '<svg viewBox="0 0 24 24"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/></svg>',
  truck: '<svg viewBox="0 0 24 24"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
  gem: '<svg viewBox="0 0 24 24"><path d="M6 4h12l3 5-9 11L3 9z"/><path d="M3 9h18M9 4l3 16 3-16"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>',
};

function mobileBar(html) {
  removeMobileBar();
  const bar = document.createElement('div');
  bar.className = 'mobile-bar'; bar.id = 'mobileBar';
  bar.innerHTML = html;
  document.body.appendChild(bar);
  document.body.classList.add('has-sticky');
  return bar;
}
function removeMobileBar() { $('#mobileBar')?.remove(); document.body.classList.remove('has-sticky'); }

/* ---------------- Páginas ---------------- */
function viewHome() {
  const feat = products.filter((p) => p.featured);
  const showcase = (feat.length >= 4 ? feat : products).slice(0, 8);
  const art = (feat.length >= 3 ? feat : products).slice(0, 3);
  app.innerHTML = `
  <section class="hero">
    <div class="wrap hero-in">
      <div>
        <span class="eyebrow">Feitas à mão · Bom Despacho, MG</span>
        <h1>${esc(S.hero_title || 'Uma joia em forma de bolsa').replace(/bolsa$/i, '<em>bolsa</em>')}</h1>
        <p>${esc(S.hero_subtitle || '')}</p>
        <div class="hero-cta">
          <a class="btn" href="#/loja">Ver a coleção</a>
          <a class="btn btn-ghost" href="#/encomendas">Encomendar</a>
        </div>
      </div>
      <div class="hero-art">
        ${art.map((p, i) => `<a href="#/produto/${esc(p.slug)}"><img src="${esc(img(p.images?.[0]))}" alt="${esc(p.name)}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}></a>`).join('')}
      </div>
    </div>
  </section>
  <section class="values">
    <div class="wrap values-in">
      <div class="value">${icons.hand}<div><b>Tecidas à mão</b><span>Peça por peça, sem atalhos</span></div></div>
      <div class="value">${icons.drop}<div><b>Impermeabilizadas</b><span>Pode usar cor clara sem medo</span></div></div>
      <div class="value">${icons.gem}<div><b>Exclusivas</b><span>Quantidade limitada</span></div></div>
      <div class="value">${icons.truck}<div><b>Todo o Brasil</b><span>Envio ou retirada</span></div></div>
    </div>
  </section>
  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <div><span class="eyebrow">Coleção</span><h2>Escolha a sua</h2></div>
        <div class="chips">${categories.map((c) => `<a class="chip" href="#/loja?cat=${esc(c.slug)}">${esc(c.name)}</a>`).join('')}</div>
      </div>
      <div class="grid">${showcase.map(card).join('')}</div>
      <div style="text-align:center;margin-top:36px"><a class="btn btn-ghost" href="#/loja">Ver todas as ${products.length} bolsas</a></div>
    </div>
  </section>
  <section class="section" style="padding-top:0">
    <div class="wrap split">
      <img src="${esc(img(products.find((p) => p.slug === 'perlla')?.images?.[0] || products[1]?.images?.[0]))}" alt="Bolsa artesanal Telaé" loading="lazy">
      <div>
        <span class="eyebrow">A Telaé</span>
        <h2>Não é só uma bolsa. É identidade.</h2>
        <p class="muted">${esc((S.about || '').split('. ').slice(0, 3).join('. '))}.</p>
        <p class="quote">“Não aceito atalhos: desmancho quantas vezes for preciso para ficar perfeita.”</p>
        <a class="btn btn-ghost" href="#/sobre">Conheça a história</a>
      </div>
    </div>
  </section>
  <section class="section" style="padding-top:0">
    <div class="wrap ig-band">
      <div>
        <span class="eyebrow" style="color:#D9BC8A">@${esc(S.instagram || 'telaebolsas')}</span>
        <h2>Quer uma cor só sua?</h2>
        <p>Toda bolsa pode ser feita na sua cor favorita. Chame no WhatsApp ou no Direct e crie a sua peça exclusiva.</p>
        <div class="hero-cta">
          <a class="btn" href="${waLink(S.whatsapp, 'Olá! Quero encomendar uma bolsa Telaé personalizada 💛')}" target="_blank" rel="noopener">Encomendar pelo WhatsApp</a>
        </div>
      </div>
      <div class="ig-strip">${products.slice(3, 9).map((p) => `<a href="#/produto/${esc(p.slug)}"><img src="${esc(img(p.images?.[0]))}" alt="${esc(p.name)}" loading="lazy"></a>`).join('')}</div>
    </div>
  </section>`;
  bindCards();
}

function viewShop(q) {
  const cat = q.get('cat') || '';
  const term = (q.get('q') || '').trim();
  const featOnly = q.get('destaques') === '1';
  const sort = q.get('ordem') || 'relevancia';
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  let list = products.slice();
  const catObj = categories.find((c) => c.slug === cat);
  if (catObj) list = list.filter((p) => p.category_id === catObj.id);
  if (featOnly) list = list.filter((p) => p.featured);
  if (term) {
    const t = norm(term);
    list = list.filter((p) => norm(`${p.name} ${p.description} ${(p.colors || []).join(' ')} ${catName(p.category_id)}`).includes(t));
  }
  if (sort === 'menor') list.sort((a, b) => a.price - b.price);
  if (sort === 'maior') list.sort((a, b) => b.price - a.price);
  if (sort === 'novidades') list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const link = (params) => {
    const n = new URLSearchParams(q);
    Object.entries(params).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    const s = n.toString();
    return `#/loja${s ? `?${s}` : ''}`;
  };
  const title = term ? `Busca: “${esc(term)}”` : featOnly ? 'Destaques' : catObj ? esc(catObj.name) : 'Todas as bolsas';
  app.innerHTML = `
  <div class="wrap shop-top">
    <span class="eyebrow">Loja</span>
    <h1 style="font-size:clamp(2.2rem,5vw,3.4rem)">${title}</h1>
    <div class="chips" style="margin-top:14px">
      <a class="chip ${!cat && !featOnly ? 'active' : ''}" href="${link({ cat: '', destaques: '' })}">Todas</a>
      ${categories.map((c) => `<a class="chip ${c.slug === cat ? 'active' : ''}" href="${link({ cat: c.slug, destaques: '' })}">${esc(c.name)}</a>`).join('')}
    </div>
    <div class="shop-tools">
      <span class="muted">${list.length} ${list.length === 1 ? 'peça' : 'peças'}</span>
      <select class="input" id="sortSel" aria-label="Ordenar">
        <option value="relevancia">Ordenar: relevância</option>
        <option value="novidades">Novidades</option>
        <option value="menor">Menor preço</option>
        <option value="maior">Maior preço</option>
      </select>
    </div>
  </div>
  <div class="wrap" style="padding-bottom:56px">
    ${list.length ? `<div class="grid">${list.map(card).join('')}</div>` : `<div class="empty"><p>Nenhuma bolsa encontrada.</p><a class="btn btn-ghost" href="#/loja">Ver todas</a></div>`}
  </div>`;
  const sel = $('#sortSel'); sel.value = sort;
  sel.addEventListener('change', () => { location.hash = link({ ordem: sel.value === 'relevancia' ? '' : sel.value }); });
  bindCards();
}

function viewProduct(slug) {
  const p = products.find((x) => x.slug === slug);
  if (!p) { app.innerHTML = `<div class="wrap empty"><h2>Bolsa não encontrada</h2><a class="btn" href="#/loja">Voltar à loja</a></div>`; return; }
  document.title = `${p.name} — Telaé`;
  const imgs = p.images?.length ? p.images : [''];
  const soldOut = !p.made_to_order && p.stock <= 0;
  const sale = p.compare_at_price && Number(p.compare_at_price) > Number(p.price);
  const related = products.filter((x) => x.id !== p.id && x.category_id === p.category_id).concat(products.filter((x) => x.id !== p.id && x.category_id !== p.category_id)).slice(0, 4);
  let qty = 1;
  let color = p.colors?.[0] || '';
  const pageUrl = location.href;

  app.innerHTML = `
  <div class="wrap">
    <div class="crumbs"><a href="#/loja">Loja</a> / ${p.category_id ? `<a href="#/loja?cat=${esc(categories.find((c) => c.id === p.category_id)?.slug || '')}">${esc(catName(p.category_id))}</a> / ` : ''}${esc(p.name)}</div>
    <div class="pdp">
      <div class="gallery">
        <div class="gallery-main"><img id="mainImg" src="${esc(img(imgs[0]))}" alt="${esc(p.name)}"></div>
        ${imgs.length > 1 ? `<div class="thumbs">${imgs.map((u, i) => `<button class="${i ? '' : 'active'}" data-i="${i}" aria-label="Foto ${i + 1}"><img src="${esc(img(u))}" alt=""></button>`).join('')}</div>` : ''}
      </div>
      <div class="pdp-info">
        <span class="eyebrow">${esc(catName(p.category_id) || 'Telaé')}</span>
        <h1>${esc(p.name)}</h1>
        <div class="pdp-price">${sale ? `<span class="price-old">${money(p.compare_at_price)}</span>` : ''}${money(p.price)}</div>
        <div class="pdp-installments">No Pix ou no cartão (link de pagamento)</div>
        <p class="pdp-desc">${esc(p.description)}</p>
        ${p.colors?.length > 1 ? `<div class="opt-label">Cor</div><div class="chips" id="colorChips">${p.colors.map((c, i) => `<button class="chip ${i ? '' : 'active'}" data-color="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : p.colors?.[0] ? `<div class="opt-label">Cor: <b style="color:var(--ink)">${esc(p.colors[0])}</b></div>` : ''}
        <div class="opt-label">Quantidade</div>
        <div class="qty"><button id="qMinus" aria-label="Menos">−</button><span id="qVal">1</span><button id="qPlus" aria-label="Mais">+</button></div>
        <div class="buy-row">
          <button class="btn" id="addBtn" ${soldOut ? 'disabled' : ''}>${soldOut ? 'Esgotada' : 'Adicionar à sacola'}</button>
          <a class="btn btn-ghost" target="_blank" rel="noopener" href="${waLink(S.whatsapp, `Olá! Tenho interesse na ${p.name}. ${pageUrl}`)}">${soldOut ? 'Encomendar pelo WhatsApp' : 'Tirar dúvidas no WhatsApp'}</a>
        </div>
        <div class="note">${icons.clock}<div>${p.made_to_order ? `<b>Feita sob encomenda.</b> Produção em até ${p.production_days || 15} dias úteis + prazo de envio.` : `<b>Pronta entrega</b> · ${p.stock} em estoque.`} Também pode ser feita em outra cor — é só pedir.</div></div>
        <details class="acc" open><summary>Detalhes da peça</summary><p>${esc(p.details || 'Bolsa tecida à mão em tela, com fio de alta resistência, acabamento impermeabilizado e ferragens douradas. Cada peça é única: pequenas variações fazem parte do trabalho artesanal.')}</p></details>
        <details class="acc"><summary>Cuidados</summary><p>Limpe com pano úmido e sabão neutro, sem esfregar. Seque à sombra. Guarde com enchimento de papel para manter o formato e longe de umidade.</p></details>
        <details class="acc"><summary>Entrega e pagamento</summary><p>Enviamos para todo o Brasil${S.shipping_flat ? ` (frete fixo de ${money(S.shipping_flat)}${Number(S.free_shipping_over) > 0 ? `, grátis acima de ${money(S.free_shipping_over)}` : ''})` : ''} ou você retira em ${esc(S.city || 'Bom Despacho - MG')}. Pagamento via Pix ou cartão por link de pagamento.</p></details>
      </div>
    </div>
    ${related.length ? `<section class="section" style="padding-top:24px"><div class="section-head"><h2>Você também vai amar</h2></div><div class="grid">${related.map(card).join('')}</div></section>` : ''}
  </div>`;

  $$('.thumbs button').forEach((b) => b.addEventListener('click', () => {
    $('#mainImg').src = img(imgs[b.dataset.i]);
    $$('.thumbs button').forEach((x) => x.classList.toggle('active', x === b));
  }));
  $$('#colorChips .chip').forEach((b) => b.addEventListener('click', () => {
    color = b.dataset.color;
    $$('#colorChips .chip').forEach((x) => x.classList.toggle('active', x === b));
  }));
  $('#qMinus').onclick = () => { qty = Math.max(1, qty - 1); $('#qVal').textContent = qty; };
  $('#qPlus').onclick = () => { qty = Math.min(soldOut ? 1 : p.made_to_order ? 20 : p.stock, qty + 1); $('#qVal').textContent = qty; };
  const add = () => { cart.add(p.id, qty, color); toast(`${p.name} foi para a sacola`); openCart(); };
  $('#addBtn').onclick = add;
  bindCards();

  const bar = mobileBar(`<div class="mb-price"><small>${esc(p.name)}</small><b>${money(p.price)}</b></div><button class="btn" ${soldOut ? 'disabled' : ''}>${soldOut ? 'Esgotada' : 'Adicionar à sacola'}</button>`);
  $('button', bar).onclick = add;
}

/* ---------------- Sacola (drawer) ---------------- */
function renderCart() {
  const lines = cart.lines();
  const body = $('#cartBody'), foot = $('#cartFoot');
  if (!lines.length) {
    body.innerHTML = `<div class="empty"><p>Sua sacola está vazia.</p><a class="btn" href="#/loja" id="emptyGo">Ver bolsas</a></div>`;
    $('#emptyGo').onclick = closeCart;
    foot.innerHTML = '';
    return;
  }
  body.innerHTML = lines.map((l, i) => `
    <div class="line-item">
      <img src="${esc(img(l.p.images?.[0]))}" alt="">
      <div>
        <div class="name">${esc(l.p.name)}</div>
        <div class="sub">${esc(l.color)}${l.p.made_to_order ? ' · sob encomenda' : ''}</div>
        <div class="qty" style="margin-top:8px"><button data-dec="${i}" aria-label="Menos">−</button><span>${l.qty}</span><button data-inc="${i}" aria-label="Mais">+</button></div>
      </div>
      <div style="text-align:right"><div class="price">${money(l.p.price * l.qty)}</div><button class="remove" data-rm="${i}">remover</button></div>
    </div>`).join('');
  foot.innerHTML = `
    <div class="sum-row total"><span>Subtotal</span><span>${money(cart.subtotal())}</span></div>
    <p class="muted" style="font-size:.82rem;margin:4px 0 14px">Frete e cupom calculados no próximo passo.</p>
    <a class="btn btn-block" href="#/checkout" id="goCheckout">Finalizar pedido</a>
    <button class="link" style="display:block;margin:12px auto 0" id="keepBuying">Continuar comprando</button>`;
  // índices referem-se às linhas válidas: mapear para itens do carrinho
  const realIdx = (i) => cart.items.findIndex((it) => it.id === lines[i].id && it.color === lines[i].color);
  $$('[data-dec]', body).forEach((b) => b.onclick = () => { const i = +b.dataset.dec; cart.set(realIdx(i), lines[i].qty - 1); renderCart(); });
  $$('[data-inc]', body).forEach((b) => b.onclick = () => { const i = +b.dataset.inc; const p = lines[i].p; if (!p.made_to_order && lines[i].qty >= p.stock) return toast('Quantidade máxima em estoque', 'err'); cart.set(realIdx(i), lines[i].qty + 1); renderCart(); });
  $$('[data-rm]', body).forEach((b) => b.onclick = () => { cart.set(realIdx(+b.dataset.rm), 0); renderCart(); });
  $('#goCheckout').onclick = closeCart;
  $('#keepBuying').onclick = closeCart;
}
function openCart() {
  renderCart();
  $('#cartDrawer').classList.add('open'); $('#cartDrawer').setAttribute('aria-hidden', 'false');
  $('#drawerBackdrop').hidden = false; document.body.style.overflow = 'hidden';
}
function closeCart() {
  $('#cartDrawer').classList.remove('open'); $('#cartDrawer').setAttribute('aria-hidden', 'true');
  $('#drawerBackdrop').hidden = true; document.body.style.overflow = '';
}

/* ---------------- Checkout ---------------- */
function maskPhone(v) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
}

function viewCheckout() {
  const lines = cart.lines();
  if (!lines.length) { app.innerHTML = `<div class="wrap empty"><h2>Sua sacola está vazia</h2><a class="btn" href="#/loja">Ver bolsas</a></div>`; return; }
  const saved = (() => { try { return JSON.parse(localStorage.getItem('telae_customer')) || {}; } catch { return {}; } })();
  const flat = Number(S.shipping_flat || 0);
  const freeOver = Number(S.free_shipping_over || 0);
  let coupon = null;

  app.innerHTML = `
  <div class="wrap">
    <div class="crumbs"><a href="#/loja">Loja</a> / Finalizar pedido</div>
    <form class="checkout" id="coForm" novalidate>
      <div>
        <div class="panel">
          <h3><span class="step-n">1</span> Seus dados</h3>
          <div class="field"><label for="cName">Nome completo</label><input class="input" id="cName" autocomplete="name" required value="${esc(saved.name || '')}"></div>
          <div class="grid-2">
            <div class="field"><label for="cPhone">WhatsApp</label><input class="input" id="cPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="(37) 99999-9999" required value="${esc(saved.phone || '')}"></div>
            <div class="field"><label for="cEmail">E-mail <span class="muted">(opcional)</span></label><input class="input" id="cEmail" type="email" inputmode="email" autocomplete="email" value="${esc(saved.email || '')}"></div>
          </div>
        </div>
        <div class="panel">
          <h3><span class="step-n">2</span> Entrega</h3>
          <label class="radio-card"><input type="radio" name="ship" value="envio" checked><div><b>Envio pelos Correios · ${flat ? money(flat) : 'a calcular'}</b><span>${freeOver > 0 ? `Frete grátis acima de ${money(freeOver)}. ` : ''}Para todo o Brasil.</span></div></label>
          <label class="radio-card"><input type="radio" name="ship" value="retirada"><div><b>Retirar pessoalmente · grátis</b><span>${esc(S.pickup_address || S.city || '')}</span></div></label>
          <label class="radio-card"><input type="radio" name="ship" value="combinar"><div><b>Combinar pelo WhatsApp</b><span>Entrega local, motoboy ou outra forma.</span></div></label>
          <div id="addrBox" style="margin-top:16px">
            <div class="grid-2">
              <div class="field"><label for="aCep">CEP</label><input class="input" id="aCep" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" value="${esc(saved.cep || '')}"></div>
              <div class="field"><label for="aNum">Número</label><input class="input" id="aNum" inputmode="numeric" value="${esc(saved.num || '')}"></div>
            </div>
            <div class="field"><label for="aStreet">Rua</label><input class="input" id="aStreet" autocomplete="address-line1" value="${esc(saved.street || '')}"></div>
            <div class="grid-2">
              <div class="field"><label for="aComp">Complemento</label><input class="input" id="aComp" autocomplete="address-line2" value="${esc(saved.comp || '')}"></div>
              <div class="field"><label for="aHood">Bairro</label><input class="input" id="aHood" value="${esc(saved.hood || '')}"></div>
            </div>
            <div class="grid-2">
              <div class="field"><label for="aCity">Cidade</label><input class="input" id="aCity" autocomplete="address-level2" value="${esc(saved.city || '')}"></div>
              <div class="field"><label for="aUf">Estado</label><input class="input" id="aUf" maxlength="2" autocomplete="address-level1" value="${esc(saved.uf || '')}"></div>
            </div>
          </div>
        </div>
        <div class="panel">
          <h3><span class="step-n">3</span> Pagamento</h3>
          <label class="radio-card"><input type="radio" name="pay" value="pix" checked><div><b>Pix</b><span>${S.pix_key ? 'A chave Pix aparece ao confirmar o pedido.' : 'Enviamos a chave Pix pelo WhatsApp.'}</span></div></label>
          <label class="radio-card"><input type="radio" name="pay" value="cartao_link"><div><b>Cartão de crédito</b><span>Enviamos um link de pagamento seguro pelo WhatsApp.</span></div></label>
          <div class="field" style="margin-top:14px"><label for="cNotes">Observações <span class="muted">(cor diferente, presente, prazo…)</span></label><textarea class="input" id="cNotes"></textarea></div>
        </div>
      </div>
      <aside class="summary">
        <div class="panel">
          <button type="button" class="summary-toggle" id="sumToggle"><span>Resumo · ${cart.count()} ${cart.count() === 1 ? 'item' : 'itens'}</span><span id="sumTotalTop"></span></button>
          <h3 class="desk-only" style="margin-bottom:6px">Resumo do pedido</h3>
          <div class="summary-items">${lines.map((l) => `
            <div class="line-item" style="grid-template-columns:60px 1fr auto"><img src="${esc(img(l.p.images?.[0]))}" alt="" style="width:60px"><div><div class="name" style="font-size:1.05rem">${esc(l.p.name)}</div><div class="sub">${l.qty} × ${money(l.p.price)}${l.color ? ` · ${esc(l.color)}` : ''}</div></div><div>${money(l.p.price * l.qty)}</div></div>`).join('')}
          </div>
          <div class="coupon-row"><input class="input" id="cpCode" placeholder="Cupom de desconto" autocapitalize="characters"><button type="button" class="btn btn-ghost btn-sm" id="cpBtn">Aplicar</button></div>
          <div id="cpMsg"></div>
          <div class="sum-row"><span>Subtotal</span><span>${money(cart.subtotal())}</span></div>
          <div class="sum-row" id="discRow" hidden><span>Desconto</span><span id="discVal"></span></div>
          <div class="sum-row"><span>Frete</span><span id="shipVal"></span></div>
          <div class="sum-row total"><span>Total</span><span id="totalVal"></span></div>
          <button class="btn btn-block desk-submit" type="submit" style="margin-top:14px">Confirmar pedido</button>
          <p class="muted" style="font-size:.8rem;margin:10px 0 0;text-align:center">Ao confirmar, você recebe o código do pedido e fala com a Telaé pelo WhatsApp.</p>
        </div>
      </aside>
    </form>
  </div>`;

  const isMobile = () => matchMedia('(max-width: 760px)').matches;
  const desk = $('.desk-only'); if (isMobile()) desk.hidden = true;
  $('#sumToggle').onclick = () => $('.summary').classList.toggle('open');

  const bar = mobileBar(`<div class="mb-price"><small>Total</small><b id="mbTotal"></b></div><button class="btn" type="button">Confirmar pedido</button>`);
  $('button', bar).onclick = () => $('#coForm').requestSubmit();

  const shipMethod = () => $('input[name=ship]:checked').value;
  function totals() {
    const sub = cart.subtotal();
    const disc = coupon ? Math.min(sub, coupon.kind === 'percent' ? Math.round(sub * coupon.value) / 100 : Number(coupon.value)) : 0;
    let fee = 0;
    if (shipMethod() === 'envio') fee = freeOver > 0 && sub - disc >= freeOver ? 0 : flat;
    $('#discRow').hidden = !disc; $('#discVal').textContent = `− ${money(disc)}`;
    $('#shipVal').textContent = shipMethod() === 'envio' ? (fee ? money(fee) : 'Grátis') : shipMethod() === 'retirada' ? 'Grátis' : 'A combinar';
    const total = sub - disc + fee;
    $('#totalVal').textContent = money(total); $('#mbTotal').textContent = money(total); $('#sumTotalTop').textContent = money(total);
  }
  $$('input[name=ship]').forEach((r) => r.addEventListener('change', () => { $('#addrBox').hidden = shipMethod() !== 'envio'; totals(); }));
  totals();

  $('#cPhone').addEventListener('input', (e) => { e.target.value = maskPhone(e.target.value); });
  $('#aCep').addEventListener('input', async (e) => {
    const d = onlyDigits(e.target.value).slice(0, 8);
    e.target.value = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
    if (d.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`).then((x) => x.json());
      if (r.erro) return toast('CEP não encontrado', 'err');
      $('#aStreet').value = r.logradouro || ''; $('#aHood').value = r.bairro || '';
      $('#aCity').value = r.localidade || ''; $('#aUf').value = r.uf || '';
      $('#aNum').focus();
    } catch { /* sem internet ou CEP inválido: cliente preenche manualmente */ }
  });

  $('#cpBtn').onclick = async () => {
    const code = $('#cpCode').value.trim();
    if (!code) return;
    const { data, error } = await sb.rpc('check_coupon', { p_code: code, p_subtotal: cart.subtotal() });
    if (error || !data?.ok) { coupon = null; $('#cpMsg').innerHTML = `<div class="err">${esc(data?.error || 'Cupom inválido')}</div>`; }
    else { coupon = data; $('#cpMsg').innerHTML = `<div style="color:var(--ok);font-size:.88rem;margin-bottom:8px">Cupom ${esc(data.code)} aplicado ✓</div>`; }
    totals();
  };

  $('#coForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#cName').value.trim(), phone = $('#cPhone').value.trim();
    if (name.length < 3) { $('#cName').focus(); return toast('Informe seu nome completo', 'err'); }
    if (onlyDigits(phone).length < 10) { $('#cPhone').focus(); return toast('Informe um WhatsApp válido com DDD', 'err'); }
    const method = shipMethod();
    const address = method === 'envio' ? {
      cep: $('#aCep').value.trim(), street: $('#aStreet').value.trim(), number: $('#aNum').value.trim(),
      complement: $('#aComp').value.trim(), district: $('#aHood').value.trim(), city: $('#aCity').value.trim(), uf: $('#aUf').value.trim().toUpperCase(),
    } : {};
    if (method === 'envio' && (onlyDigits(address.cep).length !== 8 || !address.street || !address.number || !address.city)) {
      $('#aCep').focus(); return toast('Preencha o endereço de entrega (CEP, rua, número e cidade)', 'err');
    }
    try {
      localStorage.setItem('telae_customer', JSON.stringify({ name, phone, email: $('#cEmail').value.trim(), cep: address.cep, num: address.number, street: address.street, comp: address.complement, hood: address.district, city: address.city, uf: address.uf }));
    } catch {}
    const btns = $$('button[type=submit], #mobileBar button'); btns.forEach((b) => { b.disabled = true; b.textContent = 'Enviando…'; });
    const payload = {
      customer: { name, phone, email: $('#cEmail').value.trim() },
      shipping: { method, address },
      items: cart.items.map((i) => ({ id: i.id, qty: i.qty, color: i.color })),
      coupon: coupon?.code || '',
      payment_method: $('input[name=pay]:checked').value,
      notes: $('#cNotes').value.trim(),
    };
    const { data, error } = await sb.rpc('create_order', { p: payload });
    if (error) {
      btns.forEach((b) => { b.disabled = false; b.textContent = 'Confirmar pedido'; });
      return toast(error.message?.replace(/^.*?:\s*/, '') || 'Não foi possível criar o pedido', 'err');
    }
    const order = { ...data, customer: payload.customer, shipping: payload.shipping, payment_method: payload.payment_method, notes: payload.notes };
    try { sessionStorage.setItem(`telae_order_${data.code}`, JSON.stringify(order)); } catch {}
    cart.clear();
    location.hash = `#/pedido/${data.code}`;
  });
}

function orderMessage(o) {
  const lines = o.items.map((i) => `• ${i.qty}x ${i.name}${i.color ? ` (${i.color})` : ''} — ${money(i.price * i.qty)}`).join('\n');
  const a = o.shipping?.address || {};
  const addr = o.shipping?.method === 'envio' ? `\n📍 ${a.street}, ${a.number}${a.complement ? ` - ${a.complement}` : ''}, ${a.district} - ${a.city}/${a.uf} · CEP ${a.cep}` : '';
  return `Olá! Acabei de fazer o pedido *${o.code}* no site da Telaé 💛\n\n${lines}\n\nSubtotal: ${money(o.subtotal)}${Number(o.discount) ? `\nDesconto: -${money(o.discount)}` : ''}\nFrete: ${o.shipping?.method === 'combinar' ? 'a combinar' : money(o.shipping_fee)}\n*Total: ${money(o.total)}*\n\nEntrega: ${SHIPPING[o.shipping?.method] || ''}${addr}\nPagamento: ${PAYMENT[o.payment_method] || ''}\nNome: ${o.customer?.name}${o.notes ? `\nObs.: ${o.notes}` : ''}`;
}

function viewDone(code) {
  let o; try { o = JSON.parse(sessionStorage.getItem(`telae_order_${code}`)); } catch {}
  if (!o) {
    app.innerHTML = `<div class="wrap done"><h2>Pedido ${esc(code)}</h2><p class="muted">Para ver o andamento, use a página de acompanhamento.</p><a class="btn" href="#/acompanhar?codigo=${esc(code)}">Acompanhar pedido</a></div>`;
    return;
  }
  const wa = waLink(S.whatsapp, orderMessage(o));
  app.innerHTML = `
  <div class="wrap done">
    <div class="check">${icons.check}</div>
    <span class="eyebrow">Pedido recebido</span>
    <h1 style="font-size:clamp(2.2rem,6vw,3.2rem)">Obrigada, ${esc(o.customer.name.split(' ')[0])}!</h1>
    <p class="muted">Guarde o código do seu pedido:</p>
    <div class="code-pill">${esc(o.code)}</div>
    <p><b>Último passo:</b> envie o pedido pelo WhatsApp para a Raquel confirmar ${o.items.some((i) => i.made_to_order) ? 'o prazo de produção e ' : ''}o pagamento.</p>
    <a class="btn btn-wa btn-block" href="${wa}" target="_blank" rel="noopener" style="margin:6px 0 22px">Enviar pedido pelo WhatsApp</a>
    ${o.payment_method === 'pix' && S.pix_key ? `
    <div class="panel pix-box">
      <h3>Pagamento via Pix · ${money(o.total)}</h3>
      <div class="pix-key"><code id="pixKey">${esc(S.pix_key)}</code><button class="btn btn-sm" id="copyPix">Copiar</button></div>
      <p class="muted" style="font-size:.88rem;margin:10px 0 0">${S.pix_name ? `Favorecida: ${esc(S.pix_name)}. ` : ''}Depois de pagar, envie o comprovante no WhatsApp.</p>
    </div>` : ''}
    <div class="panel" style="text-align:left">
      ${o.items.map((i) => `<div class="sum-row"><span>${i.qty}× ${esc(i.name)}</span><span>${money(i.price * i.qty)}</span></div>`).join('')}
      ${Number(o.discount) ? `<div class="sum-row"><span>Desconto</span><span>− ${money(o.discount)}</span></div>` : ''}
      <div class="sum-row"><span>Frete</span><span>${o.shipping.method === 'combinar' ? 'A combinar' : Number(o.shipping_fee) ? money(o.shipping_fee) : 'Grátis'}</span></div>
      <div class="sum-row total"><span>Total</span><span>${money(o.total)}</span></div>
    </div>
    <a class="link" href="#/acompanhar?codigo=${esc(o.code)}">Acompanhar este pedido</a>
  </div>`;
  $('#copyPix')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(S.pix_key); toast('Chave Pix copiada'); } catch { toast('Copie a chave manualmente', 'err'); }
  });
}

function viewTrack(q) {
  app.innerHTML = `
  <div class="wrap page" style="max-width:520px">
    <span class="eyebrow">Meu pedido</span>
    <h1 style="font-size:clamp(2.2rem,5vw,3rem)">Acompanhar pedido</h1>
    <form id="trackForm" class="panel">
      <div class="field"><label for="tCode">Código do pedido</label><input class="input" id="tCode" placeholder="TL123ABC" autocapitalize="characters" required value="${esc(q.get('codigo') || '')}"></div>
      <div class="field"><label for="tPhone">WhatsApp usado no pedido</label><input class="input" id="tPhone" type="tel" inputmode="tel" required></div>
      <button class="btn btn-block">Consultar</button>
    </form>
    <div id="trackOut"></div>
  </div>`;
  $('#tPhone').addEventListener('input', (e) => { e.target.value = maskPhone(e.target.value); });
  $('#trackForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data, error } = await sb.rpc('track_order', { p_code: $('#tCode').value, p_phone: $('#tPhone').value });
    const out = $('#trackOut');
    if (error || !data) { out.innerHTML = `<p class="err">Pedido não encontrado. Confira o código e o telefone.</p>`; return; }
    const steps = ['aguardando_pagamento', 'pago', 'em_producao', 'enviado', 'entregue'];
    const cur = steps.indexOf(data.status);
    out.innerHTML = `
    <div class="panel">
      <div class="sum-row"><b>Pedido ${esc(data.code)}</b><span class="status">${esc(STATUS[data.status] || data.status)}</span></div>
      <p class="muted" style="font-size:.88rem">Feito em ${fmtDate(data.created_at)}</p>
      ${data.status === 'cancelado' ? '' : `<ol style="padding-left:20px;margin:0 0 14px">${steps.map((s, i) => `<li style="color:${i <= cur ? 'var(--ink)' : 'var(--muted)'};${i === cur ? 'font-weight:600' : ''}">${STATUS[s]}${i <= cur ? ' ✓' : ''}</li>`).join('')}</ol>`}
      ${data.tracking_code ? `<p>Código de rastreio: <b>${esc(data.tracking_code)}</b> · <a class="link" target="_blank" rel="noopener" href="https://rastreamento.correios.com.br/app/index.php">rastrear nos Correios</a></p>` : ''}
      ${data.items.map((i) => `<div class="sum-row"><span>${i.qty}× ${esc(i.name)}</span><span>${money(i.price * i.qty)}</span></div>`).join('')}
      <div class="sum-row total"><span>Total</span><span>${money(data.total)}</span></div>
    </div>`;
  });
  if (q.get('codigo')) $('#tPhone').focus();
}

function viewAbout() {
  const pics = products.slice(0, 2);
  app.innerHTML = `
  <div class="wrap page">
    <span class="eyebrow">Nossa história</span>
    <h1>Bolsas especiais, feitas para você</h1>
    ${pics[0] ? `<img src="${esc(img(pics[0].images?.[0]))}" alt="" style="border-radius:var(--radius);margin:24px 0;aspect-ratio:16/10;object-fit:cover;width:100%">` : ''}
    ${(S.about || '').split(/\n+/).map((p) => `<p>${esc(p)}</p>`).join('')}
    <p class="quote">“Não é só uma bolsa. É identidade, elegância e propósito em cada detalhe.”</p>
    <h2>Por que uma Telaé</h2>
    <ul>
      <li><b>Exclusividade real:</b> peças feitas à mão, em quantidade limitada.</li>
      <li><b>Qualidade e estrutura:</b> materiais selecionados e acabamento impecável.</li>
      <li><b>Cuidado em cada etapa:</b> impermeabilização para proteger a sua peça.</li>
    </ul>
    <div class="hero-cta"><a class="btn" href="#/loja">Ver a coleção</a><a class="btn btn-ghost" href="https://instagram.com/${esc((S.instagram || 'telaebolsas').replace('@', ''))}" target="_blank" rel="noopener">Seguir no Instagram</a></div>
  </div>`;
}

function viewCustom() {
  app.innerHTML = `
  <div class="wrap page">
    <span class="eyebrow">Sob medida</span>
    <h1>Encomendas personalizadas</h1>
    <p>Gostou de um modelo mas queria em outra cor? Quer uma bolsa para casamento, para presentear ou para combinar com um look especial? A Telaé faz.</p>
    <form class="panel" id="customForm" style="margin-top:24px">
      <div class="field"><label for="ccName">Seu nome</label><input class="input" id="ccName" autocomplete="name" required></div>
      <div class="field"><label for="ccModel">Modelo de referência</label>
        <select class="input" id="ccModel"><option value="">Ainda não sei / quero criar do zero</option>${products.map((p) => `<option>${esc(p.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="ccColor">Cores desejadas</label><input class="input" id="ccColor" placeholder="Ex.: verde sálvia com alça de pérolas"></div>
      <div class="field"><label for="ccWhen">Para quando precisa?</label><input class="input" id="ccWhen" placeholder="Ex.: casamento em março"></div>
      <div class="field"><label for="ccMore">Mais detalhes</label><textarea class="input" id="ccMore"></textarea></div>
      <button class="btn btn-wa btn-block">Enviar pedido de orçamento pelo WhatsApp</button>
    </form>
  </div>`;
  $('#customForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = `Olá! Quero uma bolsa Telaé personalizada 💛\n\nNome: ${$('#ccName').value}\nModelo: ${$('#ccModel').value || 'criar do zero'}\nCores: ${$('#ccColor').value}\nPrazo: ${$('#ccWhen').value}\n${$('#ccMore').value}`;
    window.open(waLink(S.whatsapp, msg), '_blank', 'noopener');
  });
}

function viewPolicies() {
  app.innerHTML = `
  <div class="wrap page">
    <span class="eyebrow">Ajuda</span>
    <h1>Prazos, trocas e cuidados</h1>
    <h2>Produção e prazos</h2>
    <p>${esc(S.production_note || 'Cada peça é tecida à mão. O prazo de produção é informado na página de cada bolsa e confirmado pelo WhatsApp.')}</p>
    <h2>Pagamento</h2>
    <p>Aceitamos Pix e cartão de crédito (por link de pagamento enviado pelo WhatsApp). A produção começa após a confirmação do pagamento.</p>
    <h2>Entrega</h2>
    <p>Enviamos para todo o Brasil pelos Correios, com código de rastreio informado na página <a class="link" href="#/acompanhar">Meu pedido</a>. Também é possível retirar em ${esc(S.city || 'Bom Despacho - MG')}.</p>
    <h2>Trocas e devoluções</h2>
    <p>Compras pelo site podem ser canceladas em até 7 dias após o recebimento, conforme o Código de Defesa do Consumidor. Peças personalizadas (cor ou modelo sob medida) são combinadas individualmente antes da produção. Em caso de defeito de fabricação, fale com a gente pelo WhatsApp.</p>
    <h2>Cuidados com a sua bolsa</h2>
    <ul><li>Limpe com pano úmido e sabão neutro, sem esfregar.</li><li>Seque à sombra, nunca no sol forte ou secador.</li><li>Guarde com enchimento de papel para manter o formato.</li><li>Evite contato com perfumes e produtos químicos.</li></ul>
  </div>`;
}

/* ---------------- Roteador ---------------- */
async function route() {
  await dataReady;
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  const q = new URLSearchParams(qs || '');
  const parts = path.split('/').filter(Boolean);
  removeMobileBar();
  closeNav();
  document.title = 'Telaé — Bolsas artesanais em tela';
  $$('.nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${raw}` || (parts[0] && a.getAttribute('href') === `#/${parts[0]}`)));
  switch (parts[0]) {
    case undefined: viewHome(); break;
    case 'loja': viewShop(q); break;
    case 'produto': viewProduct(decodeURIComponent(parts[1] || '')); break;
    case 'checkout': viewCheckout(); break;
    case 'pedido': viewDone(parts[1]); break;
    case 'acompanhar': viewTrack(q); break;
    case 'sobre': viewAbout(); break;
    case 'encomendas': viewCustom(); break;
    case 'politicas': viewPolicies(); break;
    default: viewHome();
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/* ---------------- Menu mobile ---------------- */
function openNav() {
  $('#nav').classList.add('open');
  let bd = $('.nav-backdrop');
  if (!bd) { bd = document.createElement('div'); bd.className = 'nav-backdrop'; bd.onclick = closeNav; document.body.appendChild(bd); }
  document.body.style.overflow = 'hidden';
}
function closeNav() { $('#nav').classList.remove('open'); $('.nav-backdrop')?.remove(); if (!$('#cartDrawer').classList.contains('open')) document.body.style.overflow = ''; }

/* ---------------- Init ---------------- */
cart.load();
app.innerHTML = '<div class="loader">Carregando…</div>';
dataReady = loadData().then(renderCartBadge).catch((e) => { console.error(e); app.innerHTML = '<div class="wrap empty">Não foi possível carregar a loja. Tente novamente em instantes.</div>'; });
window.addEventListener('hashchange', route);
route();

$('#cartBtn').onclick = openCart;
$('#closeCart').onclick = closeCart;
$('#drawerBackdrop').onclick = closeCart;
$('#menuBtn').onclick = openNav;
$('#searchBtn').onclick = () => { const f = $('#searchbar'); f.hidden = !f.hidden; if (!f.hidden) $('#searchInput').focus(); };
$('#searchbar').addEventListener('submit', (e) => { e.preventDefault(); const t = $('#searchInput').value.trim(); $('#searchbar').hidden = true; location.hash = `#/loja${t ? `?q=${encodeURIComponent(t)}` : ''}`; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeCart(); closeNav(); } });
