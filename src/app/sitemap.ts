import type { MetadataRoute } from "next";
import { repo } from "@/lib/data";
import { SITE } from "@/lib/site";
import { EDITORIAL_PREVIEW } from "@/lib/editorial";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (EDITORIAL_PREVIEW) return [];
  const paths = await repo.listAllPaths();
  return [
    { url: SITE.url, priority: 1 },
    ...paths.map((p) => ({
      url: `${SITE.url}/${p.join("/")}`,
      priority: Math.max(0.4, 1 - p.length * 0.15),
    })),
  ];
}
