# Auditoria fotográfica

Gerada por `npm run audit:photos`. Auditoria de metadados locais. Não comprova identificação visual, integridade HTTP, autoria ou localização. Reuso restrito ao nome científico idêntico na base existente; nunca transfere ocorrência ou alega que a foto foi feita no parque.

- parks: 77
- selectedSpecies: 3543
- missingSpeciesRaw: 7
- missingSpeciesDisplayed: 9
- missingPlantsDisplayed: 8
- missingThreatenedRaw: 142
- missingThreatenedDisplayed: 138
- missingFlagshipsRaw: 22
- missingFlagshipsDisplayed: 9
- filledSpeciesReferences: 0
- removedSpeciesReferences: 2
- reusedThreatened: 4
- recoveredFlagships: 13

Os contadores Species referem-se às abas por grupo; Threatened refere-se à aba de ameaçadas. Pode haver sobreposição de espécies entre essas seleções. Raw é a base em disco; Displayed inclui o reuso por nome científico no carregamento do site.

## Fila por parque

| Parque | Abas por grupo: sem foto | Destas, plantas | Aba ameaçadas: sem foto | Destaques sem foto |
| --- | ---: | ---: | ---: | ---: |
| Parque Nacional dos Campos Ferruginosos | 3 | 3 | 4 | 2 |
| Parque Nacional do Pico da Neblina | 2 | 2 | 8 | 0 |
| Parque Nacional da Serra Geral | 1 | 1 | 0 | 1 |
| Parque Nacional de Anavilhanas | 1 | 1 | 2 | 0 |
| Parque Nacional de São Joaquim | 1 | 1 | 1 | 0 |
| Parque Nacional da Chapada da Diamantina | 0 | 0 | 4 | 1 |
| Parque Nacional da Serra das Lontras | 0 | 0 | 8 | 1 |
| Parque Nacional da Serra do Teixeira | 0 | 0 | 0 | 1 |
| Parque Nacional de Caparaó | 0 | 0 | 6 | 1 |
| Parque Nacional Guaricana | 0 | 0 | 0 | 1 |
| Parque Nacional Serra da Mocidade | 0 | 0 | 1 | 1 |
| Parque Nacional Cavernas do Peruaçu | 0 | 0 | 2 | 0 |
| Parque Nacional da Chapada dos Guimarães | 0 | 0 | 1 | 0 |
| Parque Nacional da Chapada dos Veadeiros | 0 | 0 | 7 | 0 |
| Parque Nacional da Serra da Bocaina | 0 | 0 | 5 | 0 |
| Parque Nacional da Serra da Bodoquena | 0 | 0 | 2 | 0 |
| Parque Nacional da Serra da Canastra | 0 | 0 | 1 | 0 |
| Parque Nacional da Serra das Confusões | 0 | 0 | 2 | 0 |
| Parque Nacional da Serra do Cipó | 0 | 0 | 2 | 0 |
| Parque Nacional da Serra do Divisor | 0 | 0 | 4 | 0 |
| Parque Nacional da Serra do Gandarela | 0 | 0 | 3 | 0 |
| Parque Nacional da Serra do Itajaí | 0 | 0 | 2 | 0 |
| Parque Nacional da Serra do Pardo | 0 | 0 | 1 | 0 |
| Parque Nacional da Serra dos Órgãos | 0 | 0 | 3 | 0 |
| Parque Nacional da Tijuca | 0 | 0 | 2 | 0 |
| Parque Nacional das Sempre-Vivas | 0 | 0 | 6 | 0 |
| Parque Nacional de Aparados da Serra | 0 | 0 | 1 | 0 |
| Parque Nacional de Boa Nova | 0 | 0 | 4 | 0 |
| Parque Nacional de Brasília | 0 | 0 | 2 | 0 |
| Parque Nacional de Itatiaia | 0 | 0 | 8 | 0 |
| Parque Nacional de Pacaás Novos | 0 | 0 | 3 | 0 |
| Parque Nacional de Saint-Hilaire/lange | 0 | 0 | 5 | 0 |
| Parque Nacional do Albardão | 1 | 0 | 1 | 0 |
| Parque Nacional do Araguaia | 0 | 0 | 1 | 0 |
| Parque Nacional do Cabo Orange | 0 | 0 | 2 | 0 |
| Parque Nacional do Catimbau | 0 | 0 | 1 | 0 |
| Parque Nacional do Descobrimento | 0 | 0 | 5 | 0 |
| Parque Nacional do Iguaçu | 0 | 0 | 1 | 0 |
| Parque Nacional do Jamanxim | 0 | 0 | 1 | 0 |
| Parque Nacional do Jaú | 0 | 0 | 1 | 0 |
| Parque Nacional do Juruena | 0 | 0 | 3 | 0 |
| Parque Nacional do Monte Roraima | 0 | 0 | 3 | 0 |
| Parque Nacional do Pau Brasil | 0 | 0 | 8 | 0 |
| Parque Nacional do Viruá | 0 | 0 | 1 | 0 |
| Parque Nacional e Histórico do Monte Pascoal | 0 | 0 | 4 | 0 |
| Parque Nacional Mapinguari | 0 | 0 | 4 | 0 |
| Parque Nacional Montanhas do Tumucumaque | 0 | 0 | 2 | 0 |

Os caminhos e as fontes de cada problema estão em auditoria.json. Ausência é contabilizada por referência, não por imagem única. Não trocar espécies por parentes próximos para esconder lacunas.
