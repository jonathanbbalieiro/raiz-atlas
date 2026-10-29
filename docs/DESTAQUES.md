# Como escolhemos os destaques de fauna e flora

Cada parque tem de 1 a 6 destaques (`guide.flagships`). O levantamento do GBIF mostra o que foi **registrado**;
os destaques dizem o que **caracteriza o lugar**. Os dois não coincidem: o GBIF pesa a coleta científica
(herbários favorecem plantas pequenas e pouco conhecidas), então o buriti da Chapada dos Veadeiros tem 11
registros e a *Microlicia* tem 157. Por isso o destaque é uma decisão editorial, feita com várias fontes.

## Onde procurar candidatos
1. `npm run flagship:candidates` (arquivo `.geo-cache/flagship/<slug>.json`): espécies mais observadas no
   iNaturalist na caixa do parque, por grupo (reflete o que as pessoas veem), plantas mais registradas no GBIF
   sem exigir nome popular ou foto, levantamento atual e ameaçadas.
2. Fontes de contexto, **além do plano de manejo**: página do parque e fichas do ICMBio, Flora e Funga do
   Brasil (distribuição e endemismo), CNCFlora, SALVE, Lista Vermelha da IUCN, checklists e artigos
   científicos sobre a área, universidades, Embrapa, secretarias de meio ambiente, imprensa especializada
   (O Eco, Mongabay) e conhecimento local indicado por quem conhece o parque, que sempre precisa de uma
   fonte citável para entrar.
3. Cuidado com a caixa do iNaturalist: ela pode incluir o entorno. Confirmar a presença no parque (ou na
   região de forma explícita) em uma fonte.

## Critérios (ao menos um por destaque, campo `criteria`)
| Valor | Quando usar |
|---|---|
| `endemica` | ocorre só na região/bioma ou tem distribuição restrita documentada |
| `ameacada_com_acao` | ameaçada **e** há fonte ligando a espécie à proteção deste parque. Ameaça global, sozinha, não basta |
| `habitat_critico` | depende de um ambiente que o parque protege (veredas, campos rupestres, restinga...) |
| `papel_ecologico` | dispersora, polinizadora, predadora de topo, espécie-chave, documentado |
| `icone_da_paisagem` | define o que o visitante vê (buriti nas veredas, araucária, mangue, arara-canindé nos buritizais) |
| `cultural` | uso tradicional ou relação cultural sustentada por fonte |

## Regras
- **Até 6 por parque.** Quatro a seis quando há evidência; menos quando não há. Não encher.
- **Variedade:** ao menos uma planta quando houver fonte, e grupos diferentes (ave, mamífero, planta, etc.).
- **Duas fontes ou mais por destaque**, https, sem Wikipédia. Uma delas **não** pode ser o plano de manejo,
  quando existir outra. Uma fonte sustenta a presença na área; outra, o motivo de ser característica.
- **Justificativa específica** (80 a 420 caracteres): o fato que liga a espécie *a este parque*. Nada de
  "ave vulnerável registrada no parque". Se o mesmo texto serve a outro parque, está fraco.
- **Espécie nativa.** Introduzidas não entram.
- Não chamar de "símbolo oficial" sem fonte.
- Cada espécie que entra deve ter foto livre (`npm run photo:flagships`) e categoria IUCN preenchida
  (`npm run iucn:flagships`, depois `node scripts/fill-flagship-iucn.mjs --apply`), para o perfil não mostrar "Sem avaliação" quando existe avaliação.

## Ferramentas
- `node scripts/flagship-candidates.mjs [slug ...]`: gera os candidatos.
- `node scripts/apply-flagships.mjs <arquivo.json> [--apply]`: valida e grava a escolha em `guide.json`.
