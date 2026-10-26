# Segurança

## Como reportar uma vulnerabilidade
Escreva para jonathanbalieiro@gmail.com com o endereço afetado e os passos para reproduzir. Não abra
issue pública com detalhes de falha. O contato também está em `/.well-known/security.txt`.

## O que protege o site
- Site estático: sem banco de dados, sem login, sem formulário e sem cookies; não há dado de usuário
  para vazar.
- Cabeçalhos de segurança e política de conteúdo (CSP) em `next.config.ts`: só o próprio site, o
  Wikimedia, o iNaturalist, o provedor de mapa e o de relevo podem carregar recursos; nenhuma página
  pode ser embutida em outro site.
- Dependências verificadas a cada alteração (`npm audit` no CI) e atualizações semanais pelo Dependabot.
- Nenhum segredo no repositório; `.env*` fica fora do Git.

## Regras para quem mantém
- Verificação em duas etapas no GitHub, na Vercel e no Registro.br; DNSSEC ativado no domínio.
- Proteger a branch `main` (revisão obrigatória, sem push forçado).
- Não colocar chaves privadas em variáveis `NEXT_PUBLIC_*` (são públicas).
- Não ativar `RAIZ_PREVIEW_DRAFTS` em produção.
- Ao acrescentar um host de imagens ou de mapa, atualizar também a CSP.
