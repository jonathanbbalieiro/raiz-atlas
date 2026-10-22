import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cabeçalhos seguros sem bloquear mapa, Commons, fontes e outras imagens externas.
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Fotos do Wikimedia Commons (licenças CC; crédito exibido junto de cada foto).
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org", pathname: "/wikipedia/commons/**" },
      { protocol: "https", hostname: "thumb.wikimedia.org", pathname: "/wikipedia/commons/**" },
      { protocol: "https", hostname: "commons.wikimedia.org", pathname: "/wiki/Special:FilePath/**" },
      { protocol: "https", hostname: "www.gov.br", pathname: "/**" },
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
