# RAIZ v1.3.4 — instruções de publicação

**Base:** RAIZ v1.3.3, sem redesign. Código-fonte do projeto Next.js, não um site HTML estático nem a pasta `.next` pronta.

## 1. O que entra em um site público agora

- Mapa interativo MapLibre, dados oficiais disponíveis no projeto, 77 fichas de parques, fotografias livres com crédito e catálogo gerado de biodiversidade (incluindo o quiz).
- As 75 Expedições permanecem **não aprovadas**, os 77 guias são **rascunhos**, assim como os 19 módulos Mundo Perdido. Esses materiais **ficam fora** da publicação pública por padrão. Os arquivos estão preservados para aprovação posterior.
- Na publicação, a interface filtra fotos CC BY-NC, ND, GFDL ou com licença não reconhecida nas superfícies públicas. Elas continuam nos arquivos originais e podem ser reavaliadas; outras exigências, como atribuição e ShareAlike, permanecem válidas.
- A prévia editorial pode mostrar rascunhos identificados como tal, mas **não é a versão pública**.

**Importante:** o pacote está preparado para deploy. Não representa declaração de que todas as fontes e fotografias foram juridicamente revalidadas ou de que uma compilação completa já passou neste ambiente.

## 2. Pré-requisitos

- Node.js 20.9 ou superior (preferencialmente uma versão LTS com suporte para o Next.js especificado pelo projeto).
- Internet durante `npm ci`, compilação (fontes e outros recursos) e acesso ao mapa e às fotografias.
- Um repositório Git (para Vercel) ou servidor Node.js com HTTPS e domínio.

## 3. Publicar na Vercel

1. Extraia o ZIP e envie **o conteúdo da pasta `raiz-atlas`** para um repositório Git novo.
2. Na Vercel, escolha **Add New Project**, importe esse repositório e selecione **Next.js**. A raiz deve conter `package.json`.
3. Configure as variáveis de ambiente do projeto:

   | Variável | Valor recomendado |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | URL exata do domínio público, por exemplo `https://atlas.seudominio.com.br` |
   | `RAIZ_PREVIEW_DRAFTS` | `0` (ou não definir) |

4. Use `npm ci` como instalação e `npm run build` como compilação; deixe o diretório de saída padrão do Next.js.
5. Configure o domínio e HTTPS na hospedagem e execute o deploy. O site é preparado para `/` e `/br`.
6. Confira em navegador de computador e celular: mapa/carregamento das camadas, zoom, seleção do parque, painéis, imagens, links e créditos, quiz, `robots.txt`, `sitemap.xml`, pesquisa e navegação por teclado.
7. Confirme a URL canônica e o cartão de compartilhamento das páginas publicadas.

### Verificar localmente antes do deploy

```bash
npm ci
npm run check:publish
NEXT_PUBLIC_SITE_URL=https://seu-dominio-real.com.br npm run release:verify
NEXT_PUBLIC_SITE_URL=https://seu-dominio-real.com.br npm run build
npm run start
```

No Windows PowerShell, o equivalente para definir a variável é:

```powershell
$env:NEXT_PUBLIC_SITE_URL = 'https://seu-dominio-real.com.br'
$env:RAIZ_PREVIEW_DRAFTS = '0'
npm ci
npm run release:verify
npm run build
npm run start
```

Se você ainda não tiver domínio, use a URL HTTPS fornecida pela Vercel; **não** use `http://localhost:3000` como canônica de produção.

## 4. Prévia editorial fechada (opcional)

Para revisar as 75 Expedições, 77 guias e módulos Mundo Perdido em um segundo ambiente:

- Crie **outro deploy de prévia**, não no domínio público.
- Defina `RAIZ_PREVIEW_DRAFTS=1` e `NEXT_PUBLIC_SITE_URL` como a URL HTTPS desse ambiente.
- Proteja o acesso com autenticação da própria plataforma (Deployment Protection, SSO ou senha). O arquivo `robots.txt` bloqueia indexação e os metadados trazem `noindex`, mas **isso não impede alguém com o endereço de acessar o conteúdo**.
- Ao aprovar um manuscrito, use as ferramentas editoriais do projeto após conferência de fatos, créditos e fontes; reconstrua a produção.

## 5. Licenças e conteúdos

- Fotografia hospedada no Wikimedia Commons **não significa** automaticamente domínio público; cada imagem conserva sua licença, fonte e autoria individual.
- CC BY, CC BY-SA, CC0 e domínio público são tratadas como candidatas à publicação com créditos. ShareAlike e eventuais condições para adaptações precisam ser respeitadas.
- CC BY-NC não deve ser usada no projeto comercial ou potencialmente monetizado sem autorização específica; arquivos GFDL e outros casos especiais precisam de análise jurídica/editorial antes de serem habilitados.
- O site pode exibir retratos de uma espécie feitos **fora** do parque, indicando essa limitação. Nunca descreva esses retratos como fotografias tiradas no parque sem comprovação.
- Mapas: tiles OpenFreeMap/OSM e relevo AWS Mapzen dependem de serviços externos; respeite atribuições e condições de uso dos provedores.

## 6. Dados e limites conhecidos

- O mapa depende de Internet para baixar camadas e relevo; não promete uso offline.
- Algumas fotos são URLs remotas: a disponibilidade, o enquadramento e os créditos devem ser conferidos depois do deploy.
- O projeto mantém notas editoriais sobre limites antigos em determinadas áreas (por exemplo, Sete Cidades): confirme geometrias com atos oficiais antes de atualizar o mapa.
- Os dados de biodiversidade se referem a registros documentados, não a uma garantia de que espécies serão vistas durante a visita.
- **Build local completo pendente neste ambiente**: `npm ci --offline` falhou por pacote de dependência ausente (`zstddec@0.2.0`). O pacote deve ser testado com Internet em ambiente de CI/deploy.

## 7. Critérios antes de anunciar lançamento completo

- [ ] Executar `npm ci`, `npm run release:verify` e `npm run build` com sucesso.
- [ ] Conferir mapa e imagens ao vivo em desktop e celular.
- [ ] Conferir autor, licença e contexto das fotografias exibidas.
- [ ] Aprovar editorialmente as Expedições e guias que deverão estar públicos (caso queira anunciar todas as seções).
- [ ] Testar navegação, filtros, acessibilidade e SEO.
- [ ] Publicar com `RAIZ_PREVIEW_DRAFTS=0`.

A planilha `docs/audits/publicacao-134/STATUS_EDITORIAL_77.csv` registra o estado de cada parque; `FOTOS_RESTRITAS_CC_NC.csv` identifica as referências com restrição não comercial.
