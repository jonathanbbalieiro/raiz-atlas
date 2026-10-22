# RAIZ v1.3.4 — Relatório de preparação do pacote público

Data: 22/10/2026. Base técnica e editorial: arquivo `raiz-atlas-v1.3.3-curadoria-visual-completo.zip`.

## Escopo concluído

- **Sem redesign:** UI, mapa e imagens da v1.3.3 mantidos; mudanças concentradas em publicação, SEO, permissões de imagens, inicialização, segurança HTTP e documentação.
- Configuração de **produção aberta** preserva controles editoriais; rascunhos não são automaticamente publicados.
- Configuração de **prévia editorial** usa `RAIZ_PREVIEW_DRAFTS=1`, bloqueia indexação no sitemap e no `robots.txt`, e marca metadados como `noindex`. A hospedagem deve exigir autenticação para acesso privado.
- Fotos sob CC BY-NC, ND, GFDL ou licença não reconhecida são excluídas das superfícies públicas em produção; arquivos-fonte e créditos continuam intactos. 13 referências CC BY-NC catalogadas na base.
- Iniciador Windows corrigido para realizar `npm ci` e `npm run build` quando necessário; não pressupõe a existência de `.next` no ZIP.
- Recomendados cabeçalhos de segurança básicos, sem impor CSP que quebre a visualização dos mapas.
- Procedimento de publicação e verificação em `PUBLICAR_RAIZ.md` e `.env.example`.

## Inventário editorial

| Tipo | No projeto | Aprovados para publicação |
|---|---:|---:|
| Parques nacionais | 77 | 77 fichas oficiais, fotos e biodiversidade com restrições aplicadas |
| Expedições | 75 | 0 |
| Guias | 77 | 0 |
| Mundo Perdido | 19 | 0 |
| Levantamentos de biodiversidade | 77 | 77 (registros gerados e devidamente contextualizados) |

As 49 Expedições originais preferidas permanecem idênticas no conteúdo e os 26 acréscimos continuam sem aprovação.

## QA executado

- `npm run check:publish` **PASSOU**.
- `node scripts/check-publication.mjs --strict` com URL HTTPS de teste **PASSOU**.
- Teste negativo `--strict` com `RAIZ_PREVIEW_DRAFTS=1` **bloqueou** como esperado.
- 48 arquivos TypeScript/TSX parseados com compilador TypeScript: **0 erros sintáticos**.
- Classificação de licenças CC BY-SA, CC BY, domínio público, CC0, CC BY-NC, CC BY-ND, GFDL e "All rights reserved": **8 casos esperados**.
- `npm ci --offline` **NÃO CONCLUIU** devido à ausência de `zstddec@0.2.0` no cache; logo não foram executados build Next.js, typecheck completo com dependências nem teste de navegador.

## Critérios pendentes para lançamento integral

1. Definir domínio final e `NEXT_PUBLIC_SITE_URL` e configurar hospedagem HTTPS.
2. Executar `npm ci`, `npm run release:verify`, `npm run build` e testes visuais no ambiente conectado.
3. Revisar e aprovar guias e Expedições antes de publicá-los como conteúdo final (caso queiram fazer parte do lançamento).
4. Conferir direitos e disponibilidade dos arquivos de foto remotos e atribuições de mapas, bem como links e fontes científicas.

### Comportamento padrão seguro

`RAIZ_PREVIEW_DRAFTS=0`: público vê mapa, fichas, biodiversidade e fotografias autorizadas; manuscritos ainda não aprovados permanecem arquivados.

`RAIZ_PREVIEW_DRAFTS=1`: prévia de revisão para equipe editorial, com indexação desativada; requer proteção de acesso por autenticação.
