# RAIZ v1.3.3 — Curadoria visual expandida

## Foco desta rodada
- melhorar a seleção da foto principal do parque;
- corrigir enquadramentos e ampliar o reaproveitamento do acervo já documentado;
- preencher galerias e capas com fotos válidas vindas do próprio parque, das maravilhas, das Expedições e, quando necessário, das espécies registradas.

## Melhorias aplicadas

### Seleção mais inteligente de capas
A lógica de curadoria visual agora diferencia **paisagens do parque** de **retratos ilustrativos de espécies**.

- Fotos de paisagem, trilha, rio, cachoeira, lagoa, duna, caverna ou vista geral recebem prioridade.
- Fotos de espécies continuam disponíveis, mas não assumem a capa quando houver uma paisagem melhor.
- Registros explicitamente ambíguos recebem uma pequena penalização, sem serem descartados automaticamente.

### Pool de fotos ampliado por parque
A galeria do parque deixou de depender apenas de `park-media.generated.json`. Agora ela pode reunir e deduplicar:
- fotos do acervo principal do parque;
- fotos das **maravilhas** e **espécies-símbolo** do guia;
- capas e imagens da **Expedição**;
- fotos da seção **Mundo Perdido**;
- uma seleção pequena de fotos da **biodiversidade**, quando necessário.

Isso melhora sobretudo os parques que tinham pouca ou nenhuma foto geral, como Acari e Rio Novo, e permite exibir galerias também em parques cujo melhor acervo estava espalhado em outras seções.

### Créditos mais legíveis
Os créditos deixaram de truncar tanto em listas e galerias, facilitando a leitura de autoria e licença.

## Limitações
- Não foi possível buscar novas imagens na internet neste ambiente.
- Esta rodada prioriza melhor **seleção, reaproveitamento e ordenação** do acervo existente na build.
