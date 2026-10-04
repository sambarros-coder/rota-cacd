import json, sys, re
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
erros = []
def check(c, m):
    print(('OK   ' if c else 'FALHA'), m)
    if not c: erros.append(m)
def _n(pg):
    pg.click('#prox'); pg.wait_for_function("!document.querySelector('#prox')")
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium' if False else None)
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='allow')
    pg = ctx.new_page(); logs = []
    nxt = lambda: _n(pg)
    pg.on('console', lambda m: logs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: logs.append(str(e)))
    pg.goto(URL + '?hoje=2026-11-03'); pg.wait_for_selector('html[data-pronto]')
    check('Ciclo 1' in pg.inner_text('h1'), 'home mostra ciclo 1 em 03/11/2026')
    pg.screenshot(path='tools/shots/hoje.png', full_page=True)
    pg.wait_for_function('navigator.serviceWorker.controller || true'); pg.evaluate('navigator.serviceWorker.ready'); pg.wait_for_timeout(1500)
    # calendário vs sched.json
    sch = json.load(open('tools/sched.json'))
    pg.goto(URL + '?hoje=2026-11-03#/calendario'); pg.wait_for_selector('h1')
    pg.evaluate("document.querySelectorAll('details').forEach(d=>d.open=true)")
    n = pg.locator('a[href^="#/ciclo/"]').count(); check(n == 64, f'calendário lista 64 ciclos ({n})')
    pg.screenshot(path='tools/shots/calendario.png')
    for c in (1, 4, 38, 63):
        pg.goto(URL + f'?hoje=2026-11-03#/ciclo/{c}'); pg.wait_for_selector('h1')
        d = [x for x in sch['chals'] if x['ciclo'] == c][0]['data_desafio']
        br = '/'.join(reversed(d.split('-')))
        check(br in pg.inner_text('main'), f'ciclo {c}: desafio em {br}')
    # lição com aula e exercícios (ciclo 1)
    pg.goto(URL + '?hoje=2026-11-03#/licao/POR-01-01'); pg.wait_for_selector('h1')
    t = pg.inner_text('main'); check('Pegadinhas de prova' in t and 'Fontes da aula' in t and 'Começar 12 exercícios' in t, 'POR-01-01 mostra aula, pegadinhas e 12 exercícios')
    pg.screenshot(path='tools/shots/aula.png', full_page=True)
    pg.click('[data-go=licao]'); pg.wait_for_selector('.item')
    for k in range(12):
        tp = pg.evaluate("document.querySelector('.item [data-act]')?.dataset.act")
        if tp == 'ce': pg.click('[data-act=ce][data-v="C"]')
        elif tp == 'mc': pg.click('[data-act=mc][data-k="0"]')
        else: pg.click('[data-act=virar]'); pg.click('[data-act=auto][data-v="1"]')
        pg.wait_for_selector('#prox'); nxt()
    check('Sessão concluída' in pg.inner_text('h1'), 'sessão de 12 exercícios conclui e registra a lição')
    # todas as 11 lições do ciclo 1 têm conteúdo e abrem sem erro
    for lid in ['POR-01-02','HMU-01-01','GEO-01-01','POL-01-01','ECO-01-01','ECO-01-02','DIR-01-01','DIR-01-02','ESP-01-01','FRA-01-01']:
        pg.goto(URL + f'?hoje=2026-11-03#/licao/{lid}'); pg.wait_for_selector('h1')
        t = pg.inner_text('main'); check('Pegadinhas de prova' in t and 'exercícios' in t, f'{lid} com aula e exercícios')
        pg.click('[data-go=licao]'); pg.wait_for_selector('.item')
        n = pg.evaluate("document.querySelector('.meta').innerText"); 
    # lição sem itens
    pg.goto(URL + '?hoje=2026-11-03#/licao/POR-01-03'); pg.wait_for_selector('h1')
    check('ainda não foram publicados' in pg.inner_text('main'), 'lição sem itens avisa')
    pg.click('[data-act=feita]'); pg.wait_for_timeout(300)
    check('Concluída' in pg.inner_text('main'), 'marcar lição como estudada')
    # tour: todos os tipos
    pg.goto(URL + '?hoje=2026-11-03#/licao/TOUR-01'); pg.wait_for_selector('h1')
    pg.screenshot(path='tools/shots/licao.png', full_page=True)
    pg.click('[data-go=licao]'); pg.wait_for_selector('.item')
    pg.click('[data-act=ce][data-v="C"]'); pg.wait_for_selector('.fb.certo')
    check(True, 'C/E correto'); pg.screenshot(path='tools/shots/feedback.png', full_page=True)
    nxt(); pg.click('[data-act=ce][data-v="C"]'); pg.wait_for_selector('.fb.errado'); nxt()
    pg.click('[data-act=mc][data-k="2"]'); pg.wait_for_selector('.fb.certo'); nxt()
    pg.click('[data-act=mc][data-k="0"]'); pg.wait_for_selector('.fb.errado'); nxt()
    res = pg.inner_text('main'); check('2/4' in res, 'resultado com nota na regra da prova: ' + re.sub(r'\s+', ' ', res)[:140])
    # TOUR-02: ordenar, lacuna, flashcard
    pg.goto(URL + '?hoje=2026-11-03#/licao/TOUR-02'); pg.click('[data-go=licao]'); pg.wait_for_selector('#ordOpc')
    ordem = ['Palmas (arbitragem de Cleveland), 1895', 'Amapá (Conselho Federal Suíço), 1900', 'Tratado de Petrópolis (Acre), 1903', 'Pirara (rei da Itália), 1904']
    for o in ordem: pg.click(f'#ordOpc button:has-text("{o[:12]}")')
    pg.click('#ordOk'); pg.wait_for_selector('.fb.certo'); check(True, 'ordenar correto'); nxt()
    pg.fill('#resp', '0.25'); pg.click('[data-act=lac]'); pg.wait_for_selector('.fb.certo'); check(True, 'lacuna aceita 0.25'); nxt()
    pg.click('[data-act=virar]'); pg.click('[data-act=auto][data-v="1"]'); pg.wait_for_selector('.fb.certo'); nxt()
    pg.click('[data-act=virar]'); pg.click('[data-act=auto][data-v="0"]'); pg.wait_for_selector('.fb.errado'); nxt()
    check('Sessão concluída' in pg.inner_text('h1'), 'fim da sessão')
    # erros e revisão (dia seguinte)
    pg.goto(URL + '?hoje=2026-11-03#/erros'); pg.wait_for_selector('h1')
    check('Refazer' in pg.inner_text('main'), 'caderno de erros tem itens')
    pg.goto(URL + '?hoje=2026-11-04#/revisao'); pg.wait_for_selector('h1')
    check('Ortografia' in pg.inner_text('main') or 'Acordo' in pg.inner_text('main') or 'Grafias' in pg.inner_text('main'), 'revisão D+1 aparece')
    pg.goto(URL + '?hoje=2026-11-06#/'); pg.wait_for_selector('h1')  # sexta
    pg.goto(URL + '?hoje=2026-11-09#/revisao'); pg.wait_for_selector('h1')  # +3 dias de estudo não; checa só render
    # atraso
    pg.goto(URL + '?hoje=2026-12-01#/'); pg.wait_for_selector('h1'); check('atrasada' in pg.inner_text('main'), 'atraso sinalizado em ciclo posterior')
    pg.screenshot(path='tools/shots/atraso.png', full_page=True)
    pg.goto(URL + '#/rota/HBR'); pg.wait_for_selector('h1'); pg.screenshot(path='tools/shots/rota.png', full_page=True)
    # backup roundtrip
    pg.goto(URL + '#/mais'); pg.wait_for_selector('h1')
    with pg.expect_download() as d: pg.click('[data-act=exportar]')
    path = d.value.path(); bk = json.load(open(path)); check(bk['app'] == 'rota-cacd' and 'POR-01-03' in bk['progresso']['licoes'], 'backup exporta progresso')
    pg.screenshot(path='tools/shots/mais.png', full_page=True)
    # offline
    ctx.set_offline(True); pg.goto(URL + '?hoje=2026-11-03#/'); pg.wait_for_selector('html[data-pronto]', timeout=8000)
    check('Ciclo 1' in pg.inner_text('h1'), 'abre offline')
    pg.goto(URL + '?hoje=2026-11-03#/rota/DIR'); pg.wait_for_selector('h1'); check('Direito' in pg.inner_text('h1'), 'rota offline')
    ctx.set_offline(False)
    # dados 737
    n = pg.evaluate("fetch('data/packs/core-1.0.0.json').then(r=>r.json()).then(j=>j.licoes.length)"); check(n == 737, f'737 lições ({n})')
    # sem erros de console (ignora falhas de rede offline)
    real = [l for l in logs if 'Failed to load resource' not in l and 'ERR_INTERNET' not in l]
    check(not real, 'sem erros de console: ' + str(real[:3]))
    # visual escuro desktop
    c2 = b.new_context(viewport={'width': 1100, 'height': 800}, color_scheme='dark'); p2 = c2.new_page()
    p2.goto(URL + '?hoje=2026-11-03'); p2.wait_for_selector('html[data-pronto]'); p2.screenshot(path='tools/shots/hoje-escuro.png')
    b.close()
print('\nRESULTADO:', 'tudo certo' if not erros else f'{len(erros)} falha(s)'); sys.exit(1 if erros else 0)
