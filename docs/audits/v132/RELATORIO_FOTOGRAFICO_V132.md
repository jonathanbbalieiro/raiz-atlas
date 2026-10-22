# RAIZ v1.3.2 — Segunda rodada de curadoria de imagens

**Base**: v1.3.1, escolhida pelo usuário como referência de navegação e linguagem.
**Data**: 22/10/2026.

## Resumo verificável

- **77 parques** preservados, **75 Expedições** preservadas (49 originais da base preferida + 26 complementares), **0 aprovações**, **3.398 registros totais** no acervo de biodiversidade informado pelo pipeline.
- **228 fotos em galerias gerais de parques**, contra 225 na base anterior: quatro novas fotos de locais/espécies documentadas, e uma foto anterior substituída; crescimento líquido de três.
- **162 fotografias de táxons** já armazenadas nos dados de biodiversidade foram vinculadas diretamente às fichas de espécies-símbolo em **66 guias**. São **reutilizações do acervo**, não fotos novas baixadas, e não provam que a câmera estava dentro do parque.
- Uma fotografia antiga de Guaricana foi arquivada fora da galeria principal e substituída por dois registros identificados no Commons como pertencentes ao Parque Nacional Guaricana.
- Créditos de duas fotos da série do Viruá foram padronizados para Rodrigo Tetsuo Argenton, conforme identificação da série. Conferência individual dos arquivos ainda é recomendada.
- As capas de **Guaricana**, **Jurubatiba** e **Viruá** têm escolha editorial explícita; a ordenação por proporção/tamanho deixou de ser soberana nesses casos.
- Fotografias com contexto novo têm legenda legível no carrossel e na capa, além de autor, origem e licença clicáveis.
- Scripts de busca de maravilhas e espécies-símbolo usam classificação centralizada de licenças e não adicionam automaticamente arquivos que exigem revisão manual (p.ex. GFDL).

## Melhorias por parque

| Parque | Mudança | Critério | Fonte |
|---|---|---|---|
| Restinga de Jurubatiba | Foto adicional de vegetação e lagoa, selecionada para capa | Fonte do autor indica fotografia dentro do parque, com coordenadas e licença CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Vegeta%C3%A7%C3%A3o_de_restinga_e_lagoa_-_Jurubatiba.jpg |
| Guaricana | Duas fotos de Luizalves1990 (01 e 02), uma como capa | Fonte Commons identifica ambas como Parque Nacional Guaricana, com CC BY-SA 4.0; substitui imagem de título pouco específico | https://commons.wikimedia.org/wiki/File:Parque_Nacional_Guaricana_-_Luiz_Alves_(01).jpg / https://commons.wikimedia.org/wiki/File:Parque_Nacional_Guaricana_-_Luiz_Alves_(02).jpg |
| Viruá | Imagem de cuxiú (Chiropotes sagulatus) fotografado em expedição ao parque | Identificação do táxon, autor e licença na página Commons; capa paisagística preservada | https://commons.wikimedia.org/wiki/File:Cuxi%C3%BA_(Chiropotes_sagulatus)_-_Parque_Nacional_do_Viru%C3%A1_por_Rodrigo_Tetsuo_Argenton_(197).jpg |
| Campos Ferruginosos | Espécies-símbolo podem exibir imagens já documentadas no acervo | Foto taxonômica não apresentada como paisagem feita dentro da UC | `data/br/parks/campos-ferruginosos/guide.json` |
| Acari e outros com galeria pequena | Reuso de fotos do acervo nas espécies-símbolo | Amplia presença visual sem deslocar fotos de outro território para a capa | `FOTOS_SIMBOLOS_PREENCHIDAS.json` |

## O que ainda precisa de paisagem documentada

Permanecem **seis parques sem galeria de fotografias geográficas/cênicas**: Albardão, Boqueirão da Onça, Campos Ferruginosos, Nascentes do Lago Jari, Povos Indígenas do Rio Tanaru e Serra da Cutia. Esses parques continuam com recursos fotográficos de espécies quando disponíveis, mas **nenhuma foto externa genérica foi apresentada como se fosse um local comprovado**. Em Rio Tanaru também foram evitadas imagens substitutivas de povos indígenas.

Outros **11 parques têm apenas uma foto de galeria**, conforme `COBERTURA_77_PARQUES.csv`.

## Direitos e créditos

A presença de um arquivo no Commons não dispensa a leitura de sua licença individual. As fontes novas desta rodada indicam CC BY-SA 4.0, com autoria, URL e licença preservadas. A interface usa enquadramento responsivo sem editar os arquivos originais.

**Alerta histórico:** o acervo anterior já possuía uma foto em Ilhas dos Currais marcada `CC BY-NC 4.0` (iNaturalist). Este registro não foi incorporado nesta rodada e não deve ser tratado automaticamente como seguro para uso comercial. O teste de fotos aponta o caso.

**GFDL / licença dupla:** podem ser candidatas à curadoria, mas exigem revisão de obrigações específicas e não são adicionadas automaticamente pelo script. Licenças incompatíveis como ND ou ausência de licença não foram tratadas como livre autorização de recorte.

## Testes

- `npm run check:photos:v132`: **PASSOU**, incluindo conteúdo, fusão de textos, galerias e créditos.
- `node scripts/check-ts-syntax-v132.cjs`: **48 fontes TypeScript/TSX transpiladas sem erros de sintaxe**.
- Todas as Expedições e versões originais foram preservadas pelo teste de integração.
- Compilação completa Next.js/QA visual em navegador: **não executadas**, faltam dependências npm instaladas neste ambiente.
- Disponibilidade de todas as URLs remotas e revisão espacial integral: **pendentes**. A identificação das quatro fotos novas foi conferida em páginas Commons, mas o processamento pelo navegador permanece a testar.

## Arquivos

- `COBERTURA_77_PARQUES.csv`: lacunas de galeria, fotos botânicas e zoológicas por parque.
- `REGISTRO_ALTERACOES_IMAGENS.csv`: alterações individuais de galeria.
- `BACKUP_IMAGENS_SUBSTITUIDAS.json`: foto removida da galeria, guardada integralmente para reversão.
- `FOTOS_SIMBOLOS_PREENCHIDAS.json`: total e distribuição das fotos de espécies-símbolo vinculadas.
