# Continuidade da curadoria e revisão textual — 26/10/2026

## Fotos verificadas nesta rodada

- **Lychnophora pinaster:** incorporada uma fotografia de detalhe de folhas e
  ramos (1024 × 768), de João Medeiros, CC BY 2.0. Uma candidata de
  paisagem distante foi descartada. A foto escolhida é de Diamantina, conforme
  a fonte; ilustra a espécie no Gandarela, sem alegar ter sido feita no parque.
- **Hippocampus reidi:** incorporada fotografia de Brian Gratwicke, CC BY 2.0,
  original de 3913 × 2581, com miniatura de 1280 px. Conferidos imagem, descrição,
  autor e licença. Ilustra o destaque de Jericoacoara sem confirmar local da foto.
  Duas candidatas menores com marca d'água foram preteridas.
- **Jacaranda copaia:** retirada a associação com `Jacaranda1212.jpg` em
  Anavilhanas e Campos Ferruginosos. A descrição e a categoria do Commons
  identificam **Jacaranda mimosifolia**, fotografada em Whakatāne, Nova Zelândia.
  O uso para a espécie correta em Sete Cidades não foi removido. Não foi criada
  fotografia substituta sem identificação suficiente.
- Busca por **Theobroma subincanum** devolveu fotos de **T. speciosum**:
  descartadas, sem troca indevida de espécie para preencher a lacuna.

As duas imagens incorporadas foram abertas e inspecionadas visualmente, e seus
arquivos retornaram HTTP 200 com identificação de cliente apropriada. Isso não
equivale a uma revisão taxonômica por especialista. Fontes e justificativas das
rejeições estão em `data/br/photo-curation.json`. A camada é aplicada antes do
catálogo de reuso, preservando os JSON gerados originais.

## Coerência textual

Foram examinados os 77 guias por triagem local, cruzamento com as categorias da
base e leitura dos trechos sinalizados. Alterações pontuais:

- Anavilhanas: retirada a comparação não demonstrada “mais preservado”.
- Vale do Pati: retirada a exclusividade de hospedagem em casas de moradores;
  preservada a informação sobre a possibilidade de hospedagem na travessia.
- Boto no Jaú: o texto dizia “vulnerável”, mas a ficha exibia EN. Retirada a
  categoria contraditória do texto; ambas as categorias denotam ameaça.
- Sagui de Jamanxim: o texto dizia “vulnerável”, mas a base exibia LC. Retirada
  a classificação do texto, preservando a justificativa geográfica. A categoria
  correta continua exigindo conferência taxonômica e temporal nas fontes; LC
  não foi automaticamente tomado como verdadeiro.

A triagem reproduzível `node scripts/audit-editorial.mjs` registra **58 sinais**
em `revisao-editorial.json`: comparações que precisam de conferência, justificativas
repetidas e a associação fotográfica incorreta agora rejeitada. Os sinais não
são 58 erros confirmados. Não foi feita validação factual integral de todas as
expedições ou de todas as fontes citadas.

## Resultado e verificações

Restam 11 destaques sem foto (antes, 12). Nas abas por grupo, há 152 referências
sem foto, incluindo 93 plantas. O número cresceu apesar de uma foto de planta
incorporada: foram retiradas duas associações erradas. A correção de identidade
tem prioridade sobre a redução artificial das lacunas.

O carregador e a auditoria agora usam a mesma camada de revisão. Há teste de
regressão para impedir que uma rejeição afete a espécie correta ou altere os
dados originais. O prebuild valida créditos, contexto, URLs e dimensões das
imagens da camada de revisão.

Passaram oito testes, lint, TypeScript pelo build, validação editorial e build
com 194 páginas pré-renderizadas. As páginas de Jericoacoara e Gandarela foram
verificadas por requisição local no servidor de produção.

O acesso ao Commons voltou a funcionar. Neste ambiente, chamadas Node sem uso
do proxy falham com ECONNREFUSED; Node 24 funciona com `NODE_USE_ENV_PROXY=1`.
Downloads Wikimedia exigiram um User-Agent que identifica o projeto. Não foi
desativada verificação TLS. Os relatórios anteriores registram o bloqueio visto
naquela rodada e não representam mais o estado atual do acesso à API.

# Auditoria de prontidão — 27/10/2026 (tarde)

## Situação recalculada

`npm run audit:photos` regenerado sobre a base atual (os números abaixo já incluem
as duas fotos desta rodada):

- Destaques editoriais sem foto: 6 (Serra do Teixeira, Serra Geral, Tijuca,
  Pacaás Novos, Ubajara, Guaricana). Antes desta rodada: 8.
- Maravilhas naturais sem foto: 73, em 47 parques.
- Galerias vazias: 10 parques (Serra das Lontras, Nascentes do Rio Parnaíba,
  Acari, Albardão, Boqueirão da Onça, Campos Ferruginosos, Nascentes do Lago
  Jari, Rio Tanaru, Serra da Cutia, Serra da Mocidade). Outros 7 têm 1 ou 2 fotos.
- Espécies únicas sem foto nas abas por grupo e de ameaçadas: 331 nomes
  científicos. As referências (`sem_foto`) somam 478, porque a mesma espécie
  aparece em mais de um parque ou aba. Não somar os dois números.

## Fotos incorporadas (abertas, conferidas visualmente, URL com HTTP 200)

- **Tropidurus hygomi** (Serra de Itabaiana): Rony Almeida, CC BY-NC 4.0,
  iNaturalist obs. 45035005. **Feita no parque**: coordenada com precisão de
  ~150 m dentro do polígono do projeto; seis identificações concordantes.
  Ressalva: assinatura pequena no canto inferior esquerdo.
- **Placosoma cipoense** (Serra do Cipó): a_f_r, CC BY-NC 4.0, obs. 149061465.
  **Ilustrativa**: sete identificações concordantes, localização ofuscada em
  Minas Gerais, perto de −18,2° de latitude (fora da Serra do Cipó).

## Candidatas rejeitadas

- *Bothrops jabrensis*, obs. 237552436 e 215792789 (CC BY, 13 identificações):
  quem publicou declara não ser o autor ("apenas recebi de uma amiga"). Sem
  autoria, a licença não é válida.
- *Placosoma cipoense*, `File:Placosoma cordylinum in Paraty, Brazil.jpg`:
  arquivo nomeado como outra espécie, "supostamente" *P. cipoense*, em Paraty
  (RJ). Identificação conflitante.
- *Alouatta ululata*, obs. 223854589 (assinatura gravada, animal encoberto),
  196060519 e 196060624 (desfocadas, rosto encoberto por folhas).
- *Tropidurus hygomi*, obs. 314775481: feita no parque, mas o animal aparece
  contido na mão, com laço de captura e relógio em destaque. Preterida pela
  obs. 45035005. Obs. 200145176 (Bahia): cauda cortada, foco suave.
- Sem resultado livre no Commons nem no iNaturalist: *Thoropa lutzi*,
  *Brachycephalus pombali*, *Allobates pacaas* (a única observação não tem licença
  aceita) e *Corvomeyenia epilithosa*.

## Categoria de ameaça: escopo explícito

A ficha mostra a categoria **global** (IUCN, via GBIF/Wikidata); vários planos de
manejo usam a **Lista Nacional (MMA, 2022)**. Em Ubajara, o texto dizia "em perigo"
e o selo dizia "Vulnerável" no mesmo cartão. Conferido no plano de manejo
(p. 16): EN na Lista Nacional. Textos ajustados para nomear a lista em Ubajara
(2), Jaú (1) e Sete Cidades (2). O selo agora diz "· IUCN global" e a ficha da
espécie informa fonte, abrangência e data da base. O `check:content` reprova
destaque cuja categoria no texto difere da categoria da ficha sem nomear a lista.

## Build local

No Windows desta máquina, `npm run build` gera todas as páginas do sitemap e
então para sem uso de CPU, antes de gravar `prerender-manifest.json`. Isso também
acontece fora do OneDrive. O site publicado corresponde ao último commit, então o
build da Vercel passa. Até a causa ser encontrada, a validação local usa `next dev`.
