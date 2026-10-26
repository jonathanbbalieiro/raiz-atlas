import fs from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import { repo } from "@/lib/data";
import { SITE } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = await repo.listAllPaths();
  // Data do arquivo de dados (fixa por build): `new Date()` tornaria o sitemap dinâmico.
  const lastModified = fs.statSync(path.join(process.cwd(), "data", "br", "parks.generated.json")).mtime;
  return [
    { url: SITE.url, lastModified, priority: 1 },
    { url: `${SITE.url}/sobre`, lastModified, priority: 0.3 },
    ...paths.map((p) => ({
      url: `${SITE.url}/${p.join("/")}`,
      lastModified,
      priority: Math.max(0.4, 1 - p.length * 0.15),
    })),
  ];
}
