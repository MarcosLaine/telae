import { sb, money, esc, img, slugify, waLink, toast, STATUS, SHIPPING, PAYMENT, fmtDate, onlyDigits } from './common.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const root = $('#root');
const SITE = location.href.replace(/admin\.html.*$/, '').replace(/#.*$/, '');

let session = null;
let tab = (location.hash.replace('#', '') || 'painel');
let categories = [];
let settings = {};
let pendingCount = 0;

const I = {
  home: '<path d="M3 11 12 4l9 7v9H3z"/><path d="M9 20v-6h6v6"/>',
  bag: '<path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  tag: '<path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  folder: '<path d="M3 6h6l2 2h10v11H3z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
};
const ico = (n) => `<svg viewBox="0 0 24 24">${I[n]}</svg>`;

const TABS = [
  { id: 'painel', label: 'Painel', icon: 'home', mobile: true },
  { id: 'pedidos', label: 'Pedidos', icon: 'bag', mobile: true },
  { id: 'produtos', label: 'Produtos', icon: 'box', mobile: true },
  { id: 'categorias', label: 'Categorias', icon: 'folder' },
  { id: 'cupons', label: 'Cupons', icon: 'tag' },
  { id: 'config', label: 'Loja', icon: 'gear', mobile: true },
  { id: 'admins', label: 'Admins', icon: 'user' },
  { id: 'mais', label: 'Mais', icon: 'more', mobileOnly: true },
];

/* ---------------- Utilidades de UI ---------------- */
function modal(title, body, foot = '') {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h3>${title}</h3><button class="icon-btn" data-close aria-label="Fechar">${ico('x')}</button></div><div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
  document.body.appendChild(bg);
  document.body.style.overflow = 'hidden';
  const close = () => { bg.remove(); document.body.style.overflow = ''; };
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
  return { el: bg, close };
}

function confirmBox(msg, okLabel = 'Confirmar') {
  return new Promise((res) => {
    const m = modal('Confirmar', `<p>${msg}</p>`, `<button class="btn btn-ghost" data-close>Voltar</button><button class="btn danger" id="cfOk">${okLabel}</button>`);
    $('#cfOk', m.el).onclick = () => { m.close(); res(true); };
    m.el.addEventListener('click', (e) => { if (e.target === m.el || e.target.closest('[data-close]')) res(false); });
  });
}

const fullPhone = (p) => { const d = onlyDigits(p); return d.length <= 11 ? `55${d}` : d; };
const num = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')));

async function resizeImage(file, max = 1600) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
}

/* ---------------- Autenticação ---------------- */
function viewLogin(mode = 'login', msg = '') {
  const titles = { login: 'Entrar no painel', signup: 'Criar conta de acesso', forgot: 'Recuperar senha', reset: 'Definir nova senha' };
  root.innerHTML = `
  <div class="login">
    <form class="panel" id="authForm">
      <div class="logo-name" style="font-size:2.4rem;text-align:center">Telaé</div>
      <p class="muted" style="text-align:center;margin-bottom:20px">${titles[mode]}</p>
      ${msg ? `<div class="note" style="margin-top:0">${msg}</div>` : ''}
      ${mode !== 'reset' ? `<div class="field"><label for="aEmail">E-mail</label><input class="input" id="aEmail" type="email" autocomplete="username" required></div>` : ''}
      ${mode !== 'forgot' ? `<div class="field"><label for="aPass">${mode === 'login' ? 'Senha' : 'Nova senha (mín. 8 caracteres)'}</label><input class="input" id="aPass" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" minlength="${mode === 'login' ? 1 : 8}" required></div>` : ''}
      <button class="btn btn-block" id="aBtn">${{ login: 'Entrar', signup: 'Criar conta', forgot: 'Enviar link', reset: 'Salvar nova senha' }[mode]}</button>
      <div style="display:flex;justify-content:space-between;margin-top:16px;font-size:.88rem;flex-wrap:wrap;gap:8px">
        ${mode === 'login' ? '<button type="button" class="link" data-mode="forgot">Esqueci a senha</button><button type="button" class="link" data-mode="signup">Primeiro acesso? Criar conta</button>' : mode !== 'reset' ? '<button type="button" class="link" data-mode="login">Voltar para o login</button>' : ''}
      </div>
      <p style="text-align:center;margin:18px 0 0"><a class="link" href="${SITE}">← Ver a loja</a></p>
    </form>
  </div>`;
  $$('[data-mode]').forEach((b) => b.onclick = () => viewLogin(b.dataset.mode));
  $('#authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#aBtn'); btn.disabled = true;
    const email = $('#aEmail')?.value.trim(); const pass = $('#aPass')?.value;
    const redirectTo = SITE + 'admin.html';
    let r;
    if (mode === 'login') r = await sb.auth.signInWithPassword({ email, password: pass });
    if (mode === 'signup') r = await sb.auth.signUp({ email, password: pass, options: { emailRedirectTo: redirectTo } });
    if (mode === 'forgot') r = await sb.auth.resetPasswordForEmail(email, { redirectTo });
    if (mode === 'reset') r = await sb.auth.updateUser({ password: pass });
    btn.disabled = false;
    if (r.error) return toast(translateAuth(r.error.message), 'err');
    if (mode === 'signup') return viewLogin('login', r.data.session ? 'Conta criada.' : 'Conta criada! Confirme pelo link enviado ao seu e-mail e depois entre aqui.');
    if (mode === 'forgot') return viewLogin('login', 'Se o e-mail existir, você receberá um link para criar uma nova senha.');
    if (mode === 'reset') { toast('Senha atualizada'); history.replaceState(null, '', 'admin.html'); }
    boot();
  });
}

function translateAuth(m) {
  if (/Invalid login/i.test(m)) return 'E-mail ou senha incorretos.';
  if (/Email not confirmed/i.test(m)) return 'Confirme seu e-mail pelo link enviado antes de entrar.';
  if (/already registered/i.test(m)) return 'Este e-mail já tem conta. Use "Entrar" ou "Esqueci a senha".';
  if (/Password should be/i.test(m)) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (/rate limit/i.test(m)) return 'Muitas tentativas. Aguarde alguns minutos.';
  return m;
}

function viewNotAdmin() {
  root.innerHTML = `
  <div class="login"><div class="panel">
    <div class="logo-name" style="font-size:2.2rem;text-align:center">Telaé</div>
    <h3 style="margin-top:12px">Acesso ainda não liberado</h3>
    <p>A conta <b>${esc(session.user.email)}</b> foi criada, mas ainda não é administradora da loja.</p>
    <p class="muted" style="font-size:.92rem">Para liberar: no Supabase, abra <b>Table Editor → admins</b>, clique em <b>Insert row</b> e cadastre este e-mail. Depois, recarregue esta página. Um admin já liberado também pode adicionar outros pela aba <b>Admins</b> do painel.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" onclick="location.reload()">Já liberei, recarregar</button><button class="btn btn-ghost" id="out">Sair</button></div>
  </div></div>`;
  $('#out').onclick = async () => { await sb.auth.signOut(); boot(); };
}

/* ---------------- Shell ---------------- */
function shell() {
  root.innerHTML = `
  <div class="adm">
    <aside class="side">
      <div class="logo-name">Telaé</div><small>Painel da loja</small>
      <nav class="tabs">${TABS.map((t) => `<button class="tab ${t.mobile ? '' : 'desk-tab'} ${t.mobileOnly ? 'mob-tab' : ''}" data-tab="${t.id}">${ico(t.icon)}<span>${t.label}</span>${t.id === 'pedidos' ? '<span class="pill" id="pendPill" hidden></span>' : ''}</button>`).join('')}</nav>
      <div class="side-foot">${esc(session.user.email)}<br><a href="${SITE}" target="_blank" rel="noopener">Ver loja ↗</a> · <button class="link" id="logout">Sair</button></div>
    </aside>
    <main class="main" id="main"></main>
  </div>`;
  const style = document.createElement('style');
  style.textContent = '@media (max-width:860px){.desk-tab{display:none!important}} @media (min-width:861px){.mob-tab{display:none!important}}';
  root.appendChild(style);
  $$('.tab').forEach((b) => b.onclick = () => go(b.dataset.tab));
  $('#logout').onclick = async () => { await sb.auth.signOut(); boot(); };
}

function go(t) {
  tab = t; history.replaceState(null, '', `#${t}`);
  $$('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === t || (t !== 'mais' && b.dataset.tab === 'mais' && ['categorias', 'cupons', 'admins'].includes(t) && matchMedia('(max-width:860px)').matches)));
  const views = { painel: vDash, pedidos: vOrders, produtos: vProducts, categorias: vCats, cupons: vCoupons, config: vSettings, admins: vAdmins, mais: vMore };
  (views[t] || vDash)();
  window.scrollTo(0, 0);
}

async function refreshPending() {
  const { count } = await sb.from('orders').select('id', { count: 'exact', head: true }).in('status', ['novo', 'aguardando_pagamento']);
  pendingCount = count || 0;
  const p = $('#pendPill'); if (p) { p.textContent = pendingCount; p.hidden = !pendingCount; }
}

/* ---------------- Painel ---------------- */
async function vDash() {
  const m = $('#main');
  m.innerHTML = `<div class="top"><h1>Olá! 👋</h1><a class="btn btn-sm btn-ghost" href="${SITE}" target="_blank" rel="noopener">Ver loja</a></div><div class="loader">Carregando…</div>`;
  const since = new Date(); since.setDate(1); since.setHours(0, 0, 0, 0);
  const [o, p] = await Promise.all([
    sb.from('orders').select('*').order('created_at', { ascending: false }).limit(300),
    sb.from('products').select('id,active', { count: 'exact' }),
  ]);
  const orders = o.data || [];
  const today = new Date().toDateString();
  const paid = ['pago', 'em_producao', 'enviado', 'entregue'];
  const month = orders.filter((x) => new Date(x.created_at) >= since);
  const revenue = month.filter((x) => paid.includes(x.status)).reduce((a, x) => a + Number(x.total), 0);
  const waiting = orders.filter((x) => ['novo', 'aguardando_pagamento'].includes(x.status)).length;
  const prod = orders.filter((x) => x.status === 'em_producao').length;
  m.innerHTML = `
  <div class="top"><h1>Olá! 👋</h1><a class="btn btn-sm btn-ghost" href="${SITE}" target="_blank" rel="noopener">Ver loja</a></div>
  <div class="stats">
    <div class="stat"><span>Vendas pagas no mês</span><b>${money(revenue)}</b></div>
    <div class="stat"><span>Aguardando pagamento</span><b>${waiting}</b></div>
    <div class="stat"><span>Em produção</span><b>${prod}</b></div>
    <div class="stat"><span>Pedidos hoje</span><b>${orders.filter((x) => new Date(x.created_at).toDateString() === today).length}</b></div>
  </div>
  <div class="box">
    <div class="top" style="margin-bottom:8px"><h3 style="margin:0">Últimos pedidos</h3><button class="btn btn-sm btn-ghost" id="allOrders">Ver todos</button></div>
    ${ordersList(orders.slice(0, 8))}
  </div>
  <div class="box"><h3>Atalhos</h3><div style="display:flex;gap:10px;flex-wrap:wrap">
    <button class="btn btn-sm" id="newProd">+ Novo produto</button>
    <button class="btn btn-sm btn-ghost" data-go="cupons">Criar cupom</button>
    <button class="btn btn-sm btn-ghost" data-go="config">Chave Pix e frete</button>
  </div>${!settings.pix_key ? '<p class="note" style="margin-bottom:0">⚠️ Cadastre a chave Pix em <b>Loja</b> para ela aparecer automaticamente para as clientes depois do pedido.</p>' : ''}<p class="muted" style="font-size:.85rem;margin:12px 0 0">${p.count || 0} produtos cadastrados.</p></div>`;
  $('#allOrders').onclick = () => go('pedidos');
  $('#newProd').onclick = () => editProduct(null);
  $$('[data-go]').forEach((b) => b.onclick = () => go(b.dataset.go));
  bindOrderClicks(orders);
}

function ordersList(list) {
  if (!list.length) return '<p class="muted">Nenhum pedido ainda.</p>';
  return `
  <table class="t desk-table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th>Total</th><th>Status</th></tr></thead><tbody>
  ${list.map((o) => `<tr class="click" data-order="${o.id}"><td><b>${esc(o.code)}</b></td><td>${esc(o.customer?.name)}<br><small class="muted">${esc(o.customer?.phone)}</small></td><td>${fmtDate(o.created_at)}</td><td>${money(o.total)}</td><td><span class="st st-${o.status}">${STATUS[o.status]}</span></td></tr>`).join('')}
  </tbody></table>
  <div class="list-cards">${list.map((o) => `<div class="lc" data-order="${o.id}" style="grid-template-columns:1fr auto"><div><b>${esc(o.code)} · ${esc(o.customer?.name)}</b><small>${fmtDate(o.created_at)} · ${o.items.length} ${o.items.length === 1 ? 'item' : 'itens'}</small></div><div style="text-align:right"><b>${money(o.total)}</b><span class="st st-${o.status}">${STATUS[o.status]}</span></div></div>`).join('')}</div>`;
}
function bindOrderClicks(orders) {
  $$('[data-order]').forEach((r) => r.onclick = () => openOrder(orders.find((o) => o.id === r.dataset.order)));
}

/* ---------------- Pedidos ---------------- */
async function vOrders() {
  const m = $('#main');
  m.innerHTML = `
  <div class="top"><h1>Pedidos</h1></div>
  <div class="toolbar">
    <input class="input" id="oq" placeholder="Buscar por código, nome ou telefone" type="search">
    <select class="input" id="ost" style="flex:0 1 220px"><option value="">Todos os status</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
  </div>
  <div class="box" id="olist"><div class="loader">Carregando…</div></div>`;
  const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false }).limit(1000);
  if (error) return toast(error.message, 'err');
  const orders = data || [];
  const render = () => {
    const q = $('#oq').value.trim().toLowerCase(); const st = $('#ost').value;
    const qd = onlyDigits(q);
    const list = orders.filter((o) => (!st || o.status === st) && (!q || o.code.toLowerCase().includes(q) || (o.customer?.name || '').toLowerCase().includes(q) || (qd && onlyDigits(o.customer?.phone).includes(qd))));
    $('#olist').innerHTML = ordersList(list);
    bindOrderClicks(orders);
  };
  $('#oq').oninput = render; $('#ost').onchange = render;
  render();
}

function openOrder(o) {
  const a = o.shipping?.address || {};
  const body = `
  <dl class="kv">
    <dt>Status</dt><dd><span class="st st-${o.status}">${STATUS[o.status]}</span></dd>
    <dt>Data</dt><dd>${fmtDate(o.created_at)}</dd>
    <dt>Cliente</dt><dd>${esc(o.customer?.name)}</dd>
    <dt>WhatsApp</dt><dd><a class="link" href="${waLink(fullPhone(o.customer?.phone), `Olá, ${(o.customer?.name || '').split(' ')[0]}! Aqui é da Telaé, sobre o seu pedido ${o.code} 💛`)}" target="_blank" rel="noopener">${esc(o.customer?.phone)}</a></dd>
    ${o.customer?.email ? `<dt>E-mail</dt><dd>${esc(o.customer.email)}</dd>` : ''}
    <dt>Entrega</dt><dd>${SHIPPING[o.shipping?.method] || ''}${o.shipping?.method === 'envio' ? `<br>${esc(a.street)}, ${esc(a.number)}${a.complement ? ` - ${esc(a.complement)}` : ''}<br>${esc(a.district)} · ${esc(a.city)}/${esc(a.uf)} · CEP ${esc(a.cep)}` : ''}</dd>
    <dt>Pagamento</dt><dd>${PAYMENT[o.payment_method] || o.payment_method}</dd>
    ${o.notes ? `<dt>Obs. da cliente</dt><dd>${esc(o.notes)}</dd>` : ''}
  </dl>
  <div class="box" style="margin:16px 0">
    ${o.items.map((i) => `<div class="line-item" style="grid-template-columns:52px 1fr auto;padding:8px 0"><img src="${esc(img(i.image))}" alt="" style="width:52px"><div><div class="name" style="font-size:1rem">${esc(i.name)}</div><div class="sub">${i.qty} × ${money(i.price)}${i.color ? ` · ${esc(i.color)}` : ''}${i.made_to_order ? ' · encomenda' : ''}</div></div><div>${money(i.qty * i.price)}</div></div>`).join('')}
    <div class="sum-row" style="margin-top:10px"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
    ${Number(o.discount) ? `<div class="sum-row"><span>Desconto ${o.coupon ? `(${esc(o.coupon)})` : ''}</span><span>− ${money(o.discount)}</span></div>` : ''}
    <div class="sum-row"><span>Frete</span><span>${money(o.shipping_fee)}</span></div>
    <div class="sum-row total"><span>Total</span><span>${money(o.total)}</span></div>
  </div>
  <div class="grid-2">
    <div class="field"><label>Alterar status</label><select class="input" id="mSt">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === o.status ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    <div class="field"><label>Código de rastreio</label><input class="input" id="mTr" value="${esc(o.tracking_code)}"></div>
  </div>
  <div class="field"><label>Anotações internas</label><textarea class="input" id="mNt">${esc(o.admin_notes)}</textarea></div>`;
  const mm = modal(`Pedido ${esc(o.code)}`, body, `<button class="btn btn-ghost" id="mWa">Avisar cliente</button><button class="btn" id="mSave">Salvar</button>`);
  $('#mSave', mm.el).onclick = async () => {
    const upd = { status: $('#mSt', mm.el).value, tracking_code: $('#mTr', mm.el).value.trim(), admin_notes: $('#mNt', mm.el).value, updated_at: new Date().toISOString() };
    const { error } = await sb.from('orders').update(upd).eq('id', o.id);
    if (error) return toast(error.message, 'err');
    Object.assign(o, upd); toast('Pedido atualizado'); mm.close(); refreshPending(); go(tab);
  };
  $('#mWa', mm.el).onclick = () => {
    const st = $('#mSt', mm.el).value; const tr = $('#mTr', mm.el).value.trim();
    const msgs = {
      pago: 'recebemos o seu pagamento! ✨ Sua bolsa já entrou na fila de produção.',
      em_producao: 'sua bolsa está sendo tecida à mão neste momento 🧵',
      enviado: `sua bolsa foi enviada! 📦${tr ? ` Código de rastreio: ${tr}` : ''}`,
      entregue: 'esperamos que você ame a sua Telaé! 💛 Se puder, marque @telaebolsas quando usar.',
      aguardando_pagamento: `estamos aguardando o pagamento de ${money(o.total)}${settings.pix_key ? ` (Pix: ${settings.pix_key})` : ''}.`,
      cancelado: 'seu pedido foi cancelado. Qualquer dúvida, estamos por aqui.',
      novo: 'recebemos o seu pedido!',
    };
    window.open(waLink(fullPhone(o.customer?.phone),`Olá, ${(o.customer?.name || '').split(' ')[0]}! Pedido ${o.code}: ${msgs[st]}`), '_blank', 'noopener');
  };
}

/* ---------------- Produtos ---------------- */
async function loadCats() {
  const { data } = await sb.from('categories').select('*').order('sort');
  categories = data || [];
}

async function vProducts() {
  const m = $('#main');
  m.innerHTML = `
  <div class="top"><h1>Produtos</h1><button class="btn btn-sm" id="np">+ Novo produto</button></div>
  <div class="toolbar"><input class="input" id="pq" type="search" placeholder="Buscar produto"><select class="input" id="pc" style="flex:0 1 220px"><option value="">Todas as categorias</option>${categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
  <div class="box" id="plist"><div class="loader">Carregando…</div></div>`;
  $('#np').onclick = () => editProduct(null);
  const { data, error } = await sb.from('products').select('*').order('sort').order('created_at', { ascending: false });
  if (error) return toast(error.message, 'err');
  const prods = data || [];
  const cat = (id) => categories.find((c) => c.id === id)?.name || '—';
  const render = () => {
    const q = $('#pq').value.trim().toLowerCase(); const c = $('#pc').value;
    const list = prods.filter((p) => (!c || p.category_id === c) && (!q || p.name.toLowerCase().includes(q)));
    $('#plist').innerHTML = !list.length ? '<p class="muted">Nenhum produto.</p>' : `
    <table class="t desk-table"><thead><tr><th></th><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Ativo</th></tr></thead><tbody>
    ${list.map((p) => `<tr class="click ${p.active ? '' : 'off'}" data-p="${p.id}"><td><img class="thumb" src="${esc(img(p.images?.[0]))}" alt=""></td><td><b>${esc(p.name)}</b>${p.featured ? ' <span class="st">destaque</span>' : ''}</td><td>${esc(cat(p.category_id))}</td><td>${money(p.price)}</td><td>${p.made_to_order ? 'Sob encomenda' : p.stock}</td><td><label class="switch" data-stop><input type="checkbox" data-act="${p.id}" ${p.active ? 'checked' : ''}></label></td></tr>`).join('')}
    </tbody></table>
    <div class="list-cards">${list.map((p) => `<div class="lc ${p.active ? '' : 'off'}" data-p="${p.id}"><img class="thumb" src="${esc(img(p.images?.[0]))}" alt=""><div><b>${esc(p.name)}</b><small>${money(p.price)} · ${p.made_to_order ? 'encomenda' : `${p.stock} em estoque`}</small></div><label class="switch" data-stop><input type="checkbox" data-act="${p.id}" ${p.active ? 'checked' : ''}></label></div>`).join('')}</div>`;
    $$('[data-p]').forEach((r) => r.onclick = (e) => { if (e.target.closest('[data-stop]')) return; editProduct(prods.find((p) => p.id === r.dataset.p)); });
    $$('[data-act]').forEach((cb) => cb.onchange = async () => {
      const { error: er } = await sb.from('products').update({ active: cb.checked }).eq('id', cb.dataset.act);
      if (er) { cb.checked = !cb.checked; return toast(er.message, 'err'); }
      prods.find((p) => p.id === cb.dataset.act).active = cb.checked;
      toast(cb.checked ? 'Produto visível na loja' : 'Produto oculto da loja'); render();
    });
  };
  $('#pq').oninput = render; $('#pc').onchange = render;
  render();
}

function editProduct(p) {
  const isNew = !p;
  p = p || { name: '', slug: '', description: '', details: '', price: '', compare_at_price: null, category_id: categories[0]?.id || null, images: [], colors: [], stock: 0, made_to_order: true, production_days: 15, featured: false, active: true, sort: 0 };
  let images = [...(p.images || [])];
  const body = `
  <div class="field"><label>Fotos <span class="muted">(a primeira é a capa)</span></label><div class="imgs" id="imgs"></div>
    <input type="file" id="fileIn" accept="image/*" multiple hidden>
    <div style="display:flex;gap:8px;margin-top:10px"><input class="input" id="urlIn" placeholder="ou cole o link de uma imagem"><button type="button" class="btn btn-sm btn-ghost" id="urlAdd">Adicionar</button></div>
  </div>
  <div class="field"><label for="fName">Nome</label><input class="input" id="fName" value="${esc(p.name)}"></div>
  <div class="grid-2">
    <div class="field"><label for="fPrice">Preço (R$)</label><input class="input" id="fPrice" inputmode="decimal" value="${p.price ?? ''}"></div>
    <div class="field"><label for="fCmp">Preço “de” (opcional, para oferta)</label><input class="input" id="fCmp" inputmode="decimal" value="${p.compare_at_price ?? ''}"></div>
  </div>
  <div class="grid-2">
    <div class="field"><label for="fCat">Categoria</label><select class="input" id="fCat"><option value="">Sem categoria</option>${categories.map((c) => `<option value="${c.id}" ${c.id === p.category_id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
    <div class="field"><label for="fColors">Cores <span class="muted">(separe por vírgula)</span></label><input class="input" id="fColors" value="${esc((p.colors || []).join(', '))}"></div>
  </div>
  <div class="field"><label for="fDesc">Descrição</label><textarea class="input" id="fDesc">${esc(p.description)}</textarea></div>
  <div class="field"><label for="fDet">Detalhes técnicos <span class="muted">(medidas, materiais — opcional)</span></label><textarea class="input" id="fDet" placeholder="Ex.: 25 x 18 x 8 cm · alça de 60 cm · forro interno">${esc(p.details)}</textarea></div>
  <div class="grid-3">
    <div class="field"><label class="switch"><input type="checkbox" id="fMto" ${p.made_to_order ? 'checked' : ''}> Sob encomenda</label></div>
    <div class="field" id="stockF"><label for="fStock">Estoque</label><input class="input" id="fStock" inputmode="numeric" value="${p.stock ?? 0}"></div>
    <div class="field" id="daysF"><label for="fDays">Prazo de produção (dias úteis)</label><input class="input" id="fDays" inputmode="numeric" value="${p.production_days ?? 15}"></div>
  </div>
  <div class="grid-3">
    <div class="field"><label class="switch"><input type="checkbox" id="fAct" ${p.active ? 'checked' : ''}> Visível na loja</label></div>
    <div class="field"><label class="switch"><input type="checkbox" id="fFeat" ${p.featured ? 'checked' : ''}> Destaque na home</label></div>
    <div class="field"><label for="fSort">Ordem</label><input class="input" id="fSort" inputmode="numeric" value="${p.sort ?? 0}"></div>
  </div>
  <details><summary class="muted" style="cursor:pointer;font-size:.88rem">Endereço da página (avançado)</summary><div class="field" style="margin-top:8px"><input class="input" id="fSlug" value="${esc(p.slug)}" placeholder="gerado automaticamente"></div></details>`;
  const mm = modal(isNew ? 'Novo produto' : esc(p.name), body, `${isNew ? '' : '<button class="btn btn-ghost danger" id="fDel" style="margin-right:auto">Excluir</button>'}<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn" id="fSave">Salvar</button>`);
  const el = mm.el;
  const mto = () => { $('#stockF', el).style.opacity = $('#fMto', el).checked ? .5 : 1; };
  $('#fMto', el).onchange = mto; mto();

  const renderImgs = () => {
    $('#imgs', el).innerHTML = images.map((u, i) => `<div class="im"><img src="${esc(img(u))}" alt=""><div class="acts"><button type="button" data-l="${i}" title="Mover para a esquerda">◀</button><button type="button" data-x="${i}" title="Remover">✕</button><button type="button" data-r="${i}" title="Mover para a direita">▶</button></div></div>`).join('') + `<label class="upload" for="fileIn">＋<br>Enviar fotos</label>`;
    $$('[data-x]', el).forEach((b) => b.onclick = () => { images.splice(+b.dataset.x, 1); renderImgs(); });
    $$('[data-l]', el).forEach((b) => b.onclick = () => { const i = +b.dataset.l; if (i > 0) { [images[i - 1], images[i]] = [images[i], images[i - 1]]; renderImgs(); } });
    $$('[data-r]', el).forEach((b) => b.onclick = () => { const i = +b.dataset.r; if (i < images.length - 1) { [images[i + 1], images[i]] = [images[i], images[i + 1]]; renderImgs(); } });
  };
  renderImgs();
  $('#urlAdd', el).onclick = () => { const u = $('#urlIn', el).value.trim(); if (u) { images.push(u); $('#urlIn', el).value = ''; renderImgs(); } };
  $('#fileIn', el).onchange = async (e) => {
    const files = [...e.target.files]; if (!files.length) return;
    const up = $('.upload', el); up.textContent = 'Enviando…';
    for (const f of files) {
      try {
        const blob = await resizeImage(f);
        const path = `${slugify($('#fName', el).value) || 'produto'}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
        const { error } = await sb.storage.from('products').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
        if (error) throw error;
        images.push(sb.storage.from('products').getPublicUrl(path).data.publicUrl);
      } catch (err) { toast(`Falha ao enviar ${f.name}: ${err.message}`, 'err'); }
    }
    e.target.value = ''; renderImgs();
  };

  $('#fSave', el).onclick = async () => {
    const name = $('#fName', el).value.trim();
    const price = num($('#fPrice', el).value);
    if (!name) return toast('Informe o nome', 'err');
    if (price == null || Number.isNaN(price) || price < 0) return toast('Informe um preço válido', 'err');
    const row = {
      name, price,
      slug: slugify($('#fSlug', el).value || name),
      compare_at_price: num($('#fCmp', el).value),
      category_id: $('#fCat', el).value || null,
      colors: $('#fColors', el).value.split(',').map((s) => s.trim()).filter(Boolean),
      description: $('#fDesc', el).value.trim(),
      details: $('#fDet', el).value.trim(),
      made_to_order: $('#fMto', el).checked,
      stock: parseInt($('#fStock', el).value, 10) || 0,
      production_days: parseInt($('#fDays', el).value, 10) || 15,
      active: $('#fAct', el).checked,
      featured: $('#fFeat', el).checked,
      sort: parseInt($('#fSort', el).value, 10) || 0,
      images,
      updated_at: new Date().toISOString(),
    };
    const btn = $('#fSave', el); btn.disabled = true;
    const r = isNew ? await sb.from('products').insert(row) : await sb.from('products').update(row).eq('id', p.id);
    btn.disabled = false;
    if (r.error) return toast(/duplicate key/.test(r.error.message) ? 'Já existe um produto com esse endereço/nome' : r.error.message, 'err');
    toast('Produto salvo'); mm.close(); vProducts();
  };
  $('#fDel', el)?.addEventListener('click', async () => {
    if (!(await confirmBox(`Excluir <b>${esc(p.name)}</b> definitivamente? Se quiser só esconder da loja, desmarque “Visível na loja”.`, 'Excluir'))) return;
    const { error } = await sb.from('products').delete().eq('id', p.id);
    if (error) return toast(error.message, 'err');
    toast('Produto excluído'); mm.close(); vProducts();
  });
}

/* ---------------- Categorias ---------------- */
async function vCats() {
  await loadCats();
  const m = $('#main');
  m.innerHTML = `
  <div class="top"><h1>Categorias</h1></div>
  <div class="box">
    ${categories.map((c) => `<div class="toolbar" data-c="${c.id}"><input class="input" data-n value="${esc(c.name)}"><input class="input" data-s value="${c.sort}" inputmode="numeric" style="flex:0 0 70px;min-width:0" aria-label="Ordem"><button class="btn btn-sm btn-ghost" data-save>Salvar</button><button class="btn btn-sm btn-ghost danger" data-del>Excluir</button></div>`).join('') || '<p class="muted">Nenhuma categoria.</p>'}
  </div>
  <div class="box"><h3>Nova categoria</h3><div class="toolbar"><input class="input" id="ncN" placeholder="Nome"><button class="btn btn-sm" id="ncB">Adicionar</button></div></div>`;
  $$('[data-c]').forEach((row) => {
    const id = row.dataset.c;
    $('[data-save]', row).onclick = async () => {
      const name = $('[data-n]', row).value.trim();
      const { error } = await sb.from('categories').update({ name, slug: slugify(name), sort: parseInt($('[data-s]', row).value, 10) || 0 }).eq('id', id);
      error ? toast(error.message, 'err') : toast('Categoria salva');
    };
    $('[data-del]', row).onclick = async () => {
      if (!(await confirmBox('Excluir esta categoria? Os produtos dela ficarão sem categoria.', 'Excluir'))) return;
      const { error } = await sb.from('categories').delete().eq('id', id);
      error ? toast(error.message, 'err') : vCats();
    };
  });
  $('#ncB').onclick = async () => {
    const name = $('#ncN').value.trim(); if (!name) return;
    const { error } = await sb.from('categories').insert({ name, slug: slugify(name), sort: categories.length + 1 });
    error ? toast(error.message, 'err') : vCats();
  };
}

/* ---------------- Cupons ---------------- */
async function vCoupons() {
  const m = $('#main');
  const { data } = await sb.from('coupons').select('*').order('created_at', { ascending: false });
  const list = data || [];
  m.innerHTML = `
  <div class="top"><h1>Cupons</h1></div>
  <div class="box"><h3>Novo cupom</h3>
    <div class="grid-2">
      <div class="field"><label>Código</label><input class="input" id="cC" placeholder="Ex.: BEMVINDA10" autocapitalize="characters"></div>
      <div class="field"><label>Tipo</label><select class="input" id="cK"><option value="percent">% de desconto</option><option value="fixed">Valor fixo (R$)</option></select></div>
      <div class="field"><label>Valor</label><input class="input" id="cV" inputmode="decimal" placeholder="10"></div>
      <div class="field"><label>Compra mínima (R$)</label><input class="input" id="cM" inputmode="decimal" value="0"></div>
    </div>
    <button class="btn btn-sm" id="cAdd">Criar cupom</button>
  </div>
  <div class="box">${list.length ? list.map((c) => `
    <div class="toolbar" style="align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:12px">
      <div><b>${esc(c.code)}</b><br><small class="muted">${c.kind === 'percent' ? `${Number(c.value)}%` : money(c.value)} de desconto${Number(c.min_total) ? ` · mínimo ${money(c.min_total)}` : ''}</small></div>
      <div style="display:flex;gap:10px;align-items:center"><label class="switch"><input type="checkbox" data-ca="${esc(c.code)}" ${c.active ? 'checked' : ''}> Ativo</label><button class="btn btn-sm btn-ghost danger" data-cd="${esc(c.code)}">Excluir</button></div>
    </div>`).join('') : '<p class="muted">Nenhum cupom criado.</p>'}</div>`;
  $('#cAdd').onclick = async () => {
    const code = $('#cC').value.trim().toUpperCase().replace(/\s+/g, ''); const value = num($('#cV').value);
    if (!code || !value) return toast('Informe código e valor', 'err');
    const { error } = await sb.from('coupons').insert({ code, kind: $('#cK').value, value, min_total: num($('#cM').value) || 0 });
    error ? toast(/duplicate/.test(error.message) ? 'Esse código já existe' : error.message, 'err') : (toast('Cupom criado'), vCoupons());
  };
  $$('[data-ca]').forEach((cb) => cb.onchange = async () => { const { error } = await sb.from('coupons').update({ active: cb.checked }).eq('code', cb.dataset.ca); if (error) toast(error.message, 'err'); });
  $$('[data-cd]').forEach((b) => b.onclick = async () => { if (!(await confirmBox(`Excluir o cupom ${esc(b.dataset.cd)}?`, 'Excluir'))) return; await sb.from('coupons').delete().eq('code', b.dataset.cd); vCoupons(); });
}

/* ---------------- Configurações ---------------- */
const FIELDS = [
  ['Identidade', [
    ['store_name', 'Nome da loja'], ['tagline', 'Slogan'], ['announcement', 'Faixa de aviso no topo do site'],
    ['hero_title', 'Título da página inicial'], ['hero_subtitle', 'Texto da página inicial', 'textarea'], ['about', 'Texto “Sobre”', 'textarea'],
  ]],
  ['Contato', [['whatsapp', 'WhatsApp da loja (com DDI e DDD, só números. Ex.: 5537991985435)'], ['instagram', 'Instagram (sem @)'], ['email', 'E-mail de contato'], ['city', 'Cidade']]],
  ['Pagamento', [['pix_key', 'Chave Pix'], ['pix_name', 'Nome do favorecido do Pix']]],
  ['Entrega', [['shipping_flat', 'Frete fixo para envio (R$)', 'number'], ['free_shipping_over', 'Frete grátis acima de (R$) — 0 desativa', 'number'], ['pickup_address', 'Local de retirada'], ['production_note', 'Aviso de prazo de produção', 'textarea']]],
];

async function vSettings() {
  const { data } = await sb.from('settings').select('data').eq('id', 1).maybeSingle();
  settings = data?.data || {};
  const m = $('#main');
  m.innerHTML = `<div class="top"><h1>Configurações da loja</h1></div>
  <form id="sForm">${FIELDS.map(([g, fs]) => `<div class="box"><h3>${g}</h3>${fs.map(([k, l, t]) => `<div class="field"><label for="s_${k}">${l}</label>${t === 'textarea' ? `<textarea class="input" id="s_${k}">${esc(settings[k] ?? '')}</textarea>` : `<input class="input" id="s_${k}" ${t === 'number' ? 'inputmode="decimal"' : ''} value="${esc(settings[k] ?? '')}">`}</div>`).join('')}</div>`).join('')}
  <button class="btn" style="position:sticky;bottom:calc(84px + env(safe-area-inset-bottom));width:100%;max-width:340px">Salvar configurações</button></form>`;
  $('#sForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const next = { ...settings };
    FIELDS.forEach(([, fs]) => fs.forEach(([k, , t]) => { const v = $(`#s_${k}`).value.trim(); next[k] = t === 'number' ? (num(v) || 0) : v; }));
    next.whatsapp = onlyDigits(next.whatsapp);
    next.instagram = next.instagram.replace('@', '');
    const { error } = await sb.from('settings').upsert({ id: 1, data: next, updated_at: new Date().toISOString() });
    if (error) return toast(error.message, 'err');
    settings = next; toast('Configurações salvas');
  });
}

/* ---------------- Admins ---------------- */
async function vAdmins() {
  const { data } = await sb.from('admins').select('*').order('created_at');
  const m = $('#main');
  m.innerHTML = `<div class="top"><h1>Administradores</h1></div>
  <div class="box">${(data || []).map((a) => `<div class="toolbar" style="justify-content:space-between;align-items:center"><span>${esc(a.email)}${a.email.toLowerCase() === session.user.email.toLowerCase() ? ' <span class="st">você</span>' : ''}</span>${a.email.toLowerCase() === session.user.email.toLowerCase() ? '' : `<button class="btn btn-sm btn-ghost danger" data-ad="${esc(a.email)}">Remover</button>`}</div>`).join('')}</div>
  <div class="box"><h3>Adicionar administrador</h3><p class="muted" style="font-size:.9rem">A pessoa cria a conta em <b>Primeiro acesso</b> na tela de login do painel usando este mesmo e-mail.</p><div class="toolbar"><input class="input" id="naE" type="email" placeholder="email@exemplo.com"><button class="btn btn-sm" id="naB">Adicionar</button></div></div>`;
  $('#naB').onclick = async () => {
    const email = $('#naE').value.trim().toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(email)) return toast('E-mail inválido', 'err');
    const { error } = await sb.from('admins').insert({ email });
    error ? toast(error.message, 'err') : (toast('Administrador adicionado'), vAdmins());
  };
  $$('[data-ad]').forEach((b) => b.onclick = async () => { if (!(await confirmBox(`Remover o acesso de ${esc(b.dataset.ad)}?`, 'Remover'))) return; await sb.from('admins').delete().eq('email', b.dataset.ad); vAdmins(); });
}

function vMore() {
  $('#main').innerHTML = `<div class="top"><h1>Mais</h1></div>
  <div class="list-cards" style="display:grid">
    <div class="lc" data-go="categorias" style="grid-template-columns:auto 1fr">${ico('folder')}<b>Categorias</b></div>
    <div class="lc" data-go="cupons" style="grid-template-columns:auto 1fr">${ico('tag')}<b>Cupons de desconto</b></div>
    <div class="lc" data-go="admins" style="grid-template-columns:auto 1fr">${ico('user')}<b>Administradores</b></div>
    <a class="lc" href="${SITE}" target="_blank" rel="noopener" style="grid-template-columns:auto 1fr">${ico('bag')}<b>Ver a loja</b></a>
    <div class="lc" id="mOut" style="grid-template-columns:auto 1fr">${ico('x')}<b>Sair</b><small style="grid-column:2">${esc(session.user.email)}</small></div>
  </div>`;
  $$('[data-go]').forEach((b) => b.onclick = () => go(b.dataset.go));
  $$('.lc svg').forEach((s) => { s.style.cssText = 'width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.6'; });
  $('#mOut').onclick = async () => { await sb.auth.signOut(); boot(); };
}

/* ---------------- Boot ---------------- */
async function boot() {
  const { data } = await sb.auth.getSession();
  session = data.session;
  if (!session) return viewLogin();
  const { data: ok } = await sb.rpc('is_admin');
  if (!ok) return viewNotAdmin();
  await Promise.all([loadCats(), sb.from('settings').select('data').eq('id', 1).maybeSingle().then((r) => { settings = r.data?.data || {}; })]);
  shell();
  go(TABS.some((t) => t.id === tab) ? tab : 'painel');
  refreshPending();
}

sb.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') viewLogin('reset');
});
if (/type=recovery/.test(location.hash)) { tab = 'painel'; }
else boot();
