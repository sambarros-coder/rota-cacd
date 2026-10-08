#!/usr/bin/env python3
"""Gera data/packs/*.json e data/manifest.json a partir do plano (CSV v2 + sched.json)."""
import csv, json, hashlib, os, re, datetime as dt
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'data'); PK = os.path.join(OUT, 'packs')
CORE_V = '1.0.0'; DEMO_V = '1.0.0'; CICLOS = [(1, '1.0.0'), (2, '1.0.0')]   # (n do ciclo, versão do pacote); aumente a versão ao corrigir conteúdo

MAT = [('POR','Língua Portuguesa'),('ING','Língua Inglesa'),('HBR','História do Brasil'),('HMU','História Mundial'),
       ('GEO','Geografia'),('POL','Política Internacional'),('ECO','Economia'),('DIR','Direito'),
       ('ESP','Língua Espanhola'),('FRA','Língua Francesa')]
N2S = {n: s for s, n in MAT}

def easter(y):
    a=y%19;b=y//100;c=y%100;d=b//4;e=b%4;f=(b+8)//25;g=(b-f+1)//3;h=(19*a+b-d-g+15)%30;i=c//4;k=c%4;l=(32+2*e+2*i-h-k)%7;m=(a+11*h+22*l)//451
    mo=(h+l-7*m+114)//31; da=((h+l-7*m+114)%31)+1; return dt.date(y,mo,da)
def holidays(y):
    s={dt.date(y,m,d) for m,d in [(1,1),(4,21),(5,1),(9,7),(10,12),(11,2),(11,15),(11,20),(12,25)]}
    e=easter(y); s.add(e-dt.timedelta(days=2)); s.add(e+dt.timedelta(days=60)); return s

def write(name, obj):
    s = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
    p = os.path.join(PK, name); open(p, 'w', encoding='utf-8').write(s)
    return {'arquivo': 'packs/' + name, 'sha256': hashlib.sha256(s.encode('utf-8')).hexdigest(), 'bytes': len(s.encode('utf-8'))}

def core():
    rows = list(csv.DictReader(open(os.path.join(HERE, 'plano_cacd_licoes_v2.csv'), encoding='utf-8-sig')))
    sch = json.load(open(os.path.join(HERE, 'sched.json'), encoding='utf-8'))
    tri = list(csv.DictReader(open(os.path.join(HERE, 'trimestres.csv'), encoding='utf-8')))
    lic = []
    for r in rows:
        lic.append({'id': r['id'], 'm': r['id'].split('-')[0], 'mn': int(r['modulo_num']), 'mod': r['modulo'], 'un': r['unidade'],
                    'n': int(r['licao_num']), 't': r['licao_titulo'], 'o': r['objetivo'], 'ed': r['topico_edital'], 'nv': r['nivel'],
                    'c': int(r['ciclo']), 'tr': r['trimestre'], 'fp': r['fase_prova'], 'ex': r['tipos_exercicio'].split(';'),
                    'pre': r['prerequisito_id'], 'ref': r['referencia'], 'min': int(r['minutos'])})
    ciclos = [{'c': c['ciclo'], 'ano': c['ano'], 'tr': c['trimestre'], 'ini': c['inicio'], 'fim': c['fim'], 'des': c['data_desafio'],
               'n': c['licoes'], 'min': c['minutos']} for c in sch['cycles']]
    des = []
    for d in sch['chals']:
        foco = [s for s, n in MAT if n in (d.get('foco') or '')]
        des.append({'c': d['ciclo'], 'data': d['data_desafio'], 'tipo': d['tipo'], 'desc': d['descricao'], 'ce': d['itens_ce'],
                    'disc': d['discursivas'], 'dur': d['duracao_min'], 'foco': foco, 'rev': d['revisao'], 'obs': d.get('observacao', '')})
    trs = [{'id': t['trimestre'], 'ci': int(t['ciclo_ini']), 'cf': int(t['ciclo_fim']), 'ini': t['inicio'], 'fim': t['fim'], 'ano': int(t['ano']), 'fase': t['fase']} for t in tri]
    hol = sorted(d.isoformat() for y in range(2026, 2031) for d in holidays(y))
    return {'schema': 1, 'type': 'core', 'id': 'core', 'version': CORE_V, 'inicio_plano': '2026-11-02',
            'materias': [{'s': s, 'nome': n} for s, n in MAT], 'trimestres': trs, 'ciclos': ciclos, 'desafios': des,
            'feriados': hol, 'licoes': lic}

def demo():
    ce = lambda i, e, g, x, f='Edital CACD 2026 (Cebraspe)': {'id': i, 'tipo': 'certo_errado', 'enunciado': e, 'gabarito': g, 'explicacao': x, 'fonte': f}
    tour_lessons = [
        {'id': 'TOUR-01', 'm': 'TOUR', 'mn': 1, 'mod': 'Conheça o app', 'un': 'Demonstração', 'n': 1, 't': 'Como funciona a prova de 1ª fase',
         'o': 'Entender a pontuação Certo/Errado e quando vale a pena chutar.', 'ed': '-', 'nv': 'Básico', 'c': 0, 'tr': 'T0', 'fp': '1ª', 'ex': ['certo_errado','multipla_escolha'],
         'pre': '', 'ref': 'Edital nº 1/2026 – CACD (Cebraspe), subitem 5.13.2', 'min': 5},
        {'id': 'TOUR-02', 'm': 'TOUR', 'mn': 1, 'mod': 'Conheça o app', 'un': 'Demonstração', 'n': 2, 't': 'Ordenar, completar e cartões',
         'o': 'Experimentar os outros tipos de exercício.', 'ed': '-', 'nv': 'Básico', 'c': 0, 'tr': 'T0', 'fp': '1ª', 'ex': ['ordenar','lacuna','flashcard'],
         'pre': 'TOUR-01', 'ref': '', 'min': 5},
    ]
    items = {
      'TOUR-01': {'resumo': 'Na 1ª fase, cada item é Certo ou Errado. Acerto vale +1, erro vale −0,25 e item em branco vale 0. A prova tem 240 itens em 8 disciplinas.', 'status': 'verificado', 'itens': [
        ce('TOUR-01#01','Na 1ª fase do CACD 2026, um item respondido de forma errada desconta 0,25 ponto.','C','Pela regra do edital, +1 por acerto, −0,25 por erro e 0 para item em branco ou com marcação dupla.'),
        ce('TOUR-01#02','Um item deixado em branco desconta 0,25 ponto.','E','Item em branco vale 0. Só o erro desconta.'),
        {'id':'TOUR-01#03','tipo':'multipla_escolha','enunciado':'Quantos itens tem a prova de 1ª fase?','opcoes':['120','180','240','300'],'gabarito':2,'explicacao':'A 1ª fase tem 240 itens Certo/Errado.','fonte':'Edital nº 1/2026 – CACD'},
        {'id':'TOUR-01#04','tipo':'multipla_escolha','enunciado':'A partir de qual probabilidade de acerto vale a pena marcar um item no escuro?','opcoes':['10%','20%','50%','75%'],'gabarito':1,'explicacao':'Com +1 e −0,25: p − 0,25(1 − p) = 0 dá p = 20%. Acima disso, o valor esperado de marcar é positivo.','fonte':'Cálculo a partir da regra de pontuação do edital'},
      ]},
      'TOUR-02': {'resumo': 'Três outros tipos de exercício: ordenar eventos, completar lacunas e cartões de revisão.', 'status': 'verificado', 'itens': [
        {'id':'TOUR-02#01','tipo':'ordenar','enunciado':'Ponha em ordem cronológica as soluções das questões de fronteira.','ordem':['Palmas (arbitragem de Cleveland), 1895','Amapá (Conselho Federal Suíço), 1900','Tratado de Petrópolis (Acre), 1903','Pirara (rei da Itália), 1904'],'explicacao':'Palmas 1895 → Amapá 1900 → Petrópolis 1903 → Pirara 1904.','fonte':'Exemplo de demonstração; ver HBR-06-43'},
        {'id':'TOUR-02#02','tipo':'lacuna','enunciado':'Na 1ª fase, a pontuação por erro é −___ ponto.','aceitas':['0,25','0.25','1/4','um quarto'],'explicacao':'O erro desconta 0,25 ponto.','fonte':'Edital nº 1/2026 – CACD'},
        {'id':'TOUR-02#03','tipo':'flashcard','frente':'Quantas disciplinas tem a 1ª fase?','verso':'Oito: Português, Inglês, História do Brasil, História Mundial, Geografia, Política Internacional, Economia e Direito.','explicacao':'','fonte':'Edital nº 1/2026 – CACD'},
        {'id':'TOUR-02#04','tipo':'flashcard','frente':'Qual disciplina cai só na 1ª fase?','verso':'História Mundial.','explicacao':'','fonte':'Edital nº 1/2026 – CACD'},
      ]},
      'HBR-06-43': {'resumo': 'Rio Branco resolveu as principais questões de fronteira por arbitragem e negociação: Palmas (1895), Amapá (1900), Acre (1903) e Pirara (1904).', 'status': 'rascunho', 'itens': [
        ce('HBR-06-43#01','A questão de Palmas foi decidida por arbitragem do presidente norte-americano Cleveland, em 1895, em favor do Brasil.','C','Laudo Cleveland (1895), favorável ao Brasil.','Rubens Ricupero, Rio Branco: o Brasil no Mundo'),
        ce('HBR-06-43#02','A questão do Amapá foi arbitrada pelo Conselho Federal Suíço, em 1900, com resultado favorável ao Brasil.','C','Laudo suíço de 1900, favorável ao Brasil.','Rubens Ricupero, Rio Branco: o Brasil no Mundo'),
        ce('HBR-06-43#03','O Tratado de Petrópolis (1903) incorporou o Acre sem qualquer compensação à Bolívia.','E','Houve compensação, incluindo a construção da ferrovia Madeira-Mamoré.','Rubens Ricupero, Rio Branco: o Brasil no Mundo'),
        ce('HBR-06-43#04','A arbitragem do rei da Itália sobre Pirara (1904) foi favorável ao Brasil.','E','O laudo favoreceu a Grã-Bretanha; Joaquim Nabuco defendeu o Brasil.','Rubens Ricupero, Rio Branco: o Brasil no Mundo'),
      ]},
    }
    # linhas do tempo do tour referenciam HBR-06-43
    des = {'c': 0, 'data': '', 'tipo': 'Desafio de demonstração', 'desc': '4 itens Certo/Errado do tour', 'ce': 4, 'disc': 0, 'dur': 5, 'foco': [], 'rev': '', 'obs': 'Mostra como será o desafio de cada ciclo.',
           'itens_de': ['TOUR-01']}
    return {'schema': 1, 'type': 'demo', 'id': 'demo', 'version': DEMO_V, 'materias': [{'s': 'TOUR', 'nome': 'Tour do app'}],
            'licoes': tour_lessons, 'itens': items, 'desafio_demo': des}

def itens_pack(pasta, pid, versao):
    import glob
    licoes = {}
    for f in sorted(glob.glob(os.path.join(ROOT, 'content', pasta, '*.json'))):
        licoes.update(json.load(open(f, encoding='utf-8'))['licoes'])
    return {'schema': 1, 'type': 'items', 'id': pid, 'version': versao, 'itens': licoes}

if __name__ == '__main__':
    os.makedirs(PK, exist_ok=True)
    for f in os.listdir(PK): os.remove(os.path.join(PK, f))  # só regenera arquivos de build
    c = core(); d = demo()
    man = {'schema': 1, 'gerado_em': dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'pacotes': [
        dict(id='core', tipo='core', version=CORE_V, **write('core-%s.json' % CORE_V, c)),
        dict(id='demo', tipo='demo', version=DEMO_V, **write('demo-%s.json' % DEMO_V, d)),
        ] + [dict(id='items-C%02d' % n, tipo='items', version=V, **write('items-C%02d-%s.json' % (n, V), itens_pack('ciclo%02d' % n, 'items-C%02d' % n, V))) for n, V in CICLOS]}
    json.dump(man, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
    print(json.dumps(man, indent=1)); print(len(c['licoes']), 'lições', len(c['ciclos']), 'ciclos', len(c['desafios']), 'desafios')
