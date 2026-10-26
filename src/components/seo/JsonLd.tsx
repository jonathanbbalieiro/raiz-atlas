import { SITE } from "@/lib/site";
import type { Park, PlaceSummary } from "@/lib/data/types";
import { href } from "@/lib/labels";

/** Dados estruturados (schema.org) para o Google: parque, trilha de navegação e site. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // `<` escapado para que nenhum texto de dados feche a tag <script>.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }}
    />
  );
}

const abs = (path: string) => `${SITE.url}${path}`;

export function breadcrumbs(trail: PlaceSummary[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: abs(href(t.path)),
    })),
  };
}

export function parkData(park: Park) {
  const image = park.photos.slice(0, 4).map((p) => p.src);
  return {
    "@context": "https://schema.org",
    "@type": ["Park", "TouristAttraction"],
    name: park.name,
    description: park.shortDescription,
    url: abs(href(park.path)),
    ...(image.length && { image }),
    geo: { "@type": "GeoCoordinates", longitude: park.labelPoint[0], latitude: park.labelPoint[1] },
    address: { "@type": "PostalAddress", addressRegion: park.ufs.join(", "), addressCountry: "BR" },
  };
}

export function websiteData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    alternateName: `${SITE.name}: ${SITE.tagline}`,
    url: SITE.url,
    inLanguage: "pt-BR",
    description: SITE.description,
  };
}
