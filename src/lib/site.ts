/** Configuração global do site. */
export const SITE = {
  name: "Raiz",
  tagline: "Atlas dos parques nacionais",
  description:
    "Raiz é um atlas dos parques nacionais do Brasil: mapa interativo, paisagens, biodiversidade e fotografias creditadas. Reportagens em revisão editorial.",
  // Defina NEXT_PUBLIC_SITE_URL na Vercel para URLs canônicas e Open Graph absolutos.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  defaultCountry: "br",
} as const;
