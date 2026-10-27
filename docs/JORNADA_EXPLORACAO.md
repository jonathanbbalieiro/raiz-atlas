# Jornada de exploração do painel

A revisão de UX, frontend e dados separou três intenções: descobrir o parque,
escolher uma espécie e conhecer seus detalhes.

## Ficha do parque: descoberta

Fauna e flora é um carrossel, sem busca nem filtros dentro da ficha. Antes das
fotos há título, uma frase e uma linha de contagem. A faixa começa pelos
destaques editoriais (etiqueta "Destaque", justificativa, fontes e créditos) e
segue, sem limite, com as demais espécies da seleção na ordem do levantamento,
marcadas como registro: "Registrada no levantamento: N registros na área
consultada". Disponibilidade de foto não muda a ordem. Um cartão final e o CTA
abaixo levam ao explorador; método, limites e fontes ficam em uma única
divulgação “Sobre a seleção e as fontes”, depois do conteúdo.

Até 27/10/2026 a prévia mostrava só até quatro destaques; como 60 parques têm
três, a faixa acabava cedo. A seta dos carrosséis avança uma "página" (os
cartões que cabem inteiros na largura visível), não um cartão por vez.

## Explorador: escolha

A abertura é uma grade visual, começando pelos destaques editoriais quando
existem. Categorias permitem explorar todas, animais, plantas ou ameaçadas.
A busca é opcional e aplica-se à seleção atual. Não há lista lateral ou região
interna com rolagem própria: a rolagem é a do painel.

A ordenação respeita a edição e depois a ordem original do levantamento.
Disponibilidade de fotos e número de registros não promovem espécies sozinhos.
As categorias mantêm os vínculos de grupo conhecidos, sem inferir animais ou
plantas para espécies ainda não classificadas nos grupos disponíveis.

## Ficha da espécie: leitura

Uma escolha abre a ficha no mesmo espaço, com nome, foto limitada a 320px/34dvh,
relação documentada com o parque e conservação. Dados técnicos e contexto da
fotografia ficam acessíveis em segundo nível. A imagem continua sem recorte
artificial e abre no visualizador existente.

Anterior/próximo percorrem apenas a seleção atual, sem circular nas pontas.
Voltar restaura categoria, busca, posição e foco no cartão que abriu a leitura.
Uma entrada de histórico permite usar o Voltar do navegador para retornar à
grade; anterior/próximo substituem essa entrada, sem criar uma longa cadeia.
A volta à ficha do parque também conserva o ponto de leitura.

A história geral do parque aparece uma vez na seleção, em bloco próprio.
Não é repetida como se fosse a história de cada espécie. Fatos e justificativas
continuam associados às referências existentes; esta revisão não criou fatos
biológicos nem alterou o levantamento original.

## Validação

- 22 testes automatizados, lint e build passaram.
- Chromium em produção local: prévia com fotos a 97px do título; ausência da
  busca, checkbox e termômetro laterais; grade, leitura e anterior/próximo.
- Retorno por botão e por histórico, incluindo Avançar, preservou contexto.
- O foco voltou ao cartão de origem após navegar por outras quatro espécies.
- Retorno ao parque preservou a posição de leitura.
- Viewport mobile 390×844: categoria e busca preservadas, sem overflow e sem
  exceções JavaScript. Imagens foram isoladas com fixture para testar interação;
  nenhum espécime ou fotografia foi substituído nos dados do site.
