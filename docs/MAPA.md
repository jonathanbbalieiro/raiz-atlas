# Mapa que acompanha a leitura

Piloto de 27/10/2026 na Chapada dos Veadeiros. O mapa deixa de mostrar só o
contorno do parque e passa a responder ao que se lê no painel. O conteúdo
continua inteiro no painel: o mapa complementa, nunca é o único caminho.

## O que existe

1. **Maravilhas no mapa.** Cada maravilha com `location` vira um marcador com o
   mesmo número do cartão. "Ver no mapa" voa até ela (no celular, a gaveta
   baixa); tocar no marcador realça o cartão e rola o painel até ele.
2. **Onde a espécie foi registrada.** Na ficha do explorador, o mapa mostra os
   registros do GBIF agregados em quadrados de cerca de 2 km. Espécies
   ameaçadas (CR, EN, VU ou na aba de ameaçadas) usam quadrados de cerca de
   11 km, para não indicar onde encontrá-las. Nunca há pontos exatos.
3. **Entorno.** Unidades de conservação (CNUC/MMA), terras indígenas (Funai) e
   territórios quilombolas (Incra) aparecem discretos em volta do parque.
   A seção "No entorno" do painel lista as mesmas áreas; o botão realça o mapa.
4. **Expedição.** Ao ler um momento com `map`, o mapa vai até o lugar e mostra
   o nome; momentos sem lugar devolvem o mapa ao parque; `frame: "entorno"`
   abre para o parque e as áreas vizinhas. No celular a leitura ocupa a tela,
   então o efeito aparece no desktop e no tablet.

## Dados

```jsonc
// guide.json, em cada maravilha
"location": {
  "coordinates": [-47.82086, -14.14457],   // [longitude, latitude]
  "precision": "ponto",                    // ou "aproximado" (cânion, trecho de rio)
  "sourceIds": ["osm"],                    // fontes do próprio guia
  "osm": "node/10311367993"                // opcional: elemento do OpenStreetMap
}
// expedition.json, em cada momento
"map": { "label": "Vila de São Jorge, portão de entrada do parque", "location": { … } }
"map": { "label": "O parque e as áreas protegidas vizinhas", "frame": "entorno" }
```

Gerados, nunca editar à mão:

| Arquivo | Script |
|---|---|
| `public/geo/br/context/<parque>.json` e `data/br/parks/<parque>/context.generated.json` | `npm run context -- <parque>` |
| `public/geo/br/occurrences/<parque>.json` | `npm run occurrences -- <parque>` |

Nesta máquina, os servidores do governo exigem a cadeia de certificados do
sistema e a API do GBIF passa pelo proxy:

```bash
NODE_USE_ENV_PROXY=1 node --use-system-ca scripts/build-park-context.mjs <parque>
NODE_USE_ENV_PROXY=1 node --use-system-ca scripts/build-occurrence-grid.mjs <parque>
```

Não desligue a verificação de TLS.

## Regras de curadoria dos lugares

- Toda coordenada precisa de fonte. O OpenStreetMap entra como fonte `osm`
  (licença ODbL, já citada no guia e na Expedição da Chapada).
- O validador reprova maravilha fora do polígono do parque, o que reforça a
  regra de que atrativos do entorno não são maravilhas do parque.
- Use `aproximado` quando o lugar é uma área ou quando a fonte só diz "no
  percurso de". O mapa então desenha um círculo maior, sem sugerir precisão.
- Na Chapada, as três atrações antigas citavam um folheto do ICMBio, mas as
  coordenadas coincidem com nós do OpenStreetMap; as maravilhas citam o OSM.
- O Garimpão foi localizado pelo plano de manejo (p. 124, "no percurso dos
  Saltos do rio Preto") e pelo inventário de Goiás (p. 33, "Cachoeira do
  Garimpão (Salto de 80 m)"), com o nó do Salto 80 no OSM. Por isso é aproximado.

## Para expandir a outro parque

1. Pesquisar o lugar de cada maravilha, com fonte; gravar `location`.
2. `npm run context -- <parque>` e `npm run occurrences -- <parque>`.
3. Opcional: `map` nos momentos da Expedição que falam de um lugar.
4. `npm run check:content` e conferir no navegador, no celular e no desktop.

Sem esses arquivos, o parque continua funcionando como antes.

## Limitações conhecidas

- De longe, marcadores próximos (como os três da Chapada) se sobrepõem. Os
  números continuam legíveis; se um parque tiver muitas maravilhas juntas,
  vale agrupar os marcadores.
- No mesmo lugar de uma maravilha, o marcador da atração fica por baixo; a
  página da atração continua acessível pela lista "Atrações" do painel.
- As bases do entorno vêm sem alguns acentos ("Aguas do Paraiso") e podem não
  trazer a fase mais recente de cada processo; o painel avisa.
- A grade de registros usa os mesmos filtros do levantamento, mas a contagem
  pode diferir um pouco da exibida na ficha: a grade descarta registros com
  incerteza acima de 10 km e o GBIF muda com o tempo.
