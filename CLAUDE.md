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
   escrita para encantar; Monte Pascoal sem contradições nem seção "Revisão com os Pataxó".

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
2. ~76 maravilhas sem foto e as galerias de cerca de 10 parques vazias (Acari, Albardão, Campos
   Ferruginosos, Serra da Mocidade, Serra das Lontras, Nascentes do Rio Parnaíba, Jari, Tanaru…):
   o Commons não tem foto livre com prova de lugar. Não usar foto genérica.
3. Foto fraca do **inhambu-carapé**; conferir no navegador as outras espécies trocadas.
4. Terminar `node scripts/warm-thumbs.mjs`.
5. Revisão posterior, pela Funai e pelas comunidades, dos textos sobre povos indígenas (Pico da
   Neblina, Monte Pascoal, Monte Roraima, Amazônia, Catimbau, Araguaia, Descobrimento/Maturembá,
   Cabo Orange, Sempre-Vivas, Rio Tanaru).
6. Fatos legais a reconferir: ampliação de Sete Cidades (Decreto 13.115/2026, ~13.502 ha), Jamanxim
   (informativo STF 1218, 862 ha) e a situação jurídica de Ilha Grande.
7. Depois do ar: Search Console + sitemap, Bing, Lighthouse e securityheaders.com, 2FA no GitHub,
   na Vercel e no Registro.br, DNSSEC.

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
