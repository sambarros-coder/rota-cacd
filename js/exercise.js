import { esc, norm, embaralhar, falar } from './util.js';
import * as S from './data.js';

// Sessão: { titulo, itens, i, pontos, acertos, total, modo, licao, voltar, ciclo }
export let sessao = null;
export function iniciar(cfg) { sessao = Object.assign({ i: 0, pontos: 0, acertos: 0, total: 0, erros: [], respondido: false }, cfg); return sessao; }

const PESO = { C: 1, E: -0.25, B: 0 };
const AUTO = ['certo_errado', 'multipla_escolha', 'ordenar', 'lacuna', 'associar'];

function falaBtn(it) {
  if (!it.fala) return '';
  return `<button class="btn sec ouvir" data-act="ouvir" data-t="${esc(it.fala.texto)}" data-l="${esc(it.fala.lang || '')}">Ouvir</button>`;
}
export function renderItem() {
  const s = sessao, it = s.itens[s.i]; s.respondido = false; s.estado = {};
  const topo = `<div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="${s.itens.length}" aria-valuenow="${s.i}"><i style="width:${(s.i / s.itens.length) * 100}%"></i></div>
    <p class="meta">${esc(s.titulo)} · item ${s.i + 1} de ${s.itens.length}</p>`;
  let corpo = `<p class="enun">${esc(it.enunciado || it.frente || '')}</p>${falaBtn(it)}`;
  const t = it.tipo;
  if (t === 'certo_errado') corpo += `<div class="row3"><button class="btn ce" data-act="ce" data-v="C">Certo</button><button class="btn ce" data-act="ce" data-v="E">Errado</button><button class="btn sec" data-act="ce" data-v="B">Em branco</button></div>
    <p class="dica">Acerto +1 · erro −0,25 · em branco 0</p>`;
  else if (t === 'multipla_escolha') corpo += `<div class="opcoes">${it.opcoes.map((o, k) => `<button class="btn opt" data-act="mc" data-k="${k}">${esc(o)}</button>`).join('')}</div>`;
  else if (t === 'ordenar') {
    s.estado.emb = embaralhar(it.ordem, it.id); s.estado.esc = [];
    corpo += `<ol class="ord" id="ordSel" aria-label="Sua ordem"></ol><div class="opcoes" id="ordOpc"></div>
      <div class="row2"><button class="btn sec" data-act="ordUndo">Desfazer</button><button class="btn" data-act="ordOk" disabled id="ordOk">Verificar</button></div>`;
  } else if (t === 'lacuna') corpo += `<input class="inp" id="resp" autocomplete="off" autocapitalize="off" aria-label="Resposta"><button class="btn" data-act="lac">Conferir</button>`;
  else if (t === 'associar') {
    const dir = embaralhar(it.pares.map(p => p[1]), it.id).map(([v]) => v);
    corpo += it.pares.map((p, k) => `<label class="par"><span>${esc(p[0])}</span><select data-k="${k}"><option value="">Escolha…</option>${dir.map(d => `<option>${esc(d)}</option>`).join('')}</select></label>`).join('') + `<button class="btn" data-act="assoc">Conferir</button>`;
  } else if (t === 'flashcard') corpo += `<button class="btn" data-act="virar">Mostrar resposta</button>`;
  else corpo += `<textarea class="inp" id="resp" rows="4" aria-label="Sua resposta"></textarea><button class="btn" data-act="virar">Ver resposta modelo</button>`;
  return `${topo}<section class="cartao item">${corpo}<div id="fb" aria-live="polite"></div></section>`;
}
export function atualizarOrdem() {
  const s = sessao, it = s.itens[s.i], e = s.estado;
  document.getElementById('ordSel').innerHTML = e.esc.map(k => `<li>${esc(it.ordem[k])}</li>`).join('');
  document.getElementById('ordOpc').innerHTML = e.emb.filter(([, k]) => !e.esc.includes(k)).map(([v, k]) => `<button class="btn opt" data-act="ordAdd" data-k="${k}">${esc(v)}</button>`).join('');
  document.getElementById('ordOk').disabled = e.esc.length !== it.ordem.length;
}
export async function responder(acao, el) {
  const s = sessao, it = s.itens[s.i]; if (s.respondido && acao !== 'proximo') return null;
  let ok = null, pontos = null, detalhe = '';
  if (acao === 'ordAdd') { s.estado.esc.push(+el.dataset.k); atualizarOrdem(); return null; }
  if (acao === 'ordUndo') { s.estado.esc.pop(); atualizarOrdem(); return null; }
  if (acao === 'ce') { const v = el.dataset.v; ok = v === 'B' ? null : v === it.gabarito; pontos = PESO[v] === 0 ? 0 : (ok ? 1 : -0.25); detalhe = v === 'B' ? 'Você deixou em branco.' : ''; }
  else if (acao === 'mc') ok = +el.dataset.k === it.gabarito;
  else if (acao === 'ordOk') ok = s.estado.esc.every((k, p) => k === p);
  else if (acao === 'lac') ok = it.aceitas.map(norm).includes(norm(document.getElementById('resp').value));
  else if (acao === 'assoc') { const sel = [...document.querySelectorAll('select[data-k]')]; ok = sel.every(x => x.value === it.pares[+x.dataset.k][1]); }
  else if (acao === 'virar') {
    s.estado.virado = true;
    const modelo = it.verso || it.gabarito || it.modelo || '';
    document.getElementById('fb').innerHTML = `<div class="fb neutro"><p><b>Resposta:</b> ${esc(modelo)}</p>${it.explicacao ? `<p>${esc(it.explicacao)}</p>` : ''}${fonte(it)}</div>
      <p class="dica">Como foi?</p><div class="row2"><button class="btn" data-act="auto" data-v="1">Acertei</button><button class="btn sec" data-act="auto" data-v="0">Errei</button></div>`;
    document.querySelector('[data-act="virar"]')?.remove(); return null;
  } else if (acao === 'auto') ok = el.dataset.v === '1';
  else return null;
  s.respondido = true; s.total++;
  if (ok === null) { /* em branco */ } else {
    if (ok) s.acertos++; else s.erros.push(it);
    await S.registrarItem(it, ok);
  }
  if (it.tipo === 'certo_errado') s.pontos += pontos ?? (ok ? 1 : -0.25);
  else s.pontos += ok ? 1 : 0;
  const cls = ok === null ? 'neutro' : ok ? 'certo' : 'errado';
  const tit = ok === null ? 'Em branco' : ok ? 'Correto' : 'Incorreto';
  let gab = '';
  if (it.tipo === 'certo_errado') gab = `<p>Gabarito: <b>${it.gabarito === 'C' ? 'Certo' : 'Errado'}</b></p>`;
  else if (it.tipo === 'multipla_escolha') gab = `<p>Gabarito: <b>${esc(it.opcoes[it.gabarito])}</b></p>`;
  else if (it.tipo === 'ordenar') gab = `<ol>${it.ordem.map(o => `<li>${esc(o)}</li>`).join('')}</ol>`;
  else if (it.tipo === 'lacuna') gab = `<p>Resposta: <b>${esc(it.aceitas[0])}</b></p>`;
  else if (it.tipo === 'associar') gab = `<ul>${it.pares.map(p => `<li>${esc(p[0])} → ${esc(p[1])}</li>`).join('')}</ul>`;
  const fb = document.getElementById('fb'), ultimo = s.i === s.itens.length - 1;
  fb.querySelector('.row2')?.remove(); fb.querySelector('.dica')?.remove();
  fb.insertAdjacentHTML('beforeend', `<div class="fb ${cls}"><p class="tit">${tit}</p>${detalhe ? `<p>${detalhe}</p>` : ''}${gab}${it.explicacao && it.tipo !== 'flashcard' ? `<p>${esc(it.explicacao)}</p>` : ''}${fonte(it)}</div>
    <button class="btn" data-act="proximo" id="prox">${ultimo ? 'Ver resultado' : 'Próximo'}</button>`);
  document.querySelectorAll('.item .btn:not(#prox):not(.ouvir), .item select, .item input, .item textarea').forEach(b => { if (b.id !== 'prox') b.disabled = true; });
  document.getElementById('prox').focus();
  return ok;
}
const fonte = it => it.fonte ? `<p class="fonte">Fonte: ${esc(it.fonte)}</p>` : '';
export const tiposAuto = AUTO;
