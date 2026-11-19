import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const money = (v) => brl.format(Number(v || 0));

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const img = (src) => {
  if (!src) return 'assets/placeholder.svg';
  return /^(https?:|data:|blob:)/.test(src) ? src : src.replace(/^\//, '');
};

export const slugify = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const onlyDigits = (s) => String(s || '').replace(/\D/g, '');

export function waLink(number, text) {
  const n = onlyDigits(number);
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function toast(msg, type = 'ok') {
  let box = document.querySelector('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.classList.add('out'), 3200);
  setTimeout(() => t.remove(), 3700);
}

export const STATUS = {
  novo: 'Novo',
  aguardando_pagamento: 'Aguardando pagamento',
  pago: 'Pago',
  em_producao: 'Em produção',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const SHIPPING = { retirada: 'Retirada', envio: 'Envio pelos Correios', combinar: 'Combinar pelo WhatsApp' };
export const PAYMENT = { pix: 'Pix', cartao_link: 'Cartão (link de pagamento)', combinar: 'Combinar pelo WhatsApp' };

let settingsCache;
export async function getSettings(force = false) {
  if (settingsCache && !force) return settingsCache;
  const { data } = await sb.from('settings').select('data').eq('id', 1).maybeSingle();
  settingsCache = data?.data || {};
  return settingsCache;
}

export function fmtDate(d) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
