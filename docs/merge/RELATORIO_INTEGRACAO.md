# RAIZ v1.3.0 — Base preferida pelo responsável

**Base:** `raiz-atlas-executavel.zip` (arquivo TAR identificado incorretamente como ZIP). Esta versão é um ZIP válido, sem artefatos `.next` nem dependências vendorizadas.

## Regras
- **49 Expedições existentes na build preferida:** texto integralmente preservado byte por byte (SHA-256 em `preserve-original-49.json`). Não houve substituição de narrativa, título, capa ou redação.
- **26 Expedições ausentes:** copiadas da v1.2.7, mantidas em revisão; a redação das novas matérias ainda não foi harmonizada individualmente ao estilo da build preferida.
- **Guias originais:** preservados, salvo a inclusão de três maravilhas botânicas na Chapada dos Veadeiros; textos pré-existentes intactos.
- **Interações originais:** quiz, Mundo Perdido, progresso de leitura, mapa, filtros e galeria mantidos.
- **Flora:** adicionada seção visual independente que utiliza os registros e créditos **já existentes** de plantas, sem inventar frequência de observação. Script de pesquisa preparado para até 30 plantas por parque e novas licenças Commons, mas **não executado** em rede nesta etapa.
- **Fotografias adicionais:** galerias somente com acréscimos, nunca substituições (ver `fotos-adicionadas.json`). Para novas Expedições, imagens pertencem aos seus respectivos manuscritos em revisão.
- **Correções do cadastro:** atributos administrativos de cinco parques importados da v1.2.7; limites do mapa não foram alterados.
- **Controle editorial:** rascunhos não publicados automaticamente; a build preferida tinha zero Expedições aprovadas e esse estado é preservado.

## Métricas
- 77 parques cadastrados; 75 Expedições estruturadas (49 originais + 26 novas);
- 2 fotos adicionais no acervo de galeria geral; 3 imagens botânicas no guia da Chapada;
- 49 de 49 textos originais preservados por SHA-256.

## Uso
No PowerShell, dentro da pasta `raiz-atlas`:

```powershell
npm ci
npm run check:merge
npm run dev
```

Para gerar versão de produção: `npm run build` (os rascunhos permanecem inacessíveis na publicação).
Para atualizar **com internet e backup** o recorte botânico: `npm run bio:expand`.

## Atenção
Esta integração é uma fusão de código e dados, **não** uma revalidação científica de todas as alegações ou licenças, nem garantia de imagens acessíveis ao vivo. Alterações dos polígonos legais exigem sincronização geográfica controlada. Testes de navegador e build Next.js dependem de instalação de pacotes disponível no ambiente.

## Checagem documental adicional
- Criação da Serra dos Órgãos em 1939 e decreto de limites nº 90.023 de 02/08/1984 (texto original da Câmara); a página de resumo do ICMBio registra uma data diferente para o último decreto e deve ser reconciliada na revisão editorial.
- Ampliação de Sete Cidades por Decreto nº 13.115 de 08/09/2026 para aproximadamente 13.502 hectares; o polígono no mapa continua aguardando atualização.
- Fotografias de Floresta Nacional do Jamanxim, contexto conjunto Jamanxim/Rio Novo, estrada regional, prancha de espécie e satélite de Abrolhos **não foram incorporadas à galeria pública** por falta de especificidade geográfica ou de semântica adequada ao campo de imagem.
- Capas institucionais de Acari e Nascentes do Lago Jari com nota de licença ND não confirmada estão em `capas-pendentes.json`, fora das prévias e da produção.
