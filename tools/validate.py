#!/usr/bin/env python3
"""Valida manifest, hashes e esquema dos pacotes. Uso: python3 tools/validate.py"""
import json, hashlib, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); D = os.path.join(ROOT, 'data')
err = []
man = json.load(open(os.path.join(D, 'manifest.json')))
lic = {}; itens_ids = set()
TIPOS = {'certo_errado','multipla_escolha','ordenar','lacuna','associar','flashcard','resposta_curta','discursiva','traducao','resumo'}
def need(c, m):
    if not c: err.append(m)
for e in man['pacotes']:
    raw = open(os.path.join(D, e['arquivo']), 'rb').read()
    need(hashlib.sha256(raw).hexdigest() == e['sha256'], f"sha256 diferente: {e['id']}")
    p = json.loads(raw); need(p['version'] == e['version'], f"versão diferente: {e['id']}")
    for l in p.get('licoes', []):
        need(l['id'] not in lic, f"lição repetida {l['id']}"); lic[l['id']] = l
for e in man['pacotes']:
    p = json.load(open(os.path.join(D, e['arquivo'])))
    for l in p.get('licoes', []):
        need(not l['pre'] or l['pre'] in lic, f"pré-requisito inexistente em {l['id']}")
    for lid, v in (p.get('itens') or {}).items():
        need(lid in lic, f"itens para lição inexistente {lid}")
        need(v.get('status') in ('rascunho', 'verificado'), f"status inválido em {lid}")
        for it in v['itens']:
            need(it['id'] not in itens_ids, f"item repetido {it['id']}"); itens_ids.add(it['id'])
            need(it['tipo'] in TIPOS, f"tipo desconhecido {it['id']}")
            need(bool(it.get('fonte')), f"item sem fonte {it['id']}")
            t = it['tipo']
            if t == 'certo_errado': need(it['gabarito'] in 'CE', f"gabarito C/E {it['id']}")
            if t == 'multipla_escolha': need(0 <= it['gabarito'] < len(it['opcoes']), f"gabarito mc {it['id']}")
            if t == 'ordenar': need(len(it['ordem']) >= 2, f"ordem {it['id']}")
            if t == 'lacuna': need(bool(it['aceitas']), f"aceitas {it['id']}")
core = json.load(open(os.path.join(D, man['pacotes'][0]['arquivo'])))
if core['id'] == 'core':
    need(len(core['licoes']) == 737 and len(core['ciclos']) == 64 and len(core['desafios']) == 64, 'contagens do core')
print('ERROS:' if err else 'validação ok', *err, sep='\n'); sys.exit(1 if err else 0)
