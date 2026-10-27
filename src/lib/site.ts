/** Preserva domínios próprios; aliases Vercel acompanham o projeto de produção. */
export function resolveSiteUrl(configured?: string, productionDomain?: string) {
  if (productionDomain && (!configured || new URL(configured).hostname.endsWith(".vercel.app"))) {
    return new URL(`https://${productionDomain}`).origin;
  }
  return configured ?? "http://localhost:3000";
}

/** Configuração global do site. */
export const SITE = {
  name: "Raiz",
  tagline: "Atlas dos parques nacionais",
  description:
    "Raiz é um atlas dos 77 parques nacionais do Brasil: mapa interativo do país até cada atração, e Expedições editoriais com fontes e fotografias creditadas.",
  // Defina NEXT_PUBLIC_SITE_URL na Vercel para URLs canônicas e Open Graph absolutos.
  url: resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL),
  defaultCountry: "br",
  /** E-mail de contato exibido no rodapé e em /sobre (NEXT_PUBLIC_CONTACT_EMAIL sobrescreve). */
  contact: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "jonathanbalieiro@gmail.com",
} as const;
