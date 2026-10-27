# Revisão de fotos, conteúdo e produção

## Correções realizadas

- Retratos de fauna e flora usam a imagem inteira. Foi removido o deslocamento
  automático baseado na suposição de que a cabeça fica no terço superior.
  Isso corrige o recorte da fotografia panorâmica da ariranha sem inventar pixels.
- Um componente comum trata falhas de imagens; a galeria preserva a composição
  e os créditos. Os retratos abrem a página da obra original.
- Foi eliminado o gerador paralelo de miniaturas de 640 px. Imagens com variantes
  usam o loader central; originais sem variantes são explicitamente não otimizados,
  evitando o aviso de loader que não implementa largura.
- A imagem escolhida no guia tem prioridade sobre a foto automática de biodiversidade,
  preservando os metadados de ocorrência. As regras explícitas de capa passaram a ser
  aplicadas no repositório de dados, com deduplicação e preservação da ordem editorial.
  Heurísticas de palavras e resolução que pretendiam adivinhar a capa foram removidas.
- Reuso conservador de fotos por nome científico já identificado na base preencheu
  cinco entradas nas abas por grupo e sete na aba de ameaçadas. São referências
  preenchidas, não doze fotografias novas ou doze espécies distintas.
- Os destaques mostram justificativa e links das fontes. Cada ficha agora informa
  o tamanho da seleção e sua classificação global de ameaça, com a ressalva de que
  não se trata de censo ou de avaliação da população local.
- A interface distingue seleção editorial, critério histórico de fotos/registros
  e levantamento por ocorrência. Os levantamentos futuros priorizam registros,
  independentemente de fotografia; os arquivos antigos não foram regenerados.
- As abas funcionam com setas, Home e End. A galeria contém o foco do teclado,
  bloqueia o scroll de fundo e fecha com Escape, devolvendo o foco.
- Há aviso de indisponibilidade do mapa quando falha o carregamento inicial;
  busca e listas continuam utilizáveis.
- DM Sans e Fraunces são locais, com versões e integridade no lockfile. O build
  deixou de depender de uma chamada ao Google Fonts.
- Foram registrados os valores de qualidade 75 e 90 usados pelas imagens do Next.
- O lint separa artefatos de terceiros e a sintaxe CommonJS dos scripts `.cjs`.
  Foi removido o caminho absoluto de TypeScript que dependia de outra máquina.
- Duas etapas vazias do CI (`true`) foram substituídas por tipos, lint e testes reais.
- Nova marca de árvore/curso d'água, criada para o projeto e aplicada ao favicon
  multirresolução, ícone do navegador, Apple, manifesto e navegação. Não é fotografia
  documental e não foi usada para ilustrar organismos ou locais reais.

## Validação executada

- `npm test`: sete testes de regressão, todos passaram.
- `npm run lint`: passou, sem erros ou avisos.
- `npx tsc --noEmit`: passou; o build também executou a verificação TypeScript.
- `npm run check:content`: passou para os 77 guias, 77 levantamentos e 77 expedições.
- `npm run build`: passou, incluindo pré-renderização e fontes locais.
- `npm audit --omit=dev`: nenhuma vulnerabilidade conhecida reportada nas dependências
  de produção naquele momento. Isso não é uma auditoria de segurança completa.
- `npm run check:publication`: passou no modo informativo, com aviso de domínio
  público ainda não configurado; o modo estrito de publicação não foi validado.
- Servidor `npm start`: HTTP 200 e conteúdo esperado em início, Anavilhanas,
  Chapada dos Veadeiros e Sobre; HTTP 200 para geodados, worker e todos os ícones.
  Manifesto, CSP e cabeçalhos de segurança também foram conferidos.
- Chromium/Playwright: navegação de abas, descrição de critérios, foco e Escape
  da galeria. Layout mobile 390 × 844 sem overflow horizontal.
- Uma imagem de teste panorâmica isolou o comportamento de enquadramento da ariranha:
  `object-fit: contain`. Isso valida o layout, não a identificação da foto original.
- Em produção, a interrupção deliberada dos CDNs confirmou os estados de imagem/mapa
  indisponíveis, sem exceções JavaScript. As fontes locais carregaram normalmente.

## O que ainda falta

A [auditoria reproduzível](audits/fotos-atual/LEIA-ME.md) ainda aponta 151 referências
sem foto nas abas por grupo, incluindo 92 plantas; 242 na aba de ameaçadas; e
12 destaques editoriais sem imagem. Há sobreposição entre as seleções: não some
esses números como espécies únicas. Também há imagens pequenas e autorias que
exigem revisão, listadas individualmente em `auditoria.json`.

A auditoria de resolução considera as dimensões cadastradas e o contexto de uso.
Não verifica nitidez, identificação visual, autoria, resposta HTTP ou localização
na fonte. Não foram baixadas fotografias novas: Commons, Google Fonts e o provedor
de mapas retornaram `403 CONNECT` na política de rede desta máquina. O build já
independe do Google; a pesquisa fotográfica ainda precisa da rede liberada.

O rascunho do ambiente conserva os domínios existentes e acrescenta
`query.wikidata.org`, `www.wikidata.org`, `api.gbif.org` e `api.inaturalist.org` para
as consultas. As instruções de inicialização também foram atualizadas. Salvar o
rascunho não aplica essas regras: é necessário revisar/salvar as configurações
do ambiente e publicar a versão pelo produto.

Antes de publicar **o site**, defina `NEXT_PUBLIC_SITE_URL` com o domínio HTTPS real
e execute `npm run check:publication -- --strict`. Não foi feito deploy.

A ampliação editorial nesta revisão usa os dados e fontes já presentes. Não foram
inventados fatos ou aprovados rascunhos em lote. Novas reportagens e substituições
fotográficas devem seguir [os critérios de curadoria](CURADORIA_FOTOGRAFICA.md),
com pesquisa, identificação e revisão das fontes primárias.
