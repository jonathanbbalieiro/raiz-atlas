# Guia editorial do Raiz: conteúdo de cada parque

**Objetivo:** encantar pela informação. Cada parque ganha uma ficha que se lê
em 3 minutos, cheia de imagem, com frases curtas que explicam e surpreendem,
e onde **toda afirmação tem fonte**.

## A estrutura (a mesma para os 77 parques)

| Bloco | O que responde | Formato | Origem |
| --- | --- | --- | --- |
| **Frase de encanto** (`hook`) | Por que este lugar é único? | 1 frase, até 140 caracteres | editorial |
| **Abertura** (`intro`) | Onde fica, o que é, por que importa | 2 ou 3 frases, até 480 caracteres | editorial |
| **O que ele protege** (`protects`) | Ecossistemas, águas, espécies, patrimônio | título-resumo + 2 a 5 cartões | editorial |
| **Maravilhas naturais** (`wonders`) | O que faz parar e olhar | 2 a 5 cartões com foto | editorial + Commons |
| **Quem vive aqui** | Fauna e flora reais do parque | espécies-símbolo + abas por grupo | `flagships` editorial + levantamento automático |
| **Você sabia?** (`curiosities`) | O fato que a pessoa vai contar para alguém | 3 a 6 cartões, até 260 caracteres | editorial |
| **Histórias** (`stories`) | Gente, tempo e território | 1 a 5 marcos em linha do tempo | editorial |

Arquivo: `data/br/parks/<slug>/guide.json`. Modelo completo:
`data/br/parks/chapada-dos-veadeiros/guide.json`. Tipos: `ParkGuide` em
`src/lib/data/types.ts`.

"Quem vive aqui" já existe para todos os parques: `npm run bio` cruza as
ocorrências do GBIF dentro do limite oficial com nomes, fotos e status IUCN
(`biodiversity.generated.json`, não editar à mão). O guia só escolhe de 2 a 4
**espécies-símbolo** e explica por que importam.

## Tom

- **Leve, concreto, visual.** Números que dão escala ("120 metros de queda
  livre", "1.476 espécies de plantas"), verbos de movimento, imagens mentais.
- **Frases curtas.** Um fato por frase. Nada de "é um lugar incrível": mostre
  por que é.
- **Curiosidade de verdade:** o fato improvável, a origem do nome, o recorde
  documentado, a ligação com a história do Brasil.
- **Português do Brasil**, sem jargão; quando o termo técnico é bom (campo
  rupestre, quartzito), explique numa oração.
- Nada de primeira pessoa, nada de exclamação em excesso, nada de clichê.

## Rigor (não negociável)

1. **Nenhum fato sem fonte.** Cada item tem `sourceIds` que existem em
   `sources`. Se não achou fonte, não escreve.
2. **Hierarquia de fontes:** ICMBio (página da unidade, plano de manejo,
   folhetos), decretos e o CNUC/MMA; UNESCO; artigos científicos e
   instituições de pesquisa (Embrapa, universidades, IBGE, CPRM); governos
   estaduais de turismo para atrativos; **Wikipédia só como apoio**, e de
   preferência confirmada por uma fonte primária.
3. **Dentro do parque.** Maravilhas e histórias precisam estar *na unidade*.
   Muitas atrações famosas ficam no entorno (ex.: Cachoeira de Santa Bárbara
   fica no território Kalunga, fora da Chapada dos Veadeiros). Em caso de
   dúvida, deixe de fora.
4. **Sem superlativos não documentados** ("o maior", "o único", "o mais
   antigo") e sem especulação ("especula-se", "acredita-se").
5. **Números conflitantes** (área, altura): use o da fonte oficial e não
   arredonde para mais.
6. **Paráfrase própria**, nunca copiar trechos. Wikipédia é CC BY-SA: cite.
7. **Espécies-símbolo:** prefira espécies que aparecem no
   `biodiversity.generated.json` do parque (a foto entra sozinha). Se a espécie
   é emblemática e documentada pela fonte, mas não está no levantamento, use
   `photo` com a ferramenta abaixo.
8. `status: "rascunho"` sempre. Só uma revisão humana muda para `"revisado"`.

## Fotos

Critérios detalhados de identificação, qualidade, localização e seleção de
espécies: [Curadoria fotográfica](CURADORIA_FOTOGRAFICA.md). A relação da espécie
com o parque e o local onde a foto foi feita são verificações independentes.

Só Wikimedia Commons com CC0, domínio público, CC BY ou CC BY-SA, com autor e
licença. A ferramenta faz a checagem:

```bash
npm run photo -- search "Saltos do Rio Preto Chapada dos Veadeiros"
npm run photo -- file "File:Nome do arquivo.jpg" "Legenda: o que a foto mostra"
```

Cole o JSON impresso em `wonders[].photo`. Para as espécies-símbolo sem foto no
levantamento, `npm run photo:flagships` busca no Wikidata a imagem da espécie
e confere a licença sozinho. Confira na página do arquivo se a
foto é mesmo do lugar descrito, dentro do parque. Sem foto confiável, use
`"photo": null`: o cartão aparece só com texto.

### Fotos em lote, com prova de lugar

`node scripts/auto-wonder-photos.mjs --apply [slug...]` procura fotos para as
maravilhas sem foto e **só grava** quando o nome da maravilha aparece no arquivo
e a foto pertence à categoria do parque no Commons (ou cita o parque). O resto
fica em `.geo-cache/photos/relatorio.json` como candidata para revisão humana.
O Commons limita requisições: se parar, rode de novo (o que foi baixado fica em cache).

## Checagem

```bash
npm run check:content
```

Valida tamanhos, fontes citadas, fotos e textos repetidos. Roda também antes
de todo build.

## Roteiro de pesquisa por parque (30 a 45 min)

1. Página do ICMBio da unidade e, se existir, o plano de manejo (resumo,
   caracterização, fauna, flora, história). Ato de criação.
2. UNESCO, se o parque for Patrimônio Mundial, Sítio Ramsar ou Reserva da Biosfera.
3. Wikipédia em português, para orientar a busca e conferir datas.
4. Atrativos: fonte oficial de visitação (ICMBio, concessionária ou governo estadual).
5. Abra `biodiversity.generated.json` e escolha as espécies-símbolo.
6. Escreva o `guide.json`, busque fotos e rode `npm run check:content`.
