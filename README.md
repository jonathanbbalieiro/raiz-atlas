# RAIZ — Atlas dos parques nacionais do Brasil

**Versão 1.3.4: pacote de publicação baseado na v1.3.3, sem redesign.**

Next.js 16 / React 19 / TypeScript / MapLibre. Dados versionados em `data/`.

**Antes de colocar no ar:** leia [PUBLICAR_RAIZ.md](./PUBLICAR_RAIZ.md).

## Desenvolvimento

```bash
npm ci
npm run dev
```

Abra `http://localhost:3000`. Em modo de desenvolvimento, rascunhos aparecem identificados como prévia.

## Produção

```bash
npm ci
npm run check:publish
# Configure NEXT_PUBLIC_SITE_URL com URL HTTPS pública antes de validar.
npm run release:verify
npm run build
npm run start
```

O build público preserva o mapa, os 77 parques e as imagens e espécies publicáveis. Não publica as Expedições e guias ainda não aprovados.

Use `.env.example` como referência de variáveis, sem publicar credenciais. Consulte `PUBLICAR_RAIZ.md` para Vercel, licenças, prévia editorial e checklist.
