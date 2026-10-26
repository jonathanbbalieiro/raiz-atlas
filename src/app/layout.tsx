import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { SITE } from "@/lib/site";
import "./globals.css";

// Ambas sob SIL Open Font License; o next/font hospeda os arquivos junto do site.
// Fraunces (serifada editorial) para títulos; DM Sans (sem serifa) para a interface.
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  openGraph: { siteName: SITE.name, locale: "pt_BR", type: "website" },
  // Verificação do Google Search Console (opcional): NEXT_PUBLIC_GSC_VERIFICATION.
  verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } : undefined,
};

export const viewport: Viewport = {
  themeColor: "#244b3b",
  // Ocupa a tela toda no celular; as áreas seguras são respeitadas via env(safe-area-inset-*).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} ${fraunces.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
