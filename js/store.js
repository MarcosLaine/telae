import { sb, money, esc, img, waLink, getSettings } from './common.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $('#app');

const DEFAULT_WA = '5537991985435';
let S = {};
let products = [];
let categories = [];
let dataReady;

const wa = (text) => waLink(S.whatsapp || DEFAULT_WA, text);
const productUrl = (p) => `${location.origin}${location.pathname}#/produto/${p.slug}`;
const interestMsg = (p, color = '') => `Olá! Gostei da ${p.name}${color && (p.colors || []).length > 1 ? ` na cor ${color}` : ''} 💛\n${productUrl(p)}`;

const WA_ICON = '<svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3Zm0 23.7c-2 0-4-.6-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.7 10.7 0 1 1 16 26.7Zm5.9-8c-.3-.2-1.9-1-2.2-1-.3-.1-.5-.2-.7.1l-1 1.2c-.2.2-.4.3-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.6 5.8 5 2.1.9 3 1 4 .8.7-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4Z"/></svg>';

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
  const link = wa('Olá! Vim pelo site da Telaé 💛');
  $('#waFloat').href = link; $('#footWa').href = link;
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
      ${soldOut ? '<span class="badge">Sob encomenda</span>' : sale ? '<span class="badge sale">Oferta</span>' : ''}
    </a>
    <a href="#/produto/${esc(p.slug)}" class="card-name">${esc(p.name)}</a>
    <div class="card-meta">
      <span class="price">${sale ? `<span class="price-old">${money(p.compare_at_price)}</span>` : ''}${money(p.price)}</span>
      <span class="card-color">${esc(p.colors?.[0] || '')}</span>
    </div>
    <a class="card-wa" href="${wa(interestMsg(p))}" target="_blank" rel="noopener">${WA_ICON} Quero esta</a>
  </article>`;
}

const icons = {
  hand: '<svg viewBox="0 0 24 24"><path d="M7 11V5.5a1.5 1.5 0 0 1 3 0V10m0-5.5v-1a1.5 1.5 0 0 1 3 0V10m0-4.5a1.5 1.5 0 0 1 3 0V12m0-3.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.4L4 15.5a1.5 1.5 0 0 1 2.6-1.5L7 15"/></svg>',
  drop: '<svg viewBox="0 0 24 24"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/></svg>',
  truck: '<svg viewBox="0 0 24 24"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
  gem: '<svg viewBox="0 0 24 24"><path d="M6 4h12l3 5-9 11L3 9z"/><path d="M3 9h18M9 4l3 16 3-16"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4z"/></svg>',
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
          <a class="btn btn-ghost" href="${wa('Olá! Vim pelo site e queria conhecer as bolsas da Telaé 💛')}" target="_blank" rel="noopener">Falar no WhatsApp</a>
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
    <div class="wrap how">
      <div class="how-step"><span>1</span><b>Escolha a bolsa</b><p>Navegue pela coleção e veja os detalhes de cada peça.</p></div>
      <div class="how-step"><span>2</span><b>Chame no WhatsApp</b><p>Toque em “Quero esta” e a mensagem já vai pronta para a Raquel.</p></div>
      <div class="how-step"><span>3</span><b>Combine tudo direto</b><p>Cor, prazo, pagamento e entrega, do jeito que for melhor para você.</p></div>
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
        <p>Toda bolsa pode ser feita na sua cor favorita. Chame no WhatsApp e crie a sua peça exclusiva.</p>
        <div class="hero-cta">
          <a class="btn" href="${wa('Olá! Quero encomendar uma bolsa Telaé personalizada 💛')}" target="_blank" rel="noopener">Encomendar pelo WhatsApp</a>
        </div>
      </div>
      <div class="ig-strip">${products.slice(3, 9).map((p) => `<a href="#/produto/${esc(p.slug)}"><img src="${esc(img(p.images?.[0]))}" alt="${esc(p.name)}" loading="lazy"></a>`).join('')}</div>
    </div>
  </section>`;
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
}

function viewProduct(slug) {
  const p = products.find((x) => x.slug === slug);
  if (!p) { app.innerHTML = `<div class="wrap empty"><h2>Bolsa não encontrada</h2><a class="btn" href="#/loja">Voltar à loja</a></div>`; return; }
  document.title = `${p.name} — Telaé`;
  const imgs = p.images?.length ? p.images : [''];
  const sale = p.compare_at_price && Number(p.compare_at_price) > Number(p.price);
  const related = products.filter((x) => x.id !== p.id && x.category_id === p.category_id).concat(products.filter((x) => x.id !== p.id && x.category_id !== p.category_id)).slice(0, 4);
  let color = p.colors?.[0] || '';

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
        <div class="pdp-installments">Pagamento e entrega combinados direto com a Raquel</div>
        <p class="pdp-desc">${esc(p.description)}</p>
        ${p.colors?.length > 1 ? `<div class="opt-label">Cor</div><div class="chips" id="colorChips">${p.colors.map((c, i) => `<button class="chip ${i ? '' : 'active'}" data-color="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : p.colors?.[0] ? `<div class="opt-label">Cor: <b style="color:var(--ink)">${esc(p.colors[0])}</b></div>` : ''}
        <div class="buy-row">
          <a class="btn btn-wa" id="waBtn" target="_blank" rel="noopener" href="${wa(interestMsg(p, color))}">${WA_ICON} Quero esta bolsa</a>
          <a class="btn btn-ghost" target="_blank" rel="noopener" href="${wa(`Olá! Gostei da ${p.name} e queria em outra cor 🎨\n${productUrl(p)}`)}">Quero em outra cor</a>
        </div>
        <div class="note">${icons.chat}<div>Ao tocar no botão, o WhatsApp abre com a mensagem pronta. É só enviar e a Raquel responde com disponibilidade, prazo e formas de pagamento.</div></div>
        <div class="note" style="margin-top:0">${icons.clock}<div>${p.made_to_order ? `<b>Feita sob encomenda.</b> Produção em até ${p.production_days || 15} dias úteis + envio.` : `<b>Pronta entrega.</b>`}</div></div>
        <details class="acc" open><summary>Detalhes da peça</summary><p>${esc(p.details || 'Bolsa tecida à mão em tela, com fio de alta resistência, acabamento impermeabilizado e ferragens douradas. Cada peça é única: pequenas variações fazem parte do trabalho artesanal.')}</p></details>
        <details class="acc"><summary>Cuidados</summary><p>Limpe com pano úmido e sabão neutro, sem esfregar. Seque à sombra. Guarde com enchimento de papel para manter o formato e longe de umidade.</p></details>
        <details class="acc"><summary>Entrega</summary><p>Enviamos para todo o Brasil ou você retira em ${esc(S.city || 'Bom Despacho - MG')}. Frete, prazo e pagamento são combinados pelo WhatsApp.</p></details>
      </div>
    </div>
    ${related.length ? `<section class="section" style="padding-top:24px"><div class="section-head"><h2>Você também vai amar</h2></div><div class="grid">${related.map(card).join('')}</div></section>` : ''}
  </div>`;

  $$('.thumbs button').forEach((b) => b.addEventListener('click', () => {
    $('#mainImg').src = img(imgs[b.dataset.i]);
    $$('.thumbs button').forEach((x) => x.classList.toggle('active', x === b));
  }));

  const bar = mobileBar(`<div class="mb-price"><small>${esc(p.name)}</small><b>${money(p.price)}</b></div><a class="btn btn-wa" target="_blank" rel="noopener" href="${wa(interestMsg(p, color))}">${WA_ICON} Quero esta</a>`);
  $$('#colorChips .chip').forEach((b) => b.addEventListener('click', () => {
    color = b.dataset.color;
    $$('#colorChips .chip').forEach((x) => x.classList.toggle('active', x === b));
    const href = wa(interestMsg(p, color));
    $('#waBtn').href = href; $('a', bar).href = href;
  }));
}

function viewAbout() {
  const pic = products[0];
  app.innerHTML = `
  <div class="wrap page">
    <span class="eyebrow">Nossa história</span>
    <h1>Bolsas especiais, feitas para você</h1>
    ${pic ? `<img src="${esc(img(pic.images?.[0]))}" alt="" style="border-radius:var(--radius);margin:24px 0;aspect-ratio:16/10;object-fit:cover;width:100%">` : ''}
    ${(S.about || '').split(/\n+/).map((t) => `<p>${esc(t)}</p>`).join('')}
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
      <button class="btn btn-wa btn-block">${WA_ICON} Enviar pelo WhatsApp</button>
    </form>
  </div>`;
  $('#customForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const lines = [
      'Olá! Quero uma bolsa Telaé personalizada 💛', '',
      `Nome: ${$('#ccName').value}`,
      `Modelo: ${$('#ccModel').value || 'criar do zero'}`,
      $('#ccColor').value && `Cores: ${$('#ccColor').value}`,
      $('#ccWhen').value && `Para quando: ${$('#ccWhen').value}`,
      $('#ccMore').value,
    ].filter((l) => l !== false && l !== undefined);
    window.open(wa(lines.join('\n')), '_blank', 'noopener');
  });
}

function viewPolicies() {
  app.innerHTML = `
  <div class="wrap page">
    <span class="eyebrow">Ajuda</span>
    <h1>Como comprar e cuidados</h1>
    <h2>Como comprar</h2>
    <p>Escolha a bolsa e toque em <b>“Quero esta”</b>. O WhatsApp abre com a mensagem pronta para a Raquel, que responde com disponibilidade, prazo, frete e formas de pagamento.</p>
    <h2>Produção e prazos</h2>
    <p>${esc(S.production_note || 'Cada peça é tecida à mão. O prazo de produção é confirmado pelo WhatsApp.')}</p>
    <h2>Entrega</h2>
    <p>Enviamos para todo o Brasil ou você retira em ${esc(S.city || 'Bom Despacho - MG')}.</p>
    <h2>Cuidados com a sua bolsa</h2>
    <ul><li>Limpe com pano úmido e sabão neutro, sem esfregar.</li><li>Seque à sombra, nunca no sol forte ou secador.</li><li>Guarde com enchimento de papel para manter o formato.</li><li>Evite contato com perfumes e produtos químicos.</li></ul>
    <div class="hero-cta"><a class="btn btn-wa" href="${wa('Olá! Vim pelo site da Telaé e tenho uma dúvida 💛')}" target="_blank" rel="noopener">${WA_ICON} Falar no WhatsApp</a></div>
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
    case 'loja': viewShop(q); break;
    case 'produto': viewProduct(decodeURIComponent(parts[1] || '')); break;
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
function closeNav() { $('#nav').classList.remove('open'); $('.nav-backdrop')?.remove(); document.body.style.overflow = ''; }

/* ---------------- Init ---------------- */
app.innerHTML = '<div class="loader">Carregando…</div>';
dataReady = loadData().catch((e) => { console.error(e); app.innerHTML = '<div class="wrap empty">Não foi possível carregar a loja. Tente novamente em instantes.</div>'; });
window.addEventListener('hashchange', route);
route();

$('#menuBtn').onclick = openNav;
$('#searchBtn').onclick = () => { const f = $('#searchbar'); f.hidden = !f.hidden; if (!f.hidden) $('#searchInput').focus(); };
$('#searchbar').addEventListener('submit', (e) => { e.preventDefault(); const t = $('#searchInput').value.trim(); $('#searchbar').hidden = true; location.hash = `#/loja${t ? `?q=${encodeURIComponent(t)}` : ''}`; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });
