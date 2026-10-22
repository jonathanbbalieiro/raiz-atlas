import { ExploreShell } from "@/components/shell/ExploreShell";
import { repo } from "@/lib/data";
import { SITE } from "@/lib/site";

/**
 * Layout persistente: o mapa vive aqui e não desmonta ao navegar. O índice
 * compacto (estados e parques) vem uma única vez, junto do primeiro HTML.
 */
export default async function ExploreLayout({ children }: { children: React.ReactNode }) {
  const index = await repo.getMapIndex(SITE.defaultCountry);
  return <ExploreShell index={index}>{children}</ExploreShell>;
}
