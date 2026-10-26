import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança. A política de conteúdo libera só o que o site usa: fotos do
 * Wikimedia e do iNaturalist, mapa (OpenFreeMap) e relevo (AWS). O Next injeta scripts em
 * linha, por isso `unsafe-inline`; o MapLibre usa workers em blob:. Em desenvolvimento o
 * Next exige `unsafe-eval`, então a política só vale na produção.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://upload.wikimedia.org https://thumb.wikimedia.org https://inaturalist-open-data.s3.amazonaws.com https://static.inaturalist.org https://tiles.openfreemap.org",
  "font-src 'self' data:",
  "connect-src 'self' https://tiles.openfreemap.org https://s3.amazonaws.com",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: csp }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // As fotos vêm de CDNs que já servem miniaturas em larguras padrão (Wikimedia, iNaturalist):
    // o loader próprio escolhe a largura e o host não faz otimização de imagem.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    // Fotos do Wikimedia Commons (licenças CC; crédito exibido junto de cada foto).
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org", pathname: "/wikipedia/commons/**" },
      { protocol: "https", hostname: "thumb.wikimedia.org", pathname: "/wikipedia/commons/**" },
      // Fotos de observações do iNaturalist (CC BY, CC BY-SA, CC BY-NC, CC BY-NC-SA).
      { protocol: "https", hostname: "inaturalist-open-data.s3.amazonaws.com", pathname: "/photos/**" },
      { protocol: "https", hostname: "static.inaturalist.org", pathname: "/photos/**" },
    ],
  },
  turbopack: {
    // Evita que o Next suba até um package-lock.json fora do projeto.
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
