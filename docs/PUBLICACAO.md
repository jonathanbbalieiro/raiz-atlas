# Publicação do Raiz

Guia para colocar o site no ar: escolha de hospedagem e domínio, passo a passo e a lista do que
conferir antes. Valores de preço e limites vêm de fontes públicas de 2026 e precisam ser
reconferidos nos sites oficiais na hora da contratação.

## 1. O que vai ao ar (e o que não vai)

O build de produção **esconde tudo que está em rascunho**. Em 27/10/2026 estavam liberados os 77
guias, 73 das 77 Expedições e os 19 arquivos do Mundo Perdido (`npm run check:publication`). As
Expedições de Albardão, Araucárias, Campos Ferruginosos e Guaricana seguem em revisão: suas URLs
respondem 404 e ficam fora do sitemap.

Fluxo recomendado:

1. **Deploy de revisão** (privado ou com `noindex`): `RAIZ_PREVIEW_DRAFTS=1`. A equipe lê tudo no ar.
2. Revisores aprovam parque a parque: `npm run approve -- guide <slug>` e
   `npm run approve -- expedition <slug>` (ou `--all` quando um lote inteiro for aprovado).
3. **Deploy de produção** sem `RAIZ_PREVIEW_DRAFTS`: só o aprovado aparece.

Prioridade de revisão humana (maior risco): textos sobre povos indígenas e comunidades tradicionais
(Pico da Neblina, Monte Pascoal, Monte Roraima, Amazônia, Catimbau, Araguaia, Descobrimento, Cabo
Orange, Sempre-Vivas, Rio Tanaru), fatos legais recentes (Sete Cidades, Jamanxim, Ilha Grande) e
números de áreas.

## 2. Hospedagem

| Opção | Quando escolher | Custo aproximado | Observações |
|---|---|---|---|
| **Vercel** (recomendada) | Quer publicar rápido, com pré-visualização por mudança e CDN global | Hobby gratuito (só uso pessoal e não comercial); Pro cerca de US$ 20 por usuário/mês | Next.js 16 com Cache Components funciona sem configuração. Hobby não pode ser usado em projeto comercial. |
| Cloudflare (Workers/Pages) | Quer custo baixo e uso comercial liberado | Plano gratuito generoso | Exige adaptador (OpenNext); o suporte ao Next 16 com Cache Components precisa ser testado antes. |
| VPS própria (Docker + `next start`) | Quer controle total e custo fixo | A partir de cerca de R$ 30 a 60/mês | Você cuida de atualizações, HTTPS, backup e escala. |

**Recomendação:** Vercel. Comece no Hobby se o projeto for pessoal e sem monetização; passe para o
Pro quando houver patrocínio, anúncio, venda ou uso institucional pago. O site é estático (116
páginas geradas no build), então o consumo é baixo.

### Imagens e custo
As fotos vêm do Wikimedia Commons e do iNaturalist, que já entregam miniaturas em larguras padrão
pela própria CDN. O site usa um **loader próprio** (`src/lib/image-loader.ts`): o navegador pede a
largura certa direto à origem, então **não há cobrança nem limite de otimização de imagem no
host**. Se um dia o tráfego for grande, vale espelhar as fotos mais vistas num armazenamento
próprio (por exemplo Cloudflare R2) para não depender da disponibilidade do Wikimedia.

## 3. Domínio

Registro de `.com.br` pelo **Registro.br**: cerca de R$ 40 por ano, aceita CPF ou CNPJ; os dados do
titular ficam públicos no WHOIS (confira a política atual).

Consulta de disponibilidade feita em 22/10/2026 (RDAP; **confirme no Registro.br antes de comprar**):

| Nome | Situação na consulta |
|---|---|
| `raizatlas.com.br` | sem registro |
| `atlasraiz.com.br` | sem registro |
| `raizparques.com.br` | sem registro |
| `raizatlas.com` / `raizatlas.app` | sem registro |
| `raiz.com.br`, `raiz.app`, `raizbrasil.com.br` | já registrados |

**Recomendação:** `raizatlas.com.br` como endereço principal (curto, descreve o produto, tem
selo de Brasil) e, se quiser proteger a marca, `raizatlas.app` apontando para ele. Evite o `.org.br`
(exige ser entidade sem fins lucrativos) e o `.tur.br` (turismo, com exigências próprias).

### Ligar o domínio à Vercel
1. Projeto na Vercel → **Settings → Domains** → adicionar `raizatlas.com.br` e `www.raizatlas.com.br`.
2. No painel do Registro.br (DNS do domínio), criar os registros que a Vercel mostrar (um `A` para o
   domínio raiz e um `CNAME` para o `www`; use os valores exibidos na tela, que podem mudar).
3. Aguardar a propagação; o certificado HTTPS é emitido sozinho. Definir um dos dois como principal
   e redirecionar o outro.
4. Ajustar `NEXT_PUBLIC_SITE_URL=https://raizatlas.com.br` (canônicos, sitemap e Open Graph).

## 4. Passo a passo do primeiro deploy

1. Criar o repositório (GitHub) e enviar o projeto (a pasta `.geo-cache` e `node_modules` não vão).
2. Vercel → **Add New → Project** → importar. Framework: Next.js (detectado). Node 20 ou superior.
3. Variáveis de ambiente: `NEXT_PUBLIC_SITE_URL` (obrigatória). `RAIZ_PREVIEW_DRAFTS=1` **só** no
   ambiente de revisão.
4. Primeiro deploy → conferir `/`, um parque (`/br/go/chapada-dos-veadeiros`), `/robots.txt` e
   `/sitemap.xml`.
5. Domínio (seção 3).
6. Google Search Console: verificar o domínio e enviar `/sitemap.xml`.

## 5. Lista de conferência antes de divulgar

- [ ] `npm run build` limpo (já roda a validação de conteúdo antes).
- [ ] Guias e Expedições aprovados por revisão humana (ou assumido que só o mapa vai ao ar).
- [ ] Revisão por lideranças e pela Funai dos textos sobre povos indígenas.
- [ ] **Licenças das fotos:** todas têm autor e licença visíveis. Cerca de 30 fotos são **CC BY-NC**
      (uso não comercial). Se o site tiver anúncio, patrocínio, venda ou for de empresa, troque-as ou
      peça licença ao autor; use `grep -l "BY-NC" data -r` para listá-las.
- [ ] Página "Sobre e créditos" (fontes: ICMBio, IBGE, GBIF, Wikimedia, iNaturalist) e contato.
- [ ] Sem cookies nem rastreadores hoje; se acrescentar análise de acesso, avisar na política de
      privacidade (LGPD) e, conforme a ferramenta, pedir consentimento.
- [ ] Imagem de compartilhamento (Open Graph) e ícone do site.
- [ ] Teste no celular e no desktop; rodar o Lighthouse na URL real.

## 6. Atualizar depois do ar

- Conteúdo: editar os JSON em `data/br/parks/<parque>/`, commit e push; a Vercel publica sozinha.
- Espécies: `npm run bio -- <slug>`; exclusões (cultivadas, domésticas) em `data/br/bio-exclusions.json`
  (`node scripts/clean-biodiversity.mjs`).
- Fotos: `node scripts/upgrade-photo-resolution.mjs` normaliza a resolução; `node scripts/warm-thumbs.mjs`
  pré-aquece as miniaturas grandes no Wikimedia.

## 7. Segurança

**O que já está no projeto**
- Site estático: sem banco de dados, sem login, sem formulário, sem cookies. A superfície de ataque é
  pequena.
- Cabeçalhos em todas as páginas (`next.config.ts`): `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Permissions-Policy` (câmera, microfone, localização e pagamento desligados),
  `Strict-Transport-Security` e `Cross-Origin-Opener-Policy`. O cabeçalho `X-Powered-By` foi removido.
- **Política de conteúdo (CSP)**, só em produção: scripts, estilos e fontes do próprio site; fotos
  apenas do Wikimedia, do iNaturalist e do provedor de mapa; conexões apenas ao mapa e ao relevo;
  nenhuma página pode ser colocada dentro de outro site (`frame-ancestors 'none'`). Limite conhecido:
  o Next injeta scripts em linha, então a política usa `unsafe-inline`; uma versão com *nonce* é o
  próximo passo.
- Nenhum segredo no repositório. As variáveis `NEXT_PUBLIC_*` são públicas por definição; não ponha
  chaves privadas nelas.
- Rascunhos nunca vão à produção sem `RAIZ_PREVIEW_DRAFTS=1`; o ambiente de revisão deve ser protegido.

**O que você precisa fazer**
- Ativar verificação em duas etapas no GitHub, na Vercel e no Registro.br.
- Registro.br: ativar **DNSSEC** e manter a trava de transferência do domínio.
- GitHub: proteger a branch `main` (exigir revisão ou pelo menos impedir push forçado) e ativar o
  Dependabot para avisar de dependências vulneráveis; rodar `npm audit` de tempos em tempos.
- Vercel: proteger as pré-visualizações (Deployment Protection) e o ambiente de revisão com senha ou
  login; não colocar `RAIZ_PREVIEW_DRAFTS` no ambiente de produção.
- Depois de publicar, testar o endereço em securityheaders.com e no Mozilla Observatory.
- Se um dia houver formulário, login ou análise de acesso, revisar a CSP e a política de privacidade
  (LGPD) antes.

## 8. Aparecer no Google

**O que já está pronto**
- Cada parque e cada estado tem uma página estática com endereço próprio, título e descrição únicos,
  endereço canônico e Open Graph (foto do parque no compartilhamento).
- `sitemap.xml` e `robots.txt` gerados (o sitemap lista a home, as páginas de estado, parque e
  atração, e `/sobre`).
- Dados estruturados (JSON-LD) em cada parque: `Park`/`TouristAttraction` com coordenadas e foto,
  `BreadcrumbList` (trilha País › Estado › Parque) e `WebSite` na página inicial.
- `lang="pt-BR"`, web manifest, imagem de compartilhamento padrão, página `/sobre` com fontes e
  créditos. Rascunhos saem com `noindex`.

**Passo a passo**
1. Publicar com `NEXT_PUBLIC_SITE_URL` igual ao endereço final (com `https://`).
2. Google Search Console: criar a propriedade do tipo **Domínio** (verificação por registro TXT no DNS
   do Registro.br) ou do tipo **Prefixo de URL** (verificação pela tag HTML: coloque o código em
   `NEXT_PUBLIC_GSC_VERIFICATION` e publique de novo).
3. Em Sitemaps, enviar `https://seu-dominio/sitemap.xml`.
4. Em Inspeção de URL, pedir a indexação da página inicial e de alguns parques.
5. Fazer o mesmo no Bing Webmaster Tools (importa a propriedade do Google em um clique).
6. A indexação leva de dias a semanas; acompanhar em Cobertura e Desempenho.

**O que mais pesa no resultado**
- **Aprovar guias e Expedições**: são o conteúdo de texto rico de cada parque. Enquanto estiverem em
  rascunho, o Google só vê os dados e as fotos.
- Links de outros sites (blogs de viagem, páginas de turismo, instituições) e compartilhamento nas
  redes; peça a quem divulga que use o endereço de cada parque.
- Desempenho: medir em PageSpeed Insights na URL real e acompanhar os Core Web Vitals no Search Console.
- Manter nomes de parque e de estados no título e na primeira frase da descrição (já é a regra).
