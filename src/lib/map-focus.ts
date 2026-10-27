import type { MapFocusState } from "@/components/map/focus";
import { isVerified, repo, type PlaceNode } from "@/lib/data";

/** Monta, no servidor, o foco do mapa para um nó da hierarquia. */
export async function buildMapFocus(node: PlaceNode): Promise<MapFocusState> {
  const [country, , park] = node.path;
  const attractions = park ? await repo.listAttractions(country, park) : [];
  const parkNode = node.level === "park" ? node : null;
  return {
    country,
    level: node.level,
    path: node.path,
    bbox: node.bbox,
    attractions: attractions.flatMap((a) =>
      isVerified(a.coordinates)
        ? [{ slug: a.slug, name: a.name, type: a.type, coordinates: a.coordinates }]
        : [],
    ),
    wonders: (parkNode?.guide?.wonders ?? []).flatMap((w, index) =>
      w.location
        ? [{ index, title: w.title, coordinates: w.location.coordinates, approximate: w.location.precision === "aproximado" }]
        : [],
    ),
    context: !!parkNode?.context,
  };
}
