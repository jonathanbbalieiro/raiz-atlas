# Memória do projeto Raiz (raiz-atlas)

Reconstruída em 26/10/2026 a partir dos 6 históricos de sessão (20 a 24/10/2026) e do zip
`raiz-atlas-producao.zip`. Cole este arquivo na raiz do projeto como `CLAUDE.md`, ou anexe-o no
começo de uma conversa nova, para o Claude retomar com o contexto.

---

## 1. O que é

**Raiz: atlas dos parques nacionais do Brasil.** Mapa interativo dos 77 parques nacionais
(cadastro ICMBio), do macro ao micro: país → estado → parque → atração. Cada parque tem ficha
editorial, fauna e flora reais, fotos creditadas e uma **Expedição** (reportagem longa com fonte
por página). Site **sem fim comercial** (decisão do Jonathan em 23/10).

- Dono: Jonathan Balieiro, contato público `jonathanbalieiro@gmail.com` (rodapé e página "Sobre").
- Objetivo editorial: "encantar através da informação, de forma leve e dinâmica"; a escrita deve
  fazer as pessoas quererem visitar e preservar os parques (tom de revista de viagem).
- Todo texto do site em português do Brasil.

## 2. Origem

O projeto é a junção ("blend", 20/10) de dois trabalhos:
- **Maravilhas Naturais** (outra aba): base técnica com mapa MapLibre persistente, limites reais
  dos 77 parques (ICMBio/IBGE), fotos e páginas estáticas por nível.
- **Raiz v1.0-alpha** (`raiz-atlas-expedicoes-v10-completo.zip`): camada editorial com
  Expedições, 15 dossiês de pesquisa (53 descobertas) e a regra de que rascunho não vai para
  produção.

Em 22/10 chegou uma **v1.3.3** (`raiz-atlas-v1.3.3-curadoria-visual-completo.zip`), feita por outra
pessoa a partir do nosso pacote. Trazia 26 expedições novas abaixo do padrão. Em 23/10 o Jonathan
decidiu adotá-las: foram copiadas para o projeto e **reescritas no nosso padrão**.

## 3. Stack e arquitetura

- **Next.js 16.4.2** (Cache Components, Turbopack; o `AGENTS.md` avisa que essa versão difere do
  que o modelo conhece: ler `node_modules/next/dist/docs/` antes de mexer). React 19.3,
  Tailwind 4, TypeScript.
- **MapLibre GL**: na versão final, **v6.15** (atualizada em 23/10 para zerar uma vulnerabilidade
  crítica do `npm audit`). A v6 exige uma **cópia própria do worker** em `public/maplibre`, feita
  por script no build. O zip de 22/10 ainda está na v5.24.
- Site **estático** (SSG): sem banco, login, formulário ou cookies.
- Mapa persistente em `src/app/(explore)/layout.tsx`. Todos os níveis em
  `src/app/(explore)/[country]/[[...path]]/page.tsx`. Componentes em `src/components/{shell,map,views,nav,panel,seo}`.
- Dados em JSON via `JsonRepository` (`src/lib/data/`). Para trocar por banco, implementar
  `PlaceRepository`.
- Imagens: **loader próprio** (`src/lib/image-loader.ts`): o navegador pede a largura certa direto
  ao Wikimedia/iNaturalist, sem otimização de imagem do host.
- URL canônica de parque interestadual: a da UF que contém o ponto interno do polígono
  (ex.: Emas em `/br/go/emas`).

### Arquivos de dados por parque (`data/br/parks/<slug>/`)
| Arquivo | Conteúdo |
|---|---|
| `guide.json` | Guia: frase de encanto, abertura, o que protege, maravilhas (com foto), curiosidades, histórias, espécies-símbolo. Tipo `ParkGuide`. |
| `expedition.json` | Expedição schemaVersion 2: abertura, 4 a 5 momentos, "Em números" (`keyFacts`, até 6), glossário, linha do tempo, citações com página (`citations: {sourceId, locator}`), encerramento, `editorialNotes` (internas), `approved`. |
| `biodiversity.generated.json` | "Quem vive aqui": GBIF dentro do polígono + Wikidata/Commons + IUCN. **Nunca editar à mão**, gerar com `npm run bio`. |
| `research.json` | Dossiês de pesquisa (15 parques), aparecem como "Histórias do território". |
| `lost-world.json` | "Mundo perdido": extintas, extintas no local, reintroduzidas, megafauna fóssil (35 itens em 19 parques). |
| `attractions/*.json` | Atrações (só Chapada dos Veadeiros tem). |

Globais: `data/br/parks.generated.json` (cadastro), `data/br/park-media.generated.json` (capa e
galeria), `data/br/bio-exclusions.json` (espécies excluídas do levantamento).

## 4. Comandos

```bash
npm run dev                 # mostra rascunhos, com aviso de prévia
npm run build               # roda check:content antes; exclui rascunhos
npm run check:content       # validador de conteúdo (scripts/check-content.mjs)
npm run approve -- guide|expedition <slug...|--all>
npm run geo | media | bio   # pipelines (IBGE/ICMBio, fotos, biodiversidade)
npm run photo -- search "..." / file "File:..." "legenda"
npm run photo:flagships
npm run sources             # baixa PDFs (planos de manejo, decretos) para .geo-cache/sources/<slug>/
npm run src -- <slug> "termo"   # busca no texto extraído, mostra [p.N]
node scripts/upgrade-photo-resolution.mjs   # normaliza fotos para 1920 px (1280 nas espécies)
node scripts/warm-thumbs.mjs                # pré-aquece miniaturas no Commons (parou em 275/368)
node scripts/clean-biodiversity.mjs         # tira exóticas/cultivadas (Flora e Funga do Brasil)
node scripts/build-landcover-tiles.mjs      # gera os ladrilhos verdes do mapa (public/tiles)
npm run context -- <slug>       # entorno: UCs, terras indígenas, quilombos (docs/MAPA.md)
npm run occurrences -- <slug>   # grade de registros por espécie para o mapa (docs/MAPA.md)
```

npm run species-index           # índice "também registrada em" + valida/publica data/br/species-profiles.json
node scripts/fill-iucn.mjs [--apply]   # completa a categoria IUCN pelo GBIF (cache em .geo-cache/iucn-fill.json)
node scripts/flickr-geo-candidates.mjs <parque...> --out .geo-cache/flickr-geo   # candidatas de foto por coordenada

Perfis das espécies (29/10/2026): `data/br/species-profiles.json` (110 das 156 espécies-símbolo; resumo, hábitos,
história, curiosidades e fontes; Wikipédia proibida). Aparecem na página da espécie. Faltam 46 (sem segunda fonte
legível). Cartões de fauna e flora levam à espécie por `/biodiversidade#especie=<nome científico>`. O filtro
"Ameaçadas" e os selos usam a categoria IUCN (CR/EN/VU), não a lista `threatened`. Mundo perdido tem o tipo
`recolonizada` ("Voltou sozinha"). Maravilha sem foto reaproveita foto da galeria cuja legenda cite o lugar.
Decisão de 29/10: a revisão por povos indígenas/Funai não é mais pendência do projeto.

Mapa que acompanha a leitura (maravilhas numeradas, registros da espécie, entorno, Expedição):
piloto só na Chapada dos Veadeiros, em 27/10/2026. Formato, fontes e passos para expandir em
`docs/MAPA.md`.

- `RAIZ_PREVIEW_DRAFTS=1` publica rascunhos (só para deploy de revisão). **Não deixar `.env.local`
  com essa variável num build de produção**: em 22/10 isso fez o build gerar 165 páginas e estourar
  o limite de 60 s por página.
- `iniciar.bat` (Windows): instala, compila na primeira vez e abre `http://localhost:3000`.
- `.claude/launch.json`: `web` (dev, porta 3001) e `prod` (start, porta 3002).

## 5. Regras editoriais (não negociáveis)

Detalhe em `docs/GUIA_EDITORIAL.md`.

1. **Nenhum fato sem fonte.** Hierarquia: ICMBio (página, plano de manejo), decretos/CNUC, UNESCO,
   artigos e instituições de pesquisa, turismo estadual.
2. **Wikipédia: consultar, nunca citar** (pedido de 22/10). O validador reprova menções a ela.
3. **Sem contradições no texto.** Não escrever "a fonte X diz A e a Y diz B": escolher a fonte mais
   confiável. Na dúvida, usar "cerca de", "aproximadamente". Divergências vão só para
   `editorialNotes`, que não aparece no site.
4. **Sem metalinguagem** na abertura ("esta expedição segue o plano de manejo…"). Explicações de
   método, se houver, viram nota pequena.
5. **Dentro do parque.** Atrativos do entorno ficam de fora (ex.: Vale da Lua e Cachoeira de Santa
   Bárbara não são da Chapada dos Veadeiros).
6. Sem superlativos não documentados, sem especulação, paráfrase própria.
7. Texto sem markdown: o `ExpeditionView` não renderiza `*itálico*`.
8. Correções pontuais já pedidas: Guaricana ("descoberta de novas espécies", "água para o litoral e
   a capital", decreto de 23/03/2006, zona de amortecimento); Canastra reescrita; Sempre-Vivas
   escrita para encantar; Monte Pascoal sem contradições.

## 6. Regras de fotos

- Fontes: Wikimedia Commons e iNaturalist.
- Licenças aceitas: CC0, domínio público, CC BY, CC BY-SA, **CC BY-NC e CC BY-NC-SA** (liberadas
  em 22/10 porque o site não é comercial). **Nunca ND** (o layout recorta as fotos). Cerca de 30
  fotos são NC: se um dia houver fim comercial, precisam ser trocadas.
- Autor e licença visíveis em cada foto. Hosts permitidos no validador: `upload.wikimedia.org`,
  `thumb`, iNaturalist. URLs `Special:FilePath` são reprovadas.
- Qualidade: horizontal, nítida, original ≥ 2.000 px (ideal 3.000), sem pessoas em destaque, sem
  retratos de indígenas ou crianças, **com prova de lugar** (categoria do parque no Commons ou
  nome do atrativo no arquivo). Sem foto confiável: `"photo": null`.
- **Fotos de animais e plantas não precisam ter sido feitas no parque** (decisão de 27/10). Uma
  boa foto da mesma espécie feita em outro lugar serve, desde que a identificação esteja confirmada
  na fonte e o `context` diga que é ilustrativa. Prefira a melhor foto (nítida, organismo inteiro)
  a uma foto fraca feita no parque. Continua proibido usar espécie aparentada, e a prova de lugar
  segue obrigatória para capas, galerias, maravilhas e atrativos.
- Cartões de espécie em 4:3 com enquadramento a partir do topo (para não cortar a cabeça).
- O Commons limita requisições (erro 429): rodar em lotes pequenos, com pausa e cache; não rodar
  dois jobs de Commons ao mesmo tempo.

## 7. Mapa

- Visual inspirado no mapa de trilhas do **Strava** (pedido de 22/10): terra em verdes claros e
  variados por cobertura vegetal (NASA MODIS, ladrilhos próprios em `public/tiles/landcover`),
  áridas quase brancas, oceano azul liso, relevo sombreado leve, áreas protegidas do OSM removidas
  da base. Verde consistente em todos os zooms.
- A partir do zoom 8, polígonos do OpenStreetMap (mata, campo, lavoura, área urbana) nas mesmas
  cores, para nitidez. Em zoom muito alto longe das cidades ainda fica um pouco borrado.
- Relevo 3D desligado por padrão (botão 3D; a máquina do Jonathan tem GPU integrada). Hover com
  rAF para não travar.
- Último retorno do Jonathan (23/10): "o mapa está ótimo, boas cores".

## 8. Interações do painel do parque

Faixas com seta (carrossel), visualizador de fotos em tela cheia, quiz "Que bicho (ou planta) é
esse?" (5 perguntas; não aparece em Rio Novo e Rio Tanaru), termômetro de ameaça IUCN, "Mundo
perdido", "Flora em destaque", barra de leitura e capítulo atual nas Expedições, busca (`/` ou
Ctrl+K), filtros por bioma, "Surpreenda-me".

Tipografia do painel: escala padrão do Tailwind (texto corrido de 14 a 15 px, rótulos de 11 px,
títulos de seção de 22 px). Em 27/10 o Jonathan achou grandes demais as letras da escala ampliada
do commit 9e575ce (texto de 20 px, descrições de 18 px, classe `.park-reading`) e pediu a volta da
versão anterior: não reaplicar sem pedido dele.

## 9. Segurança e SEO (já feitos)

- Cabeçalhos (`next.config.ts`): CSP em produção (com `unsafe-inline`, nonce é o próximo passo),
  HSTS, X-Frame-Options DENY, Permissions-Policy, COOP; sem `X-Powered-By`.
- `security.txt`, `SECURITY.md`, Dependabot semanal, workflow no GitHub (audit, validação, tipos,
  lint, build). `npm audit` zerado.
- Sitemap (187 endereços), robots, JSON-LD (Park/TouristAttraction, BreadcrumbList, WebSite),
  Open Graph, manifest, ícone próprio de montanha (`icon.svg`), selo de dev do Next desligado,
  página `/sobre`, `NEXT_PUBLIC_GSC_VERIFICATION` para o Search Console.

## 10. Estado em 24/10/2026, 09:09 (última versão)

Último commit: *"Conteúdo aprovado (77 guias e 77 expedições), fotos corrigidas, mapa v6 com
detalhe, segurança, contato e ícone"*, no branch `feat/blend-raiz-expedicoes`. Build de produção:
197 páginas, sem erro.

- **Aprovados** (pelo Claude, por instrução do Jonathan): 77 guias (`status: "revisado"`), 77
  Expedições (`approved: true`) e 19 arquivos do Mundo perdido.
- `next.config.ts` ganhou `staticPageGenerationTimeout` maior, porque com tudo aprovado algumas
  páginas passavam de 60 s.
- Levantamento de espécies: 3.393 (alface, jequiriti, murta, cotorra-monge e uma bromélia fora do
  bioma removidas).
- Galerias: 307 fotos; Pico da Neblina com 8.
- Das 14 espécies com foto cortada apontadas em 23/10, 13 foram trocadas.

### Pendências
1. **Hospedagem e domínio (decisão do Jonathan).** Recomendação: Vercel Hobby (serve, já que não
   há fim comercial) e `raizatlas.com.br` no Registro.br (cerca de R$ 40/ano; livre na consulta
   RDAP de 22/10, confirmar). Opcional: `raizatlas.app` redirecionando. Passo a passo em
   `docs/PUBLICACAO.md`; variável obrigatória `NEXT_PUBLIC_SITE_URL`.
2. 70 maravilhas sem foto e 15 parques com galeria vazia ou com menos de 3 fotos (Acari, Albardão, Boqueirão da Onça,
   Campos Amazônicos, Campos Ferruginosos, Jamanxim, Tumucumaque, Jari, Parnaíba, Pacaás Novos, Pau-Brasil, Tanaru,
   Serra da Cutia, Serra da Mocidade, Serra das Lontras): Commons, iNaturalist e Flickr esgotados; depende de fotos
   fornecidas pelo Jonathan (com autor e licença). Não usar foto genérica.
3. Foto fraca do **inhambu-carapé**; conferir no navegador as outras espécies trocadas.
4. Terminar `node scripts/warm-thumbs.mjs`.
5. Fatos legais a reconferir: ampliação de Sete Cidades (Decreto 13.115/2026, ~13.502 ha), Jamanxim
   (informativo STF 1218, 862 ha) e a situação jurídica de Ilha Grande.
6. Depois do ar: Search Console + sitemap, Bing, Lighthouse e securityheaders.com, 2FA no GitHub,
   na Vercel e no Registro.br, DNSSEC.

## 10b. Áreas protegidas além dos parques nacionais (iniciado em 03/11/2026)

O projeto passa a se chamar "atlas das áreas protegidas do Brasil" (identidade em `site.ts`, Sobre, OG e
README; o resto do texto da interface ainda diz "parques nacionais" e só muda quando entrar a primeira
área nova no mapa). Seis estaduais escolhidas por volume de fotos e histórias: **PETAR, Jalapão, Ilha
Grande (RJ), Itaúnas, Ilhabela, Ibitipoca**. Lista em `data/br/extra-areas.json`; leitor em
`scripts/lib/extra-areas.mjs`, chamado pelo `build-geo.mjs`.

- Limites: cadastro CNUC do MMA (camada `MMA:cnuc_2025_08`, tem as estaduais), buscado por código CNUC.
  Ibitipoca não consta nele: usa o OpenStreetMap (marcado como dado colaborativo).
- O ano de criação vem do ato (`cria_ato`), não de `cria_ano` (no CNUC pode ser a data de alteração).
- **Portão de fotos antes de escrever:** a área só entra com maravilhas que tenham foto de lugar de verdade
  (Commons, categoria da unidade ou do atrativo; horizontal, 2.000 px ou mais, licença aceita). Meta: 8
  maravilhas candidatas; o Jalapão entrou com 6, cada uma com mais de 10 fotos boas, porque o resto fica
  fora do parque. O que vale é nenhuma maravilha sem foto. Nunca entrar vazia.
- **Recorte "dentro da unidade" por coordenadas:** testar o atrativo contra o polígono do CNUC (coordenadas do
  Nominatim ou GPS das fotos do Commons, que têm ponto padrão repetido: ignorar o ponto -46.675,-10.378).
- **Publicação:** o `npm run geo` só inclui a área no mapa se o `guide.json` estiver `revisado`; em prévia
  (`RAIZ_PREVIEW_DRAFTS=1`) inclui as que têm pasta em `data/br/parks/<slug>/`. O `check-content` barra o
  build de produção se uma área não nacional estiver no cadastro gerado sem guia revisado.
- Antes de commitar o geo em produção: `npm run geo` **sem** a variável de prévia.
- Ao rodar `npm run geo` do zero, o IBGE pode devolver bordas de estado levemente diferentes: restaurar
  `data/generated/geo-index.json` do git se o diff for só ruído.
- **Estado em 04/11/2026: seis áreas em RASCUNHO, nenhuma aprovada.** Todas passam no `check-content` em prévia
  (83 guias, 77 revisados), 28 testes, `tsc` e lint; 32 maravilhas, todas com foto. PETAR, Jalapão e Ibitipoca já
  tiveram revisão independente de fatos (fontes relidas, fotos abertas, correções feitas direto nos JSON: o gerador
  `build-*.mjs` de cada uma ficou OBSOLETO, o JSON é a fonte da verdade). Ilha Grande, Ilhabela e Itaúnas ainda
  não foram revisadas por segundo olhar. Geradores em `.geo-cache/novas-areas/` (ignorado pelo git).
- **ATENÇÃO antes de publicar:** o cadastro gerado (`data/br/parks.generated.json`, `public/geo/br/parks*`) foi
  commitado em modo prévia com as seis áreas. O `check-content` de produção BARRA o build até cada guia estar
  `revisado`. Para publicar: aprovar os guias que o Jonathan aprovar e rodar `npm run geo` SEM `RAIZ_PREVIEW_DRAFTS`
  (só as aprovadas entram), depois restaurar `data/generated/geo-index.json` do git se o diff for só ruído.
- PETAR (35.902 ha): Casa de Pedra com 197 m (medição USP/Fundação Florestal, jan/2026), não os 215 m do Guinness.
  PETAR é componente do Sítio Patrimônio Natural Mundial de 1999 (ficha UNEP-WCMC; a página da UNESCO dá 403).
  Destaques: bagre-cego, juçara, muriqui-do-sul, onça-pintada e anta (os três últimos pela tese UNESP de 2009).
- Jalapão (158.970 ha): **Cachoeira da Velha, Formiga e Prainha do Rio Novo ficam na APA** (não no parque; o GPS
  padrão do Commons -46.675,-10.378 enganou). Maravilhas: Dunas, Serra do Espírito Santo, Fervedouros, Mumbuca,
  veredas. Visitação pela IN 02/2024. Decisão pendente do Jonathan: ampliar o recorte para "região do Jalapão"
  (parque + APA)? Confirmar com o Naturatins o fervedouro da foto. Nome "Capim-dourado" em `species-names.json`.
- Ibitipoca (1.488 ha, limite do OpenStreetMap; override de área, ano e Lei 6.126 em `extra-areas.json`): Lago dos
  Espelhos tem só 2 fotos boas; foto da perereca CC BY-NC. Pendente: shapefile oficial do IEF e regras sob a concessão.
- Ilha Grande RJ (12.090 ha): 5 maravilhas (Lopes Mendes, Dois Rios, ruínas do presídio, Pico do Papagaio,
  Parnaioca). Abraão, Aventureiro, Lagoa Azul e Palmas ficam fora do parque. Não foi confirmado onde ficava o
  Instituto Penal Cândido Mendes (Abraão x Dois Rios); INEA deve confirmar.
- Ilhabela (27.025 ha por override; o CNUC tem 29.323): 6 maravilhas (Bonete, Enchovas, Castelhanos, Baepi, Água
  Branca, Pancada d'Água); o plano de manejo vem de cópia da USP porque o da Fundação Florestal dá 403.
- Itaúnas (3.536 ha CNUC; 3.481 pelo IEMA): 4 maravilhas; a vila de Itaúnas fica fora do polígono (entra só como
  contexto do soterramento); UNESCO 1992 vem do IEMA e precisa de confirmação.
- **Agentes em paralelo:** seis agentes juntos estouraram o limite de 5 h duas vezes (cada fork carrega o contexto
  inteiro). Para trabalho grande, preferir agentes novos com prompt enxuto, ou 2 a 3 por vez.
- **Contagem de fotos engana:** o total da categoria do Commons mistura praias urbanas, regatas e espécies. O que vale
  é fotos de lugar por atrativo (classificar por nome e descrição). Resultado (fotos boas por atrativo dentro do parque):
  Ilhabela só ~4 atrativos (Bonete ~42+, Castelhanos 20, Baepi 12, Água Branca 5; o resto é urbano) e Itaúnas ~3
  (dunas 134, rio 8, praia 10). Ilha Grande RJ: Lopes Mendes 73, Presídio (ruínas) 15, Leste 17, Aventureiro 11.
- Próximos passos: revisão independente de Ilha Grande, Ilhabela e Itaúnas; decisões do Jonathan (ver acima);
  trocar os textos "parques nacionais" da interface quando a primeira área entrar no mapa.

## 11. Ambiente e hábitos

- Windows, Git Bash, sem Python. Projeto vivia em
  `C:\Users\marih\AppData\Local\Claude-Data\…\scratch-workspaces\…\scratch-2026-10-20-01aa42\raiz-atlas`
  (com `.git`), e os zips finais ficavam na pasta acima dela.
- Git: `core.longpaths true`, `autocrlf false`; autor dos commits "Raiz <jonathanbalieiro@gmail.com>".
- Empacotamento: `git archive --format=zip --prefix=raiz-atlas/ -o ../raiz-atlas-producao.zip HEAD`
  (código) e `raiz-atlas-executavel.zip` (código + `.next` compilado + `iniciar.bat`).
- Trabalho pesado de conteúdo era feito em sessões paralelas por grupo de parques, cada uma
  mexendo só nos próprios `expedition.json`/`guide.json` e gravando trocas de foto de capa em
  patches (`.geo-cache/media-patch-*.json`) para aplicar depois. Cuidado: em 22/10 sessões
  gravaram por engano numa cópia antiga em `Downloads\raiz-atlas-blend-v1.2.0-completo`.
- O Jonathan costuma pedir: "localhost" (subir servidor de teste), "continue", zip ao final de
  cada rodada, e manda capturas de tela com os problemas.
