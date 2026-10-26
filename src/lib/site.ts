/** Configuração global do site. */
export const SITE = {
  name: "Raiz",
  tagline: "Atlas dos parques nacionais",
  description:
    "Raiz é um atlas dos 77 parques nacionais do Brasil: mapa interativo do país até cada atração, e Expedições editoriais com fontes e fotografias creditadas.",
  // Defina NEXT_PUBLIC_SITE_URL na Vercel para URLs canônicas e Open Graph absolutos.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  defaultCountry: "br",
} as const;
