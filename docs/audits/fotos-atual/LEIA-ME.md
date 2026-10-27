# Auditoria fotográfica

Gerada por `npm run audit:photos`. Auditoria de metadados locais. Não comprova identificação visual, integridade HTTP, autoria ou localização. Reuso restrito ao nome científico idêntico na base existente; nunca transfere ocorrência ou alega que a foto foi feita no parque.

- parks: 77
- selectedSpecies: 2695
- missingSpeciesRaw: 156
- missingSpeciesDisplayed: 150
- missingPlantsDisplayed: 92
- missingThreatenedRaw: 249
- missingThreatenedDisplayed: 239
- missingFlagshipsRaw: 12
- missingFlagshipsDisplayed: 6
- filledSpeciesReferences: 8
- removedSpeciesReferences: 2
- reusedThreatened: 10
- recoveredFlagships: 6

Os contadores Species referem-se às abas por grupo; Threatened refere-se à aba de ameaçadas. Pode haver sobreposição de espécies entre essas seleções. Raw é a base em disco; Displayed inclui o reuso por nome científico no carregamento do site.

## Fila por parque

| Parque | Abas por grupo: sem foto | Destas, plantas | Aba ameaçadas: sem foto | Destaques sem foto |
| --- | ---: | ---: | ---: | ---: |
| Parque Nacional de Caparaó | 8 | 8 | 6 | 0 |
| Parque Nacional Serra da Cutia | 8 | 8 | 0 | 0 |
| Parque Nacional de São Joaquim | 8 | 6 | 8 | 0 |
| Parque Nacional do Acari | 6 | 6 | 0 | 0 |
| Parque Nacional dos Campos Ferruginosos | 10 | 6 | 4 | 0 |
| Parque Nacional do Pico da Neblina | 8 | 5 | 10 | 0 |
| Parque Nacional das Sempre-Vivas | 4 | 4 | 7 | 0 |
| Parque Nacional de Itatiaia | 5 | 4 | 10 | 0 |
| Parque Nacional da Serra Geral | 8 | 3 | 4 | 1 |
| Parque Nacional Guaricana | 3 | 3 | 2 | 1 |
| Parque Nacional da Serra da Bocaina | 3 | 3 | 6 | 0 |
| Parque Nacional da Serra do Divisor | 3 | 3 | 6 | 0 |
| Parque Nacional da Serra dos Órgãos | 3 | 3 | 6 | 0 |
| Parque Nacional das Araucárias | 4 | 3 | 0 | 0 |
| Parque Nacional do Cabo Orange | 4 | 3 | 2 | 0 |
| Parque Nacional do Jaú | 6 | 3 | 2 | 0 |
| Parque Nacional do Viruá | 3 | 3 | 1 | 0 |
| Parque Nacional dos Campos Gerais | 4 | 3 | 1 | 0 |
| Parque Nacional Mapinguari | 3 | 3 | 6 | 0 |
| Parque Nacional de Anavilhanas | 2 | 2 | 4 | 0 |
| Parque Nacional do Jamanxim | 2 | 2 | 2 | 0 |
| Parque Nacional de Pacaás Novos | 1 | 1 | 6 | 1 |
| Parque Nacional da Chapada da Diamantina | 1 | 1 | 7 | 0 |
| Parque Nacional da Serra das Confusões | 1 | 1 | 4 | 0 |
| Parque Nacional da Serra das Lontras | 2 | 1 | 9 | 0 |
| Parque Nacional de Aparados da Serra | 1 | 1 | 5 | 0 |
| Parque Nacional de Saint-Hilaire/lange | 1 | 1 | 11 | 0 |
| Parque Nacional Marinho dos Abrolhos | 1 | 1 | 3 | 0 |
| Parque Nacional Montanhas do Tumucumaque | 2 | 1 | 4 | 0 |
| Parque Nacional da Serra do Teixeira | 4 | 0 | 1 | 1 |
| Parque Nacional da Tijuca | 0 | 0 | 4 | 1 |
| Parque Nacional de Ubajara | 0 | 0 | 1 | 1 |
| Parque Nacional Cavernas do Peruaçu | 0 | 0 | 4 | 0 |
| Parque Nacional da Amazônia | 3 | 0 | 0 | 0 |
| Parque Nacional da Chapada das Mesas | 2 | 0 | 0 | 0 |
| Parque Nacional da Chapada dos Guimarães | 0 | 0 | 2 | 0 |
| Parque Nacional da Chapada dos Veadeiros | 0 | 0 | 9 | 0 |
| Parque Nacional da Lagoa do Peixe | 0 | 0 | 1 | 0 |
| Parque Nacional da Restinga de Jurubatiba | 1 | 0 | 3 | 0 |
| Parque Nacional da Serra da Bodoquena | 1 | 0 | 2 | 0 |
| Parque Nacional da Serra da Canastra | 0 | 0 | 2 | 0 |
| Parque Nacional da Serra da Capivara | 0 | 0 | 1 | 0 |
| Parque Nacional da Serra do Cipó | 0 | 0 | 7 | 0 |
| Parque Nacional da Serra do Gandarela | 0 | 0 | 6 | 0 |
| Parque Nacional da Serra do Itajaí | 0 | 0 | 6 | 0 |
| Parque Nacional da Serra do Pardo | 1 | 0 | 1 | 0 |
| Parque Nacional das Nascentes do Rio Parnaíba | 0 | 0 | 1 | 0 |
| Parque Nacional de Boa Nova | 0 | 0 | 4 | 0 |
| Parque Nacional de Brasília | 0 | 0 | 3 | 0 |
| Parque Nacional de Ilha Grande | 1 | 0 | 0 | 0 |
| Parque Nacional de Jericoacoara | 1 | 0 | 0 | 0 |
| Parque Nacional de Sete Cidades | 1 | 0 | 0 | 0 |
| Parque Nacional do Albardão | 2 | 0 | 3 | 0 |
| Parque Nacional do Alto Cariri | 0 | 0 | 1 | 0 |
| Parque Nacional do Araguaia | 3 | 0 | 2 | 0 |
| Parque Nacional do Boqueirão da Onça | 0 | 0 | 1 | 0 |
| Parque Nacional do Catimbau | 2 | 0 | 1 | 0 |
| Parque Nacional do Descobrimento | 2 | 0 | 6 | 0 |
| Parque Nacional do Iguaçu | 0 | 0 | 2 | 0 |
| Parque Nacional do Juruena | 0 | 0 | 4 | 0 |
| Parque Nacional do Monte Roraima | 2 | 0 | 6 | 0 |
| Parque Nacional do Pantanal Mato-Grossense | 1 | 0 | 0 | 0 |
| Parque Nacional do Pau Brasil | 1 | 0 | 8 | 0 |
| Parque Nacional do Rio Novo | 1 | 0 | 0 | 0 |
| Parque Nacional do Superagui | 1 | 0 | 0 | 0 |
| Parque Nacional dos Lençóis Maranhenses | 2 | 0 | 0 | 0 |
| Parque Nacional e Histórico do Monte Pascoal | 1 | 0 | 4 | 0 |
| Parque Nacional Grande Sertão Veredas | 1 | 0 | 2 | 0 |
| Parque Nacional Marinho de Fernando de Noronha | 1 | 0 | 4 | 0 |
| Parque Nacional Serra da Mocidade | 0 | 0 | 1 | 0 |

Os caminhos e as fontes de cada problema estão em auditoria.json. Ausência é contabilizada por referência, não por imagem única. Não trocar espécies por parentes próximos para esconder lacunas.
