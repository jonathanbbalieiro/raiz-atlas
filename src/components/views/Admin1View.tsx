import { ParkCards } from "@/components/nav/ParkCards";
import { repo } from "@/lib/data";
import type { Admin1, Biome, PlaceSummary } from "@/lib/data/types";
import { formatArea, plural } from "@/lib/labels";
import { BiomeBar } from "./BiomeBar";

/** Estado B: estado selecionado (nome, quantidade, biomas e lista de parques). */
export async function Admin1View({ admin1, items }: { admin1: Admin1; items: PlaceSummary[] }) {
  if (!items.length) {
    // Estado sem parque nacional: oferece os mais próximos em vez de um beco sem saída.
    const all = await repo.listParks(admin1.path[0]);
    const [x, y] = admin1.labelPoint;
    const nearest = all
      .map((p) => ({ p, d: (p.labelPoint[0] - x) ** 2 + (p.labelPoint[1] - y) ** 2 }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
    const cards = await Promise.all(nearest.map(({ p }) => repo.getTrail(p.path).then((t) => t.at(-1)!)));
    return (
      <>
        <div className="px-5 pt-1">
          <h1 className="font-display text-[30px] leading-tight font-semibold text-forest-deep">
            {admin1.name}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            {admin1.name} não tem parque nacional no cadastro do ICMBio. Estes são os mais próximos:
          </p>
        </div>
        <ParkCards items={cards} heading="Mais próximos" filterable={false} />
      </>
    );
  }

  const parks = await repo.listParks(admin1.path[0], admin1.slug);
  const area = parks.reduce((n, p) => n + p.areaHa, 0);
  return (
    <>
      <div className="px-5 pt-1">
        <h1 className="font-display text-[30px] leading-tight font-semibold text-forest-deep">
          {admin1.name}
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-soft">
          <strong className="font-semibold text-ink">
            {plural(items.length, "parque nacional", "parques nacionais")}
          </strong>
          {" · "}
          {formatArea(area, { short: true })} protegidos
          {parks.some((p) => p.ufs.length > 1) ? " (somando áreas em estados vizinhos)" : ""}
        </p>
        <BiomeBar biomes={items.map((i) => i.biome as Biome)} />
      </div>
      <ParkCards items={items} heading="Parques" hereCode={admin1.code} />
    </>
  );
}
