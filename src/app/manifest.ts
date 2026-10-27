import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name}: ${SITE.tagline}`,
    short_name: SITE.name,
    description: SITE.description,
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f1e7",
    theme_color: "#244b3b",
    icons: [
      { src: "/brand/raiz-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/raiz-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
