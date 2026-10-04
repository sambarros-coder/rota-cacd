import { esc, falar } from './util.js';
import * as S from './data.js';
import * as X from './exercise.js';
import { semArmazenamento } from './db.js';

const $app = document.getElementById('app');
const NOMES = {}; const SIGLAS = [];
const cor = s => ({ POR: 1, ING: 2, HBR: 3, HMU: 4, GEO: 5, POL: 6, ECO: 7, DIR: 8, ESP: 9, FRA: 10, TOUR: 0 }[s] ?? 0);
const mat = s => (S.D.idx.materias.find(m => m.s === s) || { nome: s }).nome;
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const tag = (s) => `<span class="sig m${cor(s)}">${s}</span>`;

// ---------- roteador ----------
const rotas = [];
const rota = (re, fn) => rotas.push([re, fn]);
async function navegar() {
  const h = location.hash.replace(/^#/, '') || '/';
  for (const [re, fn] of rotas) { const m = h.match(re); if (m) { await fn(...m.slice(1).map(decodeURIComponent)); marcarNav(h); window.scrollTo(0, 0); $app.focus({ preventScroll: true }); return; } }
  location.hash = '#/';
}
function marcarNav(h) {
  const k = h.startsWith('/rota') || h.startsWith('/licao') ? 'rota' : h.startsWith('/revisao') ? 'revisao' : h.startsWith('/calendario') || h.startsWith('/ciclo') || h.startsWith('/desafio') ? 'calendario' : h.startsWith('/mais') || h.startsWith('/erros') ? 'mais' : h === '/' ? 'hoje' : '';
  document.querySelectorAll('nav a').forEach(a => a.dataset.k === k ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
}
const set = (html) => { $app.innerHTML = html; };

// ---------- HOJE ----------
rota(/^\/$/, async () => {
  const { c, estado } = S.cicloAtual(), t = S.hoje(), I = S.D.idx;
  const lics = I.porCiclo[c.c] || [];
  const feitas = lics.filter(l => S.feita(l.id)).length;
  const atr = S.atrasadas(), dev = S.devidas(), seq = S.sequencia();
  const dia = S.D.prog.dias[t] || { min: 0 };
  const estudo = S.diaDeEstudo(t);
  const faltam = S.difDias(t, c.ini);
  const aviso = estado === 'antes' ? `<p class="aviso">O plano começa em <b>${S.fmt(c.ini)}</b> (${faltam} dias). Você pode adiantar o Ciclo 1 quando quiser.</p>`
    : estado === 'depois' ? `<p class="aviso">O plano terminou em ${S.fmt(c.fim)}. Use a revisão e o caderno de erros.</p>` : '';
  const dDes = S.difDias(t, c.des);
  const prox = lics.find(l => !S.feita(l.id) && S.prontaPara(l));
  set(`<header class="topo"><p class="meta">${esc(S.diaSemana(t))}, ${S.fmt(t)}${estudo ? '' : ' · dia livre'}</p>
    <h1>Ciclo ${c.c} <small>de ${I.ciclos.length}</small></h1>
    <p class="meta">${S.fmtCurto(c.ini)} a ${S.fmtCurto(c.fim)} · ${c.tr} · Ano ${c.ano}</p></header>${aviso}
    <div class="grade3"><div class="num"><b>${seq}</b><span>dias seguidos</span></div><div class="num"><b>${dia.min}<small>/20</small></b><span>min no app hoje</span></div><div class="num"><b>${feitas}<small>/${lics.length}</small></b><span>lições do ciclo</span></div></div>
    ${dev.length ? `<a class="cartao link" href="#/revisao"><b>${dev.length} ${dev.length > 1 ? 'revisões' : 'revisão'} para hoje</b><span>Revisar agora</span></a>` : ''}
    ${atr.length ? `<a class="cartao link atraso" href="#/rota?atrasadas=1"><b>${atr.length} ${atr.length > 1 ? 'lições atrasadas' : 'lição atrasada'}</b><span>Ver e recuperar</span></a>` : ''}
    <section class="cartao"><h2>Lições deste ciclo</h2>
    <ol class="trilha-lista">${lics.map(l => `<li class="${S.feita(l.id) ? 'feita' : l === prox ? 'prox' : ''}"><a href="#/licao/${l.id}">${tag(l.m)}<span>${esc(l.t)}</span><em>${l.min} min${I.itens[l.id] ? ' · aula e ' + I.itens[l.id].length + ' exercícios' : ''}</em></a></li>`).join('')}</ol>
    ${prox ? `<a class="btn" href="#/licao/${prox.id}">Estudar: ${esc(prox.t)}</a>` : (lics.length ? '<p class="meta">Todas as lições do ciclo estão feitas.</p>' : '')}</section>
    <a class="cartao link" href="#/desafio/${c.c}"><b>Desafio do ciclo ${c.c}</b><span>${S.fmt(c.des)}${dDes > 0 ? ` · em ${dDes} ${dDes > 1 ? 'dias' : 'dia'}` : dDes === 0 ? ' · hoje' : ' · já passou'}</span></a>
    <section class="cartao"><h2>Rotina do dia</h2><ol class="rotina"><li><b>20 min</b> no app: lições e revisões</li><li><b>1h30</b> de bloco de estudo (material do ciclo)</li><li><b>30 min</b> de língua estrangeira</li><li><b>10 min</b> no caderno de erros</li></ol>
    <p class="meta">Segunda a sexta. Fim de semana livre.</p></section>
    <a class="cartao link" href="#/licao/TOUR-01"><b>Tour do app</b><span>Veja como são os exercícios</span></a>`);
});

// ---------- ROTA ----------
rota(/^\/rota(?:\/([A-Z]+))?(?:\?(.*))?$/, async (s, q) => {
  const I = S.D.idx; const atrasadas = new URLSearchParams(q || '').get('atrasadas');
  const chips = `<div class="chips" role="tablist"><a href="#/rota" ${!s && !atrasadas ? 'aria-current="true"' : ''}>Todas</a>${I.materias.filter(m => m.s !== 'TOUR').map(m => `<a href="#/rota/${m.s}" ${s === m.s ? 'aria-current="true"' : ''}>${m.s}</a>`).join('')}</div>`;
  if (atrasadas) {
    const a = S.atrasadas();
    set(`<h1>Lições atrasadas</h1><p class="meta">${a.length} no total. A ordem das lições dentro de cada matéria continua valendo.</p>${chips}<ul class="lista">${a.map(l => linhaLicao(l, true)).join('') || '<li class="vazio">Nenhuma lição atrasada.</li>'}</ul>`); return;
  }
  if (!s) {
    set(`<h1>Rota</h1><p class="meta">10 matérias · ${I.core.licoes.length} lições</p>${chips}<ul class="lista mats">${I.materias.filter(m => m.s !== 'TOUR').map(m => { const l = I.porMat[m.s]; const f = l.filter(x => S.feita(x.id)).length;
      return `<li><a href="#/rota/${m.s}">${tag(m.s)}<span>${esc(m.nome)}</span><em>${f}/${l.length}</em><i class="barra"><b style="width:${pct(f, l.length)}%"></b></i></a></li>`; }).join('')}</ul>`); return;
  }
  const l = I.porMat[s] || []; const mods = []; l.forEach(x => { let m = mods.find(y => y.n === x.mn); if (!m) mods.push(m = { n: x.mn, nome: x.mod, ls: [] }); m.ls.push(x); });
  set(`<h1>${esc(mat(s))}</h1><p class="meta">${l.filter(x => S.feita(x.id)).length} de ${l.length} lições</p>${chips}${mods.map(m => `<details ${m.ls.some(x => !S.feita(x.id)) && mods.find(z => z.ls.some(x => !S.feita(x.id))) === m ? 'open' : ''}><summary>${m.n}. ${esc(m.nome)} <em>${m.ls.filter(x => S.feita(x.id)).length}/${m.ls.length}</em></summary><ul class="lista">${m.ls.map(x => linhaLicao(x)).join('')}</ul></details>`).join('')}`);
});
function linhaLicao(l, mostraMat) {
  const f = S.feita(l.id), ok = S.prontaPara(l); const r = S.D.prog.licoes[l.id];
  return `<li class="${f ? 'feita' : ''} ${ok ? '' : 'bloq'}"><a href="#/licao/${l.id}">${mostraMat ? tag(l.m) : ''}<span>${esc(l.t)}</span><em>${f ? (r.prox ? 'revisar ' + S.fmtCurto(r.prox) : 'concluída') : 'ciclo ' + l.c}</em></a></li>`;
}

// ---------- LIÇÃO ----------
function aulaHTML(a) {
  const sec = (a.secoes || []).map(x => `<section class="cartao aula"><h2>${esc(x.titulo)}</h2>${(x.paragrafos || []).map(p => `<p>${esc(p)}</p>`).join('')}
    ${x.lista?.length ? `<ul>${x.lista.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
    ${x.tabela ? `<div class="tabela"><table><thead><tr>${x.tabela.cabecalho.map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${x.tabela.linhas.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}</section>`).join('');
  const peg = a.pegadinhas?.length ? `<section class="cartao aula peg"><h2>Pegadinhas de prova</h2><ul>${a.pegadinhas.map(i => `<li>${esc(i)}</li>`).join('')}</ul></section>` : '';
  const fon = a.fontes?.length ? `<details class="fontes"><summary>Fontes da aula</summary><ul>${a.fontes.map(i => `<li>${esc(i)}</li>`).join('')}</ul></details>` : '';
  return sec + peg + fon;
}
rota(/^\/licao\/([A-Z0-9-]+)$/, async (id) => {
  const I = S.D.idx, l = I.lic[id]; if (!l) { set('<p class="vazio">Lição não encontrada.</p>'); return; }
  const itens = I.itens[id] || [], info = I.resumo[id], f = S.feita(id), r = S.D.prog.licoes[id];
  const pre = l.pre && I.lic[l.pre] && !S.feita(l.pre) ? I.lic[l.pre] : null;
  const rasc = info && info.status === 'rascunho';
  set(`<p class="meta"><a href="#/rota/${l.m}">${esc(mat(l.m))}</a> › ${esc(l.mod)}</p><h1>${esc(l.t)}</h1>
    <p class="meta">${l.nv} · ${l.min} min${l.c ? ` · ciclo ${l.c}` : ''} · prova: ${esc(l.fp)}</p>
    ${pre ? `<p class="aviso">Antes, faça <a href="#/licao/${pre.id}">${esc(pre.t)}</a>. Você pode seguir mesmo assim.</p>` : ''}
    <section class="cartao"><h2>Objetivo</h2><p>${esc(l.o)}</p>${info?.resumo ? `<h2>Resumo</h2><p>${esc(info.resumo)}</p>` : ''}
    <dl class="ficha">${l.ed && l.ed !== '-' ? `<dt>Tópico do edital</dt><dd>${esc(l.ed)}</dd>` : ''}${l.un ? `<dt>Unidade</dt><dd>${esc(l.un)}</dd>` : ''}${l.ref ? `<dt>Referência</dt><dd>${esc(l.ref)}</dd>` : ''}<dt>Exercícios previstos</dt><dd>${l.ex.map(x => x.replace(/_/g, ' ')).join(', ')}</dd></dl>
    ${rasc ? '<p class="aviso">Conteúdo em rascunho: confira antes de confiar. Falta revisão humana.</p>' : ''}</section>
    ${info?.aula ? aulaHTML(info.aula) : ''}
    ${itens.length ? `<p class="meta">Leia a aula e depois faça os exercícios.</p><button class="btn" data-go="licao" data-id="${id}">${f ? 'Refazer' : 'Começar'} ${itens.length} exercícios</button>`
      : `<p class="cartao vazio">Os exercícios desta lição ainda não foram publicados. Estude pelo material e marque como feita.</p>${f ? '' : `<button class="btn" data-act="feita" data-id="${id}">Marcar como estudada</button>`}`}
    ${f ? `<p class="meta">Concluída em ${S.fmt(r.feita)}${r.prox ? ` · próxima revisão em ${S.fmt(r.prox)}` : ' · revisões concluídas'}</p>` : ''}`);
});

// ---------- EXERCÍCIOS ----------
function abrirSessao(cfg) { X.iniciar(cfg); location.hash = '#/exercicio'; }
rota(/^\/exercicio$/, async () => {
  if (!X.sessao || X.sessao.fim) { location.hash = '#/'; return; }
  set(X.renderItem()); if (X.sessao.itens[X.sessao.i].tipo === 'ordenar') X.atualizarOrdem();
});
async function resultado() {
  const s = X.sessao; let extra = '';
  const ce = s.itens.every(i => i.tipo === 'certo_errado');
  const ok = pct(s.acertos, s.total) >= 70;
  if (s.modo === 'licao') { await S.concluirLicao(s.licao); extra = '<p class="meta">Lição concluída. A primeira revisão foi agendada.</p>'; }
  if (s.modo === 'revisao') { await S.registrarRevisao(s.licao, ok); }
  if (s.modo === 'desafio') { S.D.prog.desafios[s.ciclo] = { data: S.hoje(), pontos: s.pontos, total: s.total }; await S.salvar(); }
  const err = s.erros.length;
  set(`<h1>${s.modo === 'desafio' ? 'Desafio concluído' : 'Sessão concluída'}</h1><section class="cartao resultado"><div class="grande">${s.acertos}<small>/${s.total}</small></div><p>acertos${ce ? ` · nota na regra da prova: <b>${s.pontos.toLocaleString('pt-BR')}</b> pontos` : ''}</p>${extra}
    ${err ? `<p>${err} ${err > 1 ? 'itens foram para' : 'item foi para'} o <a href="#/erros">caderno de erros</a>.</p>` : '<p>Sem erros nesta sessão.</p>'}</section>
    <a class="btn" href="#/">Voltar ao início</a>`);
  X.iniciar({ ...s, fim: true });
}
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act],[data-go]'); if (!el) return;
  const I = S.D.idx;
  if (el.dataset.go === 'licao') { const id = el.dataset.id; abrirSessao({ titulo: I.lic[id].t, itens: I.itens[id], modo: 'licao', licao: id }); return; }
  if (el.dataset.go === 'revisao') { const id = el.dataset.id; const it = I.itens[id]; if (it) abrirSessao({ titulo: 'Revisão: ' + I.lic[id].t, itens: it, modo: 'revisao', licao: id }); else { await S.registrarRevisao(id, true); navegar(); } return; }
  if (el.dataset.go === 'erros') { const e2 = S.errados(); if (e2.length) abrirSessao({ titulo: 'Caderno de erros', itens: e2, modo: 'erros' }); return; }
  if (el.dataset.go === 'desafio') { abrirSessao(JSON.parse(el.dataset.cfg)); return; }
  const a = el.dataset.act;
  if (a === 'feita') { await S.concluirLicao(el.dataset.id); navegar(); return; }
  if (a === 'ouvir') { if (!falar(el.dataset.t, el.dataset.l)) alert('Este aparelho não tem voz instalada.'); return; }
  if (a === 'proximo') { const s = X.sessao; s.i++; if (s.i >= s.itens.length) { await resultado(); } else navegar(); return; }
  if (['ce', 'mc', 'ordAdd', 'ordUndo', 'ordOk', 'lac', 'assoc', 'virar', 'auto'].includes(a)) { await X.responder(a, el); }
});

// ---------- REVISÃO ----------
rota(/^\/revisao$/, async () => {
  const dev = S.devidas(), futuras = Object.entries(S.D.prog.licoes).filter(([, p]) => p.prox && p.prox > S.hoje()).sort((a, b) => a[1].prox.localeCompare(b[1].prox)).slice(0, 8);
  const I = S.D.idx;
  set(`<h1>Revisão</h1><p class="meta">Repetição espaçada: 1, 3, 7, 15 e 30 dias de estudo depois da lição. Fim de semana e feriado não contam.</p>
    <ul class="lista">${dev.map(l => `<li><a href="#" data-go="revisao" data-id="${l.id}" onclick="return false">${tag(l.m)}<span>${esc(l.t)}</span><em>${I.itens[l.id] ? 'exercícios' : 'reler'}</em></a></li>`).join('') || '<li class="vazio">Nenhuma revisão para hoje.</li>'}</ul>
    ${futuras.length ? `<h2>Próximas</h2><ul class="lista leve">${futuras.map(([id, p]) => `<li><a href="#/licao/${id}"><span>${esc(I.lic[id].t)}</span><em>${S.fmtCurto(p.prox)}</em></a></li>`).join('')}</ul>` : ''}`);
});

// ---------- ERROS ----------
rota(/^\/erros$/, async () => {
  const e = S.errados();
  set(`<h1>Caderno de erros</h1><p class="meta">Itens que você errou e ainda não acertou de novo.</p>
    ${e.length ? `<button class="btn" data-go="erros">Refazer ${e.length} ${e.length > 1 ? 'itens' : 'item'}</button><ul class="lista">${e.map(i => `<li class="erroitem"><p>${esc(i.enunciado || i.frente)}</p><p class="meta">${esc(i.explicacao || i.verso || '')}</p></li>`).join('')}</ul>` : '<p class="cartao vazio">Nada por aqui. Os itens errados aparecem nesta lista.</p>'}`);
});

// ---------- CALENDÁRIO ----------
rota(/^\/calendario$/, async () => {
  const I = S.D.idx, { c: atual } = S.cicloAtual(), t = S.hoje();
  const grupos = I.trimestres.map(tr => {
    const cs = I.ciclos.filter(c => c.c >= tr.ci && c.c <= tr.cf);
    return `<details ${atual.tr === tr.id ? 'open' : ''}><summary>${tr.id} · Ano ${tr.ano} · ${esc(tr.fase)} <em>${S.fmtCurto(tr.ini)} a ${S.fmtCurto(tr.fim)}</em></summary><ul class="lista">${cs.map(c => {
      const ls = I.porCiclo[c.c] || [], f = ls.filter(l => S.feita(l.id)).length, atraso = c.fim < t && f < ls.length;
      return `<li class="${c.c === atual.c ? 'agora' : ''} ${atraso ? 'atrasado' : ''}"><a href="#/ciclo/${c.c}"><span><b>Ciclo ${c.c}</b> ${S.fmtCurto(c.ini)} a ${S.fmtCurto(c.fim)}</span><em>${f}/${ls.length}${atraso ? ' · atrasado' : ''}</em></a></li>`; }).join('')}</ul></details>`; }).join('');
  set(`<h1>Calendário</h1><p class="meta">64 ciclos de 14 dias, de 02/11/2026 a 15/04/2029. Todos os ciclos ficam abertos.</p>${grupos}`);
});
rota(/^\/ciclo\/(\d+)$/, async (n) => {
  const I = S.D.idx, c = I.ciclos.find(x => x.c === +n); if (!c) return; const ls = I.porCiclo[c.c] || [];
  const d = I.desafios.find(x => x.c === c.c), feito = S.D.prog.desafios[c.c];
  set(`<p class="meta"><a href="#/calendario">Calendário</a></p><h1>Ciclo ${c.c}</h1><p class="meta">${S.fmt(c.ini)} a ${S.fmt(c.fim)} · ${c.tr} · ${ls.length} lições · ${c.min} min</p>
    <ul class="lista">${ls.map(l => linhaLicao(l, true)).join('')}</ul>
    <a class="cartao link" href="#/desafio/${c.c}"><b>Desafio</b><span>${d.tipo} · ${S.fmt(d.data)}${feito ? ` · feito (${feito.pontos.toLocaleString('pt-BR')} pts)` : ''}</span></a>
    <div class="navc">${c.c > 1 ? `<a href="#/ciclo/${c.c - 1}">‹ Ciclo ${c.c - 1}</a>` : '<span></span>'}${c.c < I.ciclos.length ? `<a href="#/ciclo/${c.c + 1}">Ciclo ${c.c + 1} ›</a>` : ''}</div>`);
});

// ---------- DESAFIO ----------
rota(/^\/desafio\/(\d+)$/, async (n) => {
  const I = S.D.idx, d = I.desafios.find(x => x.c === +n); if (!d) return;
  const lics = (I.porCiclo[+n] || []);
  const base = lics.flatMap(l => (I.itens[l.id] || []).filter(i => i.tipo === 'certo_errado'));
  const feito = S.D.prog.desafios[+n];
  set(`<p class="meta"><a href="#/ciclo/${n}">Ciclo ${n}</a></p><h1>Desafio</h1><p class="meta">${S.fmt(d.data)} · ${d.dur} min</p>
    <section class="cartao"><h2>${esc(d.tipo)}</h2><p>${esc(d.desc)}</p>${d.rev ? `<p class="meta">Revisão: ${esc(d.rev)}</p>` : ''}${d.obs ? `<p class="aviso">${esc(d.obs)}</p>` : ''}</section>
    ${feito ? `<p class="cartao">Último resultado: <b>${feito.pontos.toLocaleString('pt-BR')}</b> pontos em ${feito.total} itens (${S.fmt(feito.data)}).</p>` : ''}
    ${base.length ? `<button class="btn" data-go="desafio" data-cfg='${esc(JSON.stringify({ titulo: 'Desafio do ciclo ' + n, itens: base.slice(0, d.ce || 36), modo: 'desafio', ciclo: +n }))}'>Fazer com ${Math.min(base.length, d.ce || 36)} itens disponíveis</button>`
      : `<p class="cartao vazio">Os itens deste desafio entram na etapa 2 do projeto. Enquanto isso, veja um desafio de demonstração.</p>`}
    ${I.demo ? `<button class="btn sec" data-go="desafio" data-cfg='${esc(JSON.stringify({ titulo: 'Desafio de demonstração', itens: I.itens['TOUR-01'].concat(I.itens['HBR-06-43'] || []).filter(i => i.tipo === 'certo_errado'), modo: 'demo' }))}'>Desafio de demonstração</button>` : ''}`);
});

// ---------- MAIS ----------
rota(/^\/mais$/, async () => {
  const I = S.D.idx, P = S.D.packs;
  set(`<h1>Mais</h1>
    <a class="cartao link" href="#/erros"><b>Caderno de erros</b><span>${S.errados().length} itens</span></a>
    <section class="cartao"><h2>Conteúdo</h2><ul class="lista leve">${Object.values(P).map(p => `<li><span>${esc(p.id)}</span><em>v${esc(p.version)}</em></li>`).join('')}${I.pendentes.map(p => `<li><span>${esc(p.id)}</span><em>libera em ${S.fmt(p.liberar_em)}</em></li>`).join('')}</ul>
    <button class="btn sec" data-act="atualizar">Buscar atualizações</button><p id="msgAtu" class="meta" aria-live="polite"></p></section>
    <section class="cartao"><h2>Seu progresso fica só neste aparelho</h2><p>Salve um backup de vez em quando. Para trocar de aparelho, importe o arquivo no novo.</p>
    <button class="btn" data-act="exportar">Baixar backup</button> <label class="btn sec arq">Importar backup<input type="file" accept="application/json" id="imp" hidden></label><p id="msgBk" class="meta" aria-live="polite"></p>
    ${semArmazenamento() ? '<p class="aviso">Este navegador está bloqueando o armazenamento. O progresso se perde ao fechar.</p>' : ''}</section>
    <section class="cartao"><h2>Apagar progresso</h2><p>Zera lições feitas, revisões, caderno de erros, sequência e desafios. O conteúdo do app não é afetado.</p>
    <button class="btn sec" data-act="apagar1" id="btnApagar">Apagar progresso…</button>
    <div id="boxApagar" hidden><p class="aviso">Isso zera o progresso deste aparelho. Uma cópia fica guardada para desfazer, mas só até o próximo apagamento ou importação. Baixe um backup se quiser guardá-lo.</p>
    <button class="btn sec" data-act="exportar">Baixar backup antes</button>
    <label for="confApagar">Digite APAGAR para confirmar</label><input class="inp" id="confApagar" autocomplete="off" autocapitalize="characters">
    <button class="btn danger" data-act="apagar2" id="btnApagar2" disabled>Apagar progresso agora</button>
    <button class="btn sec" data-act="apagarNao">Cancelar</button></div>
    <p id="msgApagar" class="meta" aria-live="polite"></p>${await S.temCopiaAnterior() ? '<button class="btn sec" data-act="desfazer">Desfazer o último apagamento ou importação</button>' : ''}</section>
    <section class="cartao"><h2>Sobre</h2><p class="meta">Rota CACD · material de estudo para o concurso do Instituto Rio Branco. Os itens marcados como rascunho precisam de revisão humana. Confira sempre o edital oficial.</p></section>`);
});
document.addEventListener('click', async (e) => {
  const a = e.target.closest('[data-act]')?.dataset.act;
  if (a === 'atualizar') { const m = document.getElementById('msgAtu'); m.textContent = 'Buscando…'; try { const n = await S.verificarAtualizacoes(); m.textContent = n.length ? `Atualizado: ${n.map(x => x.id + ' v' + x.para).join(', ')}.` : 'Você já está com a versão mais recente.'; } catch (err) { m.textContent = 'Problema na atualização: ' + err.message; if (err.novos?.length) { await navegar(); const x = document.getElementById('msgAtu'); if (x) x.textContent = 'Problema na atualização: ' + err.message; } } }
  if (a === 'apagar1') { document.getElementById('boxApagar').hidden = false; e.target.hidden = true; document.getElementById('confApagar').focus(); }
  if (a === 'apagarNao') { document.getElementById('boxApagar').hidden = true; document.getElementById('btnApagar').hidden = false; document.getElementById('confApagar').value = ''; document.getElementById('btnApagar2').disabled = true; }
  if (a === 'apagar2' && document.getElementById('confApagar').value.trim().toUpperCase() === 'APAGAR') { await S.apagarProgresso(); await navegar(); document.getElementById('msgApagar').textContent = 'Progresso apagado. Para desfazer, use o botão abaixo.'; }
  if (a === 'desfazer') { try { await S.restaurarAnterior(); await navegar(); document.getElementById('msgApagar').textContent = 'Progresso restaurado.'; } catch (err) { document.getElementById('msgApagar').textContent = err.message; } }
  if (a === 'exportar') { const b = new Blob([S.exportar()], { type: 'application/json' }); const u = URL.createObjectURL(b); const l = document.createElement('a'); l.href = u; l.download = `rota-cacd-backup-${S.hoje()}.json`; l.click(); setTimeout(() => URL.revokeObjectURL(u), 2000); document.getElementById('msgBk').textContent = 'Backup baixado.'; }
});
document.addEventListener('input', (e) => { if (e.target.id === 'confApagar') document.getElementById('btnApagar2').disabled = e.target.value.trim().toUpperCase() !== 'APAGAR'; });
document.addEventListener('change', async (e) => {
  if (e.target.id !== 'imp') return; const f = e.target.files[0]; if (!f) return; const m = document.getElementById('msgBk');
  try { if (!confirm('Importar vai substituir o progresso deste aparelho. Uma cópia do atual fica guardada. Continuar?')) return; await S.importar(await f.text()); m.textContent = 'Backup importado.'; } catch (err) { m.textContent = err.message; }
});

// ---------- início ----------
(async () => {
  try {
    await S.carregar();
    window.addEventListener('hashchange', navegar); await navegar();
    document.documentElement.dataset.pronto = '1';
    S.verificarAtualizacoes().then(n => { if (n.length) navegar(); }).catch(() => {});
  } catch (err) { set(`<h1>Não foi possível abrir</h1><p class="aviso">${esc(err.message)}</p><p>Conecte-se à internet uma vez para baixar o conteúdo.</p>`); }
})();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
