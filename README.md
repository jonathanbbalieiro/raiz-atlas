# Raiz: atlas dos parques nacionais do Brasil

Junção de dois projetos:

- **Base técnica** (antigo "Maravilhas Naturais"): mapa MapLibre persistente,
  limites reais dos 77 parques (ICMBio/IBGE), fotos verificadas de 66 parques e
  páginas estáticas por nível.
- **Camada editorial** (Raiz v1.0-alpha): **Expedições** (reportagem longa com
  fontes por momento), **dossiês de pesquisa** de 15 parques (53 descobertas
  com fonte primária e divergências documentadas) e a regra de que rascunho
  nunca vai para produção.

## Expedições

- Arquivo: `data/br/parks/<parque>/expedition.json` (abertura, 1 a 5
  momentos, no máximo uma linha do tempo, encerramento e fontes).
- URL: `/br/<uf>/<parque>/expedicao`. HTML estático e indexável; a leitura
  ocupa o painel alargado e o mapa continua ao lado, no parque.
- **Rascunhos** (`"approved": false`) aparecem só no `npm run dev`, com aviso
  de prévia e `noindex`. O `npm run build` os exclui. Para um deploy de
  revisão, defina `RAIZ_PREVIEW_DRAFTS=1`.
- `npm run check:content` valida expedições e dossiês (fontes existentes,
  créditos das fotos, hosts permitidos, parágrafos repetidos, status x
  aprovação). Roda sozinho antes de todo build.

Estado atual: 49 Expedições em rascunho (4 a 5 momentos, "Em números", glossário e citações com página), nenhuma aprovada.

## Guia de cada parque

Os 77 parques têm um guia em rascunho (`guide.json`): frase de encanto, o que
protege, maravilhas com foto, curiosidades, histórias e espécies-símbolo, tudo
com fonte. Mais "Quem vive aqui": levantamento de fauna e flora dentro do
limite do parque (`npm run bio`, GBIF + Wikidata, nunca editar à mão).
Manual de redação e rigor: [docs/GUIA_EDITORIAL.md](docs/GUIA_EDITORIAL.md).
Guias em rascunho só aparecem em `npm run dev` ou com `RAIZ_PREVIEW_DRAFTS=1`;
um guia vira público quando um revisor muda `status` para `"revisado"`.

## Publicação

Veja [docs/PUBLICACAO.md](docs/PUBLICACAO.md): hospedagem, domínio, passo a passo e lista de conferência.

## Dossiês de pesquisa

`data/br/parks/<parque>/research.json`: aparecem na ficha do parque como
"Histórias do território", com link da fonte em cada descoberta.

---

Mapa interativo com **todos os 77 parques nacionais** do Brasil (cadastro do
ICMBio), do macro ao micro:

**país → estado → parque nacional → atração**

Cada nível tem URL própria, página estática indexável (SEO/Open Graph) e uma
lista navegável por teclado como alternativa ao mapa.

## Experiência ("atlas digital contemporâneo")

- **Enquadramento calculado**: o mapa abre no Brasil inteiro (incluindo os
  parques oceânicos, como Fernando de Noronha), descontando a área do painel,
  da barra superior e dos filtros. Projeção plana, sem repetição do mundo.
- **Mapa de base reestilizado**: oceano cinza-azulado, vizinhos em cinza-bege,
  Brasil levemente iluminado, contorno nacional verde-escuro. Na visão
  nacional não há estradas nem cidades pequenas: os parques são o destaque.
- **Parques**: polígonos translúcidos na cor do bioma, marcadores pequenos com
  área de toque maior e agrupamentos claros (aro verde, número) que se
  recalculam com zoom e filtros. Tooltip curto (nome, bioma, UFs).
- **Controles**: aproximar, afastar, visão do Brasil e recentralizar (aparece
  quando o usuário move o mapa). Sempre fora do painel e dos filtros.
- **Painel em três estados**: Brasil (números da base, biomas, lista de
  estados), estado (contagem, distribuição por bioma, parques) e parque
  (foto, dados oficiais, fotos, guia, espécies, quiz, parques próximos). Recolhível no
  desktop/tablet; bottom sheet de 3 alturas no celular.
- **Fechar (X)** no parque e na atração, e tecla Esc: volta para onde o
  usuário estava (visão geral ou estado).
- **Fotos**: faixa com setas e visualizador em tela cheia (setas, teclado,
  deslizar, contador e crédito de cada foto).
- **Busca** (`/` ou `Ctrl/⌘+K`) com sugestões logo abaixo da barra, sem
  acentos/maiúsculas, parques e estados diferenciados, navegação por teclado.
- **Filtros por bioma** combináveis, com "Mostrando X de N", limpar filtros e
  estado vazio útil. Valem para mapa, agrupamentos, listas e Surpreenda-me.
- **Relevo 3D dentro do parque** (inclinação moderada); só é baixado nesse nível.
- `prefers-reduced-motion` desliga os voos de câmera e as animações.

## Rodar localmente

Requer Node.js 20 ou superior.

As fontes DM Sans e Fraunces são servidas localmente a partir dos pacotes
Fontsource fixados no lockfile (SIL OFL); o build não consulta o Google Fonts.

```bash
npm install
```

```bash
npm run dev
```

Abra http://localhost:3000 (ou a porta que o terminal indicar). Os dados já
gerados estão versionados. Só rode os pipelines de novo para atualizar:

```bash
npm run geo
```

```bash
npm run media
```

- `geo` baixa os limites (IBGE) e todos os parques nacionais (ICMBio),
  simplifica e grava `public/geo/` e `data/<país>/parks.generated.json`.
- `media` busca fotos (Wikidata/Wikimedia Commons) e o link da Wikipédia de
  cada parque. Só entram licenças de uso comercial (CC0, domínio público,
  CC BY, CC BY-SA) e fotos sem menção a mapas ou ao lado de outro país.

Build de produção (pré-renderiza todas as páginas como HTML estático):

```bash
npm run build && npm start
```

Verificações de manutenção:

```bash
npm test
npm run lint
npm run audit:photos
npm run check:publication
```

Veja os [critérios de fotos e espécies](docs/CURADORIA_FOTOGRAFICA.md) e a
[fila fotográfica por parque](docs/audits/fotos-atual/LEIA-ME.md).

A busca aceita nome, UF e bioma combinados, como `Chapada GO` ou `Cerrado`.
Em “Quem vive aqui”, pesquise pelo nome popular, científico ou família; a aba
“Todas” reúne a seleção dos grupos e das ameaçadas sem duplicar espécies.
O filtro de fotografias é opcional e não altera os critérios do levantamento.
Clique em uma foto de espécie para ampliá-la no próprio site, com créditos e
contexto; Escape fecha o visualizador e devolve o foco ao botão de origem.

Os acessos “Animais” e “Plantas” levam às seleções por grupo. Em “Sobre esta
espécie”, consulte família, registros, categoria de conservação e fontes.
Os [critérios de evidência de fauna e flora](docs/FAUNA_FLORA.md) explicam os
limites dessas informações e das consultas ao GBIF.

## Deploy na Vercel

1. Suba o projeto para um repositório Git.
2. Na Vercel: **Add New → Project** e importe o repositório (Next.js é detectado).
3. Em **Settings → Environment Variables**, defina `NEXT_PUBLIC_SITE_URL` com a
   URL final. Ela é usada nas URLs canônicas, no sitemap e no Open Graph.
4. Deploy.

Não há chaves de API nem serviços pagos.

### O que vai ao ar

O build de produção publica: mapa, ficha dos 77 parques, "Quem vive aqui"
(fauna e flora), dossiês de pesquisa e atrações. **Guias e Expedições em
rascunho ficam de fora** até a revisão editorial:

```bash
npm run approve -- guide --all                       # ou slugs específicos
npm run approve -- expedition iguacu fernando-de-noronha
npm run build
```

Para publicar tudo como rascunho num deploy de revisão, defina
`RAIZ_PREVIEW_DRAFTS=1` na Vercel (as Expedições saem com `noindex`).
As fotos vêm direto do Wikimedia Commons, com crédito e licença em cada uma.

## Arquitetura

```
src/
  app/(explore)/layout.tsx          ExploreShell + índice compacto (uma vez)
  app/(explore)/page.tsx            abertura: o país em números e destaques
  app/(explore)/[country]/[[...path]]/page.tsx   todos os níveis (SSG)
  components/shell/                 casca: painel, busca, filtro, preview, surpresa
  components/map/MapView.tsx        MapLibre: globo, camadas, terreno 3D, câmera
  components/map/layers.ts          fontes e camadas
  components/map/focus.tsx          estado compartilhado (foco, filtro, destaque)
  components/views/                 conteúdo do painel por nível
  lib/data/                         tipos, interface do repositório, JSON
scripts/build-geo.mjs               limites e parques (IBGE, ICMBio)
scripts/fetch-park-media.mjs        fotos e Wikipédia
```

**Carregamento.**
- Na entrada: estados (TopoJSON, cerca de 11 KB), todos os parques em geometria
  leve (cerca de 71 KB) e o índice compacto embutido no HTML.
- Ao entrar num parque: a geometria detalhada dele (cerca de 20 KB em média) e o
  relevo.
- `maplibre-gl` e `topojson-client` são importados sob demanda.
- Links e áreas do mapa sob o cursor são pré-carregados.

**URL canônica de parques interestaduais.** Um parque que cruza divisas aparece
na lista de cada estado, mas tem uma única URL: a do estado que contém o ponto
interno do polígono. Exemplo: Emas fica em `/br/go/emas`, e na lista de MS
aparece "também MS". Parques marinhos ficam com a primeira UF do cadastro.

**Trocar JSON por banco.** Implemente `PlaceRepository` (ex.: Supabase/PostGIS) e
troque a instância em `src/lib/data/index.ts`.

**Outro país.** Crie `data/<iso2>/country.json` e `admin1.json`, adicione um
provedor em `scripts/build-geo.mjs` (Natural Earth para o mundo) e rode
`npm run geo`.

## Dados

```
data/br/admin1.json                          27 UFs
data/br/parks.generated.json                 77 parques (cadastro ICMBio)
data/br/park-media.generated.json            fotos e Wikipédia
data/br/parks/<parque>/park.json             texto editorial opcional
data/br/parks/<parque>/attractions/*.json    atrações (o nível "micro")
```

A descrição curta de cada parque é **montada só com fatos do cadastro**: ano de
criação, área, biomas e estados. Um `park.json` pode substituí-la por texto
editorial. Qualquer fato não confirmado em fonte fica como `"A_VERIFICAR"`.

**Atrações:** por ora só a Chapada dos Veadeiros tem atrações detalhadas
(Saltos do Rio Preto, Cânion II, Cachoeira das Cariocas), com fontes. Os demais
parques mostram "Ainda estamos detalhando as atrações". Esse é o próximo passo
editorial, parque a parque.

**Fotos:** 66 dos 77 parques têm foto verificada. Os outros recebem uma capa
gráfica no tom do bioma, com curvas de nível.

## Licenças

| Item | Licença |
| --- | --- |
| Next.js, React, Tailwind CSS | MIT |
| TypeScript | Apache-2.0 |
| MapLibre GL JS | BSD-3-Clause |
| topojson-client | ISC |
| mapshaper (só no build) | MPL-2.0 |
| Inter, Fraunces | SIL Open Font License |
| OpenFreeMap / OpenMapTiles / OpenStreetMap (mapa de fundo) | gratuito; dados ODbL, atribuição no mapa e no painel |
| Terrain Tiles (AWS Open Data / Mapzen), relevo 3D | dados abertos; atribuição exibida |
| IBGE (limites) e ICMBio (parques) | dados públicos; fonte citada |
| Wikidata | CC0 |
| Fotos do Wikimedia Commons | CC0, domínio público, CC BY ou CC BY-SA; autor e licença junto de cada foto |
| Natural Earth (futuro) | domínio público |

## Ainda não medido

- Nota do Lighthouse (meça na URL da Vercel).
- Desempenho do relevo 3D em celulares modestos. Ainda não há queda automática
  para 2D; é uma melhoria possível.
