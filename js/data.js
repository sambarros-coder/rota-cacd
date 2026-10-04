import * as db from './db.js';

// ---------- datas ----------
const pad = n => String(n).padStart(2, '0');
export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export function hoje() {
  const q = new URLSearchParams(location.search).get('hoje');
  return q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : iso(new Date());
}
export const addDias = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const difDias = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
export const fmt = s => s ? parse(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
export const fmtCurto = s => s ? parse(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') : '';
export const diaSemana = s => parse(s).toLocaleDateString('pt-BR', { weekday: 'long' });

// ---------- estado ----------
export const D = { core: null, packs: {}, idx: null, prog: null, erro: null };
const PROG_VAZIO = () => ({ schema: 1, licoes: {}, itens: {}, dias: {}, desafios: {}, config: { voz: true } });

const semver = v => v.split('.').map(Number);
const maior = (a, b) => { const x = semver(a), y = semver(b); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };

async function sha256(texto) {
  if (!crypto.subtle) return null;
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function baixar(entry, base) {
  const r = await fetch(new URL(entry.arquivo, base), { cache: 'no-cache' });
  if (!r.ok) throw new Error('Falha ao baixar ' + entry.arquivo);
  const t = await r.text();
  const h = await sha256(t);
  if (h && h !== entry.sha256) throw new Error('Pacote corrompido: ' + entry.id);
  return JSON.parse(t);
}
const BASE = () => new URL('data/', document.baseURI);

export async function carregar() {
  D.prog = (await db.get('progress')) || PROG_VAZIO();
  for (const k of await db.keys()) if (String(k).startsWith('pack:')) { const p = await db.get(k); D.packs[p.id] = p; }
  if (!D.packs.core) {
    const m = await (await fetch(new URL('manifest.json', BASE()))).json();
    for (const e of m.pacotes) { try { D.packs[e.id] = await guardar(e, await baixar(e, BASE())); } catch (err) { if (e.id === 'core') throw err; } }
  }
  indexar();
}
async function guardar(entry, conteudo) {
  conteudo.version = entry.version; conteudo.sha256 = entry.sha256;
  await db.set('pack:' + entry.id, conteudo); return conteudo;
}

export async function verificarAtualizacoes() {
  const r = await fetch(new URL('manifest.json', BASE()), { cache: 'no-store' });
  if (!r.ok) throw new Error('Sem conexão com o servidor de atualizações.');
  const m = await r.json(); const novos = [], falhas = [];
  for (const e of m.pacotes) {
    const atual = D.packs[e.id];
    if (!atual || maior(e.version, atual.version)) {
      try { D.packs[e.id] = await guardar(e, await baixar(e, BASE())); novos.push({ id: e.id, de: atual ? atual.version : null, para: e.version }); }
      catch (err) { falhas.push(err.message); }
    }
  }
  if (novos.length) indexar();
  if (falhas.length) { const x = new Error(falhas.join('; ') + (novos.length ? ` (os demais pacotes foram atualizados: ${novos.map(n => n.id).join(', ')})` : '')); x.novos = novos; throw x; }
  return novos;
}

export function indexar() {
  const core = D.packs.core; const t = hoje();
  const lic = {}, itens = {}, resumo = {}, porCiclo = {}, porMat = {}, pendentes = [];
  const materias = [...core.materias];
  const add = (l) => { lic[l.id] = l; (porCiclo[l.c] ||= []).push(l); (porMat[l.m] ||= []).push(l); };
  core.licoes.forEach(add);
  for (const p of Object.values(D.packs)) {
    if (p.id === 'core') continue;
    if (p.liberar_em && p.liberar_em > t) { pendentes.push({ id: p.id, liberar_em: p.liberar_em }); continue; }
    (p.materias || []).forEach(m => { if (!materias.find(x => x.s === m.s)) materias.push(m); });
    (p.licoes || []).forEach(l => { if (!lic[l.id]) add(l); });
    for (const [id, v] of Object.entries(p.itens || {})) {
      resumo[id] = { resumo: v.resumo || '', status: v.status || 'rascunho', pack: p.id, aula: v.aula || null };
      itens[id] = (v.itens || []);
    }
  }
  const todosItens = {}; Object.values(itens).flat().forEach(i => todosItens[i.id] = i);
  D.idx = { lic, itens, resumo, porCiclo, porMat, materias, todosItens, pendentes, core,
            ciclos: core.ciclos, desafios: core.desafios, trimestres: core.trimestres, feriados: new Set(core.feriados),
            demo: D.packs.demo ? D.packs.demo.desafio_demo : null };
}

export async function salvar() { await db.set('progress', D.prog); }

// ---------- dias de estudo ----------
export const diaDeEstudo = s => { const w = parse(s).getDay(); return w >= 1 && w <= 5 && !D.idx.feriados.has(s); };
export function addDiasEstudo(s, n) { let d = s; while (n > 0) { d = addDias(d, 1); if (diaDeEstudo(d)) n--; } return d; }
export function sequencia() {
  let d = hoje(), n = 0;
  const ativo = x => (D.prog.dias[x]?.licoes || 0) + (D.prog.dias[x]?.itens || 0) > 0;
  if (diaDeEstudo(d) && !ativo(d)) d = addDias(d, -1);
  for (let g = 0; g < 800; g++) {
    if (!diaDeEstudo(d)) { d = addDias(d, -1); continue; }
    if (ativo(d)) { n++; d = addDias(d, -1); } else break;
  }
  return n;
}

// ---------- ciclos ----------
export function cicloAtual() {
  const t = hoje(), cs = D.idx.ciclos;
  if (t < cs[0].ini) return { c: cs[0], estado: 'antes' };
  const c = cs.find(x => t >= x.ini && t <= x.fim);
  if (c) return { c, estado: 'em curso' };
  return { c: cs[cs.length - 1], estado: 'depois' };
}
export const feita = id => !!D.prog.licoes[id]?.feita;
export function atrasadas() {
  const { c, estado } = cicloAtual(); if (estado === 'antes') return [];
  const lim = estado === 'depois' ? c.c + 1 : c.c;
  return D.idx.core.licoes.filter(l => l.c < lim && !feita(l.id));
}
export function prontaPara(l) { return !l.pre || feita(l.pre) || !D.idx.lic[l.pre]; }

// ---------- registro ----------
function dia() { const t = hoje(); return D.prog.dias[t] ||= { licoes: 0, itens: 0, min: 0 }; }
export async function concluirLicao(id) {
  const l = D.idx.lic[id]; const t = hoje(); const p = D.prog.licoes[id];
  if (p?.feita) return;
  D.prog.licoes[id] = { feita: t, passo: 0, prox: addDiasEstudo(t, INTERVALOS[0]) };
  const d = dia(); d.licoes++; d.min += l.min; await salvar();
}
export const INTERVALOS = [1, 3, 7, 15, 30];
export async function registrarRevisao(id, ok) {
  const p = D.prog.licoes[id]; if (!p) return; const t = hoje();
  if (ok) { p.passo++; p.prox = p.passo >= INTERVALOS.length ? null : addDiasEstudo(t, INTERVALOS[p.passo]); }
  else { p.passo = Math.max(0, p.passo - 1); p.prox = addDiasEstudo(t, 1); }
  const d = dia(); d.min += 5; await salvar();
}
export function devidas() {
  const t = hoje();
  return Object.entries(D.prog.licoes).filter(([id, p]) => p.prox && p.prox <= t && D.idx.lic[id]).map(([id]) => D.idx.lic[id]);
}
export async function registrarItem(item, acertou) {
  const r = D.prog.itens[item.id] ||= { ok: 0, err: 0 };
  if (acertou) { r.ok++; r.erro = false; } else { r.err++; r.erro = true; }
  r.ultimo = hoje(); dia().itens++; await salvar();
}
export const errados = () => Object.entries(D.prog.itens).filter(([id, r]) => r.erro && D.idx.todosItens[id]).map(([id]) => D.idx.todosItens[id]);

// ---------- backup ----------
export function exportar() {
  return JSON.stringify({ app: 'rota-cacd', schema: 1, exportado_em: new Date().toISOString(), progresso: D.prog }, null, 1);
}
export async function importar(texto) {
  const o = JSON.parse(texto);
  if (o.app !== 'rota-cacd' || !o.progresso || typeof o.progresso.licoes !== 'object') throw new Error('Este arquivo não é um backup do Rota CACD.');
  await db.set('progress_anterior', D.prog);
  const p = Object.assign(PROG_VAZIO(), o.progresso); D.prog = p; await salvar();
}
