# Rota CACD

App de estudos offline (PWA) para o concurso do Instituto Rio Branco (CACD). Trilha de 737 lições em 64 ciclos de 14 dias, de 02/11/2026 a 15/04/2029, com desafio ao fim de cada ciclo, revisão espaçada e caderno de erros.

**Estado: etapa 1.** Estão no app a trilha completa, o calendário e um tour com exercícios de demonstração. Os exercícios de cada lição entram na etapa 2, em pacotes de conteúdo (`items-T1`, `items-T2`…), todos marcados como `rascunho` até revisão humana.

## Como funciona
- Sem servidor e sem conta. Tudo roda no navegador; o progresso fica no aparelho (IndexedDB).
- Funciona offline depois da primeira abertura (service worker).
- Calendário flexível: todos os ciclos ficam abertos; o ciclo de hoje é destacado e lições atrasadas são sinalizadas.
- Revisão espaçada em dias de estudo (segunda a sexta, sem feriados): 1, 3, 7, 15 e 30.
- Backup: Mais › Baixar backup / Importar backup. Importar guarda uma cópia do progresso anterior.
- `?hoje=AAAA-MM-DD` na URL simula outra data (usado nos testes).

## Pacotes de conteúdo
`data/manifest.json` lista os pacotes, com versão e SHA-256. O app compara o manifesto, baixa o que for novo, confere o hash e guarda no aparelho, sem apagar o progresso.

| tipo | conteúdo |
|---|---|
| `core` | matérias, lições, ciclos, desafios, trimestres, feriados |
| `demo` | lições do tour e itens de exemplo |
| `items` | `itens: { "<id da lição>": { resumo, status, itens: [...] } }`; campo opcional `liberar_em` (AAAA-MM-DD) esconde o pacote até a data |

Tipos de item: `certo_errado`, `multipla_escolha`, `ordenar`, `lacuna`, `associar`, `flashcard`, `resposta_curta`, `discursiva`, `traducao`, `resumo`. Todo item precisa de `fonte`. Itens com `fala: {texto, lang}` ganham botão “Ouvir” (voz do aparelho).

## Desenvolvimento
```
python3 tools/build.py      # gera data/packs e data/manifest.json a partir de tools/*.csv e sched.json
python3 tools/validate.py   # confere hashes e esquema
python3 -m http.server 8765 # servir localmente
python3 tools/test_e2e.py   # testes com Playwright (precisa do servidor)
```
Fontes: Literata e Atkinson Hyperlegible (OFL-1.1, ver `fonts/`).

## Aviso
Tópicos e datas vêm do Edital nº 1/2026 (Cebraspe) e de fontes secundárias. Confira o texto oficial. A data da prova (abril de 2029) é uma hipótese de planejamento.
