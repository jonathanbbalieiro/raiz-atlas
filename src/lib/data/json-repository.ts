import fs from "node:fs/promises";
import path from "node:path";
import { EXPEDITION_SEGMENT, SHOW_DRAFTS } from "@/lib/editorial";
import { BIOME_LABEL, formatArea, joinPt } from "@/lib/labels";
import type { PlaceRepository } from "./repository";
import {
  isVerified,
  type Admin1,
  type Attraction,
  type BBox,
  type Biodiversity,
  type Biome,
  type Country,
  type Expedition,
  type LngLat,
  type MapIndex,
  type Park,
  type LostWorld,
  type ParkGuide,
  type ParkResearch,
  type Photo,
  type PlaceNode,
  type PlaceSummary,
  type Source,
} from "./types";

/*
 * Layout dos arquivos (todos versionados):
 *
 *   data/<país>/country.json
 *   data/<país>/admin1.json
 *   data/<país>/parks.generated.json                 cadastro oficial (npm run geo)
 *   data/<país>/park-media.generated.json            fotos e Wikipédia (npm run media)
 *   data/<país>/parks/<parque>/park.json             texto editorial opcional
 *   data/<país>/parks/<parque>/research.json         dossiê de pesquisa (opcional)
 *   data/<país>/parks/<parque>/expedition.json       Expedição (opcional)
 *   data/<país>/parks/<parque>/guide.json            guia editorial (opcional)
 *   data/<país>/parks/<parque>/biodiversity.generated.json   espécies (npm run bio)
 *   data/<país>/parks/<parque>/attractions/<a>.json  atrações do parque
 *   data/generated/geo-index.json                    bbox/ponto de rótulo (npm run geo)
 *
 * `level`, `path` e `bbox` são derivados aqui, não escritos à mão.
 */

type GeoIndex = Record<string, { bbox: BBox; labelPoint?: LngLat }>;
type GeneratedPark = Omit<
  Park,
  "level" | "path" | "shortDescription" | "photos" | "wikipediaUrl" | "sources"
>;
type ParkMedia = Record<string, { photos: Photo[]; wikipediaUrl: string | null }>;
type ParkOverride = Partial<Pick<Park, "shortDescription" | "longDescription">> & { sources?: Source[] };
type AttractionFile = Omit<Attraction, "level" | "path" | "bbox">;

interface Dataset {
  countries: Country[];
  admin1: Record<string, Admin1[]>;
  parks: Record<string, Park[]>;
  /** Chave: "<país>/<parque>". */
  attractions: Record<string, Attraction[]>;
  /** Só as expedições legíveis neste ambiente. Chave: "<país>/<parque>". */
  expeditions: Record<string, Expedition>;
}

const DATA_DIR = path.join(process.cwd(), "data");
const SHORT_DESCRIPTION_MAX = 300;
/** Meia-largura (graus) do bbox em volta de uma atração. */
const POINT_PADDING = 0.01;
const ACCESSED = "2026-10-19";

async function readJson<T>(...parts: string[]): Promise<T> {
  return JSON.parse(await fs.readFile(path.join(DATA_DIR, ...parts), "utf8")) as T;
}

async function readJsonOr<T>(fallback: T, ...parts: string[]): Promise<T> {
  try {
    return await readJson<T>(...parts);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw e;
  }
}

async function readDir(...parts: string[]): Promise<string[]> {
  try {
    return (await fs.readdir(path.join(DATA_DIR, ...parts))).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return [];
  }
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "pt");

/**
 * Descrição curta montada só com fatos do cadastro oficial (ano, área, bioma,
 * estados): nada é inventado. Um `park.json` editorial pode substituí-la.
 */
/** Biomas com o artigo certo: "da Amazônia", "do Cerrado", "de ambiente costeiro-marinho". */
const BIOME_WITH_ARTICLE: Record<Biome, string> = {
  amazonia: `da ${BIOME_LABEL.amazonia}`,
  cerrado: `do ${BIOME_LABEL.cerrado}`,
  mata_atlantica: `da ${BIOME_LABEL.mata_atlantica}`,
  caatinga: `da ${BIOME_LABEL.caatinga}`,
  pantanal: `do ${BIOME_LABEL.pantanal}`,
  pampa: `do ${BIOME_LABEL.pampa}`,
  marinho: "de ambiente costeiro-marinho",
};

function describePark(p: GeneratedPark, states: { name: string; prep: string }[]): string {
  const biomes = joinPt(p.biomes.map((b: Biome) => BIOME_WITH_ARTICLE[b]));
  // "no Paraná", "na Bahia", "em Goiás" (preposição vem dos dados do estado).
  const where =
    states.length > 1 ? `entre ${joinPt(states.map((s) => s.name))}` : `${states[0].prep} ${states[0].name}`;
  const body = `protege cerca de ${formatArea(p.areaHa)} ${biomes} ${where}.`;
  return p.createdYear ? `Criado em ${p.createdYear}, ${body}` : body.charAt(0).toUpperCase() + body.slice(1);
}

/** Lê e valida todo o conteúdo uma vez; com Cache Components, entra no shell estático. */
async function loadDataset(): Promise<Dataset> {
  "use cache";
  const geo = await readJson<GeoIndex>("generated", "geo-index.json");
  const ds: Dataset = { countries: [], admin1: {}, parks: {}, attractions: {}, expeditions: {} };
  const countryDirs = (await fs.readdir(DATA_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && d.name !== "generated")
    .map((d) => d.name);

  for (const c of countryDirs) {
    const country = await readJson<Omit<Country, "level" | "path" | "bbox">>(c, "country.json");
    if (!geo[c]) throw new Error(`Sem bbox para "${c}". Rode \`npm run geo\`.`);
    ds.countries.push({ ...country, level: "country", path: [c], bbox: geo[c].bbox });

    const admin1Raw = await readJson<Omit<Admin1, "level" | "path" | "bbox" | "labelPoint">[]>(
      c,
      "admin1.json",
    );
    ds.admin1[c] = admin1Raw
      .map((a): Admin1 => {
        const g = geo[`${c}/${a.slug}`];
        if (!g?.labelPoint) throw new Error(`Sem geometria para "${c}/${a.slug}". Rode \`npm run geo\`.`);
        return { ...a, level: "admin1", path: [c, a.slug], bbox: g.bbox, labelPoint: g.labelPoint };
      })
      .sort(byName);
    const ufInfo = new Map(ds.admin1[c].map((a) => [a.code, { name: a.name, prep: a.prep ?? "em" }]));

    const generated = await readJson<GeneratedPark[]>(c, "parks.generated.json");
    const media = await readJsonOr<ParkMedia>({}, c, "park-media.generated.json");
    const officialSource: Source = {
      title: "ICMBio: limites e atributos das unidades de conservação federais (GeoServer INDE)",
      url: "https://geoservicos.inde.gov.br/geoserver/ICMBio/ows?service=WFS&request=GetCapabilities",
      accessed: ACCESSED,
      fields: ["name", "areaHa", "createdYear", "creationAct", "biomes", "ufs", "bbox"],
    };

    ds.parks[c] = [];
    for (const g of generated) {
      const override = await readJsonOr<ParkOverride>({}, c, "parks", g.slug, "park.json");
      const m = media[g.slug];
      const research = await readJsonOr<ParkResearch | null>(null, c, "parks", g.slug, "research.json");
      const expedition = await readJsonOr<Expedition | null>(null, c, "parks", g.slug, "expedition.json");
      const readable = expedition && (expedition.approved || SHOW_DRAFTS) ? expedition : null;
      const guide = await readJsonOr<ParkGuide | null>(null, c, "parks", g.slug, "guide.json");
      const biodiversity = await readJsonOr<Biodiversity | null>(null, c, "parks", g.slug, "biodiversity.generated.json");
      const lostWorld = await readJsonOr<LostWorld | null>(null, c, "parks", g.slug, "lost-world.json");
      if (readable) ds.expeditions[`${c}/${g.slug}`] = readable;
      const park: Park = {
        ...g,
        level: "park",
        path: [c, g.admin1, g.slug],
        shortDescription:
          override.shortDescription ??
          describePark(
            g,
            g.ufs.map((u) => ufInfo.get(u) ?? { name: u, prep: "em" }),
          ),
        longDescription: override.longDescription,
        photos: m?.photos ?? [],
        wikipediaUrl: m?.wikipediaUrl ?? null,
        research: research ?? undefined,
        guide: guide && (guide.status === "revisado" || SHOW_DRAFTS) ? guide : undefined,
        biodiversity: biodiversity ?? undefined,
        lostWorld: lostWorld && (lostWorld.status === "revisado" || SHOW_DRAFTS) ? lostWorld : undefined,
        expedition: readable
          ? { title: readable.title, subtitle: readable.subtitle, approved: readable.approved }
          : undefined,
        sources: [
          officialSource,
          ...(override.sources ?? []),
          ...(m?.photos.length
            ? [
                {
                  title: "Wikimedia Commons (fotos)",
                  url: "https://commons.wikimedia.org",
                  accessed: ACCESSED,
                  fields: ["photos"],
                },
              ]
            : []),
        ],
      };
      if (park.shortDescription.length > SHORT_DESCRIPTION_MAX) {
        throw new Error(`${g.slug}: shortDescription passa de ${SHORT_DESCRIPTION_MAX} caracteres`);
      }
      ds.parks[c].push(park);

      const attractions: Attraction[] = [];
      for (const file of await readDir(c, "parks", g.slug, "attractions")) {
        const at = await readJson<AttractionFile>(c, "parks", g.slug, "attractions", file);
        if (at.slug === EXPEDITION_SEGMENT) {
          throw new Error(`${file}: o slug "${EXPEDITION_SEGMENT}" é reservado para a Expedição`);
        }
        if (at.shortDescription.length > SHORT_DESCRIPTION_MAX) {
          throw new Error(`${file}: shortDescription passa de ${SHORT_DESCRIPTION_MAX} caracteres`);
        }
        const bbox: BBox = isVerified(at.coordinates)
          ? [
              at.coordinates[0] - POINT_PADDING,
              at.coordinates[1] - POINT_PADDING,
              at.coordinates[0] + POINT_PADDING,
              at.coordinates[1] + POINT_PADDING,
            ]
          : park.bbox;
        attractions.push({ ...at, level: "attraction", path: [...park.path, at.slug], bbox });
      }
      ds.attractions[`${c}/${g.slug}`] = attractions.sort(byName);
    }
    ds.parks[c].sort((a, b) => a.shortName.localeCompare(b.shortName, "pt"));

    // O enquadramento do país inclui os parques oceânicos (ex.: Fernando de
    // Noronha), que ficam fora do contorno continental.
    const countryNode = ds.countries.at(-1)!;
    countryNode.bbox = ds.parks[c].reduce<BBox>(
      (b, p) => [
        Math.min(b[0], p.bbox[0]),
        Math.min(b[1], p.bbox[1]),
        Math.max(b[2], p.bbox[2]),
        Math.max(b[3], p.bbox[3]),
      ],
      countryNode.bbox,
    );
  }
  return ds;
}

export class JsonRepository implements PlaceRepository {
  async listCountries() {
    return (await loadDataset()).countries;
  }

  async listAdmin1(country: string) {
    return (await loadDataset()).admin1[country] ?? [];
  }

  async listParks(country: string, admin1?: string) {
    const all = (await loadDataset()).parks[country] ?? [];
    if (!admin1) return all;
    const code = (await this.listAdmin1(country)).find((a) => a.slug === admin1)?.code;
    return all.filter((p) => code && p.ufs.includes(code));
  }

  async listAttractions(country: string, park: string) {
    return (await loadDataset()).attractions[`${country}/${park}`] ?? [];
  }

  async getExpedition(country: string, park: string) {
    return (await loadDataset()).expeditions[`${country}/${park}`] ?? null;
  }

  async getNode(p: string[]): Promise<PlaceNode | null> {
    const [c, a, pk, at] = p;
    switch (p.length) {
      case 1:
        return (await this.listCountries()).find((x) => x.slug === c) ?? null;
      case 2:
        return (await this.listAdmin1(c)).find((x) => x.slug === a) ?? null;
      case 3:
        // Só a URL canônica resolve, para não haver páginas duplicadas.
        return (await this.listParks(c)).find((x) => x.slug === pk && x.admin1 === a) ?? null;
      case 4: {
        const park = await this.getNode(p.slice(0, 3));
        if (!park) return null;
        return (await this.listAttractions(c, pk)).find((x) => x.slug === at) ?? null;
      }
      default:
        return null;
    }
  }

  async getChildren(p: string[]): Promise<PlaceSummary[]> {
    const [c, a, pk] = p;
    switch (p.length) {
      case 1:
        return Promise.all((await this.listAdmin1(c)).map((x) => this.summarize(x)));
      case 2:
        return Promise.all((await this.listParks(c, a)).map((x) => this.summarize(x)));
      case 3:
        return Promise.all((await this.listAttractions(c, pk)).map((x) => this.summarize(x)));
      default:
        return [];
    }
  }

  async getTrail(p: string[]): Promise<PlaceSummary[]> {
    const trail: PlaceSummary[] = [];
    for (let i = 1; i <= p.length; i++) {
      const node = await this.getNode(p.slice(0, i));
      if (!node) break;
      trail.push(await this.summarize(node));
    }
    return trail;
  }

  async nearbyParks(park: Park, limit: number) {
    const all = await this.listParks(park.path[0]);
    const [x, y] = park.labelPoint;
    const near = all
      .filter((p) => p.slug !== park.slug)
      .map((p) => ({ p, d: (p.labelPoint[0] - x) ** 2 + (p.labelPoint[1] - y) ** 2 }))
      .sort((m, n) => m.d - n.d)
      .slice(0, limit);
    return Promise.all(near.map(({ p }) => this.summarize(p)));
  }

  async getMapIndex(country: string): Promise<MapIndex> {
    const [admin1, parks, countries] = await Promise.all([
      this.listAdmin1(country),
      this.listParks(country),
      this.listCountries(),
    ]);
    const node = countries.find((c) => c.slug === country);
    if (!node) throw new Error(`País desconhecido: ${country}`);
    return {
      country,
      bbox: node.bbox,
      admin1: admin1.map((a) => ({
        slug: a.slug,
        name: a.name,
        code: a.code,
        labelPoint: a.labelPoint,
        bbox: a.bbox,
        parkCount: parks.filter((p) => p.ufs.includes(a.code)).length,
      })),
      parks: parks.map((p) => ({
        slug: p.slug,
        name: p.name,
        shortName: p.shortName,
        admin1: p.admin1,
        ufs: p.ufs,
        biome: p.biome,
        areaHa: p.areaHa,
        createdYear: p.createdYear,
        labelPoint: p.labelPoint,
        bbox: p.bbox,
        thumb: p.photos[0] ? thumbUrl(p.photos[0].src, 500) : null,
      })),
    };
  }

  async listAllPaths(): Promise<string[][]> {
    const ds = await loadDataset();
    const paths: string[][] = [];
    for (const c of ds.countries) {
      paths.push(c.path);
      for (const a of ds.admin1[c.slug]) paths.push(a.path);
      for (const p of ds.parks[c.slug]) {
        paths.push(p.path);
        if (ds.expeditions[`${c.slug}/${p.slug}`]) paths.push([...p.path, EXPEDITION_SEGMENT]);
        for (const at of ds.attractions[`${c.slug}/${p.slug}`] ?? []) paths.push(at.path);
      }
    }
    return paths;
  }

  private async summarize(node: PlaceNode): Promise<PlaceSummary> {
    const base = { level: node.level, path: node.path, name: node.name };
    switch (node.level) {
      case "country":
        return { ...base, count: (await this.listParks(node.slug)).length };
      case "admin1":
        return { ...base, count: (await this.listParks(node.path[0], node.slug)).length };
      case "park":
        return {
          ...base,
          name: node.shortName,
          count: (await this.listAttractions(node.path[0], node.slug)).length,
          biome: node.biome,
          areaHa: node.areaHa,
          createdYear: node.createdYear,
          ufs: node.ufs,
          photo: node.photos[0],
        };
      case "attraction":
        return { ...base, count: 0, type: node.type, photo: node.photos[0] };
    }
  }
}

/**
 * Miniatura do Commons em outra largura. As miniaturas seguem o padrão
 * ".../thumb/a/ab/Arquivo.jpg/1280px-Arquivo.jpg".
 */
export function thumbUrl(src: string, width: number) {
  return src.replace(/\/(\d+)px-([^/]+)$/, `/${width}px-$2`);
}
