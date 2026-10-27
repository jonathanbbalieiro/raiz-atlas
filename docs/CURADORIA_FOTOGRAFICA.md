# Fotografias e seleção de espécies

## O que uma foto permite afirmar

Separe três verificações: **identificação da espécie**, **local da fotografia** e
**evidência de ocorrência no parque**. Uma não substitui a outra. A mesma foto
de uma espécie pode ilustrar diferentes parques se houver evidência independente
de ocorrência em cada um e se a legenda deixar claro o caráter ilustrativo.
Uma foto de espécie feita em outro país nunca deve virar uma capa do parque.

**Fotos de animais e plantas podem ter sido feitas fora do parque** (decisão de
27/10/2026). Para fichas, destaques e cartões de espécie, a qualidade e a
identificação correta pesam mais que o local: prefira uma foto nítida, com o
organismo inteiro, feita em qualquer lugar, a uma foto fraca feita no parque.
Condições:

- a identificação da **mesma espécie** precisa estar confirmada na página
  original; espécie aparentada ou do mesmo gênero não serve;
- o `context` diz que a imagem é ilustrativa e, quando souber, onde foi feita;
  uma foto ilustrativa não serve como prova de que a espécie ocorre no parque;
- se houver duas candidatas de qualidade equivalente, a feita no parque ganha.

Essa liberdade vale só para organismos. Capas, galerias, maravilhas e atrativos
continuam exigindo prova de lugar.

O catálogo de `src/lib/species-photos.ts` reaproveita somente a identificação já
registrada no projeto, por nome científico idêntico. Exige nome científico no
texto alternativo, largura cadastrada de pelo menos 960 px, autor identificado
e licença livre reconhecida. Preserva imagens escolhidas explicitamente no guia
e os arquivos de biodiversidade gerados. Não confirma identificação visual,
licença atual, resposta HTTP ou localização: isso continua exigindo revisão na fonte.

## Critérios de aceitação de novas imagens

1. Abra a página original e confira o organismo ou o local descrito. Nome do
   arquivo, categoria e resultado de busca são pistas, não provas suficientes.
2. Para paisagens, compare o relevo e os elementos visíveis com uma fonte do
   parque. Confirme os limites: município, região ou bioma em comum não bastam.
   Registre a fonte que sustenta o local na legenda `context`.
3. Para organismos, use o nome científico aceito e uma identificação rastreável.
   Atenção a espécies parecidas, sinônimos, juvenis e diferenças entre sexos.
   Não substitua uma espécie sem foto por outra do mesmo gênero ou nome popular.
4. Prefira fotografias nítidas, sem marca d'água e com o sujeito inteiro. Para
   plantas, priorize hábito e detalhes diagnósticos (folhas, flores, frutos)
   identificados; uma exsicata pode servir à pesquisa, mas não deve ser apresentada
   como fotografia da paisagem. Não complete partes do organismo com IA.
5. Para capa e reportagem, prefira largura disponível de 1920 px e boa dimensão
   menor; para espécies, 1280 px. A largura sozinha não mede nitidez. Confira a
   foto no tamanho em que será exibida, em telas comuns e de alta densidade.
6. Guarde autor, licença, URL da licença, URL da obra, dimensões, `alt` descritivo
   e `context`. O propósito educativo não substitui autorização. Prefira CC0,
   domínio público, CC BY ou CC BY-SA, preservando suas condições. A base também
   contém imagens NC: seu uso fica limitado pela licença e está sinalizado na
   auditoria; não é correto descrevê-las como automaticamente bloqueadas pelo site.
7. Se a identificação ou o lugar não estiverem demonstrados, mantenha a lacuna.
   Nenhum limiar de resolução ou algoritmo de ranking substitui revisão visual.

Os cartões de espécies agora usam `object-contain`, sem corte automático da cabeça,
cauda, flor ou folha. O link abre a obra original. Os créditos continuam visíveis.
A galeria também preserva a imagem inteira; a capa tem composição própria e pode
recortar, mas abre a fotografia completa no visualizador.

## Por que estas espécies, e não outras?

Há duas seleções diferentes, explicadas na interface:

- **Destaques editoriais:** cada `guide.flagships[]` tem justificativa `why` e
  fontes `sourceIds`. Sua seleção deve responder a um vínculo específico com
  a unidade: endemismo documentado; habitat crítico; conservação de uma espécie
  ameaçada; papel ecológico documentado; ou relação cultural sustentada por fonte.
  Ameaça global, sozinha, não prova prioridade local. Evite justificativas
  intercambiáveis entre parques. Não chame a escolha de símbolo oficial sem fonte.
- **Levantamento por grupo:** é uma amostra de ocorrências, não um censo. A base
  histórica priorizou fotos e nomes populares antes da contagem de registros;
  essa limitação fica explícita. As próximas execuções de `npm run bio` ordenam
  os candidatos pelo número de registros, com desempate pelo nome científico,
  independentemente da fotografia (`selectionPolicy: records-first`). Os dados
  antigos não foram regenerados nesta revisão.

Nas futuras revisões, escolha de 2 a 4 destaques complementares, incluindo flora
quando houver documentação suficiente. Não imponha exclusividade artificial: uma
ariranha pode ser relevante em vários parques, com justificativas e fontes locais.
Não force uma cota com afirmações sem evidência. A categoria IUCN exibida é global;
não descreve o tamanho ou a tendência da população daquele parque. A envoltória
convexa usada em alguns levantamentos também pode conter áreas do entorno.

O resumo de espécies e ameaça exibido em cada ficha usa apenas os registros já
incluídos na seleção. Não é o total da biodiversidade do parque.

## Fila de trabalho e ferramentas

Execute `npm run audit:photos` e consulte
[a fila por parque](audits/fotos-atual/LEIA-ME.md) e o JSON com cada caminho e fonte.
O relatório verifica metadados locais; não chama uma imagem de quebrada sem
uma verificação HTTP, nem chama uma foto de correta sem inspeção visual.

Para pesquisar novas candidatas, use os comandos já existentes:

```bash
npm run photo -- search "nome científico ou lugar dentro do parque"
npm run photo -- file "File:Nome exato do arquivo.jpg" "Descrição do que a foto mostra"
node scripts/fill-park-photos.mjs
node scripts/auto-wonder-photos.mjs
node scripts/upgrade-photo-resolution.mjs --dry
```

Os três últimos podem envolver muitas consultas. Comece pelo modo de relatório e
pelos parques prioritários; confira as candidatas antes de usar `--apply`.
São necessários Commons/Wikidata acessíveis pela política de rede. A revisão atual
encontrou `403 CONNECT` nessas fontes e não conseguiu buscar ou validar fotos novas.

Nunca trate uma categoria do Commons como prova suficiente para aprovar em massa.
As ferramentas antigas têm heurísticas automáticas: seu resultado exige revisão.
Mantenha novos textos factuais em rascunho com fontes primárias até revisão editorial.
