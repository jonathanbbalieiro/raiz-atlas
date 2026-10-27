# Fauna e flora: exploração e evidência

As fichas dos parques oferecem acessos diretos a **Animais** e **Plantas**,
com contagens da seleção por grupos. Esses números não são estimativas do total
de espécies protegidas, de indivíduos ou de espécies exclusivas do parque.

Cada cartão do explorador permite abrir “Sobre esta espécie” para consultar:

- nome científico completo e família, quando informada;
- número de registros no levantamento, preservando a distinção entre contagem
  ausente e zero;
- categoria global de conservação e explicação curta; LC não garante ausência
  de pressões locais, DD não equivale a segurança e registros históricos não
  comprovam presença atual de espécies EX ou EW;
- data do levantamento e acesso à fonte.

O link de ocorrências é construído apenas quando uma fonte HTTPS do GBIF já
contém o recorte geográfico da consulta. Esse recorte é preservado e acrescenta-se
o táxon do cartão. Sem geometria, o link é apresentado como ficha taxonômica,
não como prova de ocorrência local. A consulta ao GBIF pode mudar com atualizações
da base; o levantamento e sua aproximação geográfica continuam explicitados.

As categorias da lista de ameaçadas complementam os registros dos grupos,
preservando fotos e contagens. Essa mesma união agora é usada nas abas de
animais, plantas e demais grupos. Espécies de ameaça sem grupo conhecido não são
classificadas automaticamente como animais ou plantas; continuam em Todas e
Ameaçadas. Eventuais grupos futuros, como fungos, não são contados como animais.

## Curadoria botânica desta rodada

Foi incorporada uma fotografia de **Cattleya violacea**, com flores, folhas e
hastes, de **snotch**, CC BY 2.0, original disponível em alta resolução no Commons.
A imagem foi baixada e conferida visualmente. A página da obra identifica a
espécie; a foto mostra um exemplar em vaso e não documenta o habitat ou a
ocorrência no parque. Os créditos e a origem estão em `data/br/photo-curation.json`.

Foram descartadas como substitutas automáticas: fotografia de Drosera ascendens
retornada na busca por D. villosa; a foto já rejeitada de Jacaranda mimosifolia
retornada por J. copaia; pranchas de madeira, exsicatas e ilustrações que não
atendem à apresentação fotográfica desejada. Uma candidata de J. copaia de
768 px permaneceu pendente de revisão mais forte de identificação e qualidade.

Não foram criadas afirmações sobre funções ecológicas, endemismo ou prioridade
local sem fonte específica. As justificativas dos destaques editoriais continuam
associadas às suas referências originais.
