/**
 * Áreas protegidas além dos parques nacionais federais (data/<país>/extra-areas.json).
 *
 * Limites e atributos:
 *  - "cnuc": MMA, Cadastro Nacional de Unidades de Conservação (camada cnuc_2025_08), que inclui as
 *    unidades estaduais, buscada pelo código CNUC.
 *  - "osm": OpenStreetMap (via Nominatim), só para o que o CNUC não traz. Dado colaborativo, citado
 *    como tal; deve ser trocado pelo oficial quando houver.
 *
 * Uma área só entra no mapa quando seu guia está revisado (mesma regra do repositório de dados).
 * Em prévia (RAIZ_PREVIEW_DRAFTS=1) entram também as que já têm pasta de trabalho em
 * data/<país>/parks/<slug>/.
 */
import fs from "node:fs/promises";
import path from "node:path";

const UA = { "User-Agent": "raiz-atlas/0.1 (pipeline de geodados; jonathanbalieiro@gmail.com)" };
const CNUC_WFS = "https://geoservicos.inde.gov.br/geoserver/MMA/ows";
const CNUC_LAYER = "MMA:cnuc_2025_08";
const NOMINATIM = "https://nominatim.openstreetmap.org/lookup";

export const EXTRA_SOURCES = {
  cnuc: {
    title: "MMA: Cadastro Nacional de Unidades de Conservação (CNUC), camada cnuc_2025_08 (GeoServer INDE)",
    url: "https://geoservicos.inde.gov.br/geoserver/MMA/ows?service=WFS&request=GetCapabilities",
  },
  osm: {
    title: "OpenStreetMap: limite da unidade (dado colaborativo, licença ODbL)",
    url: "https://www.openstreetmap.org/copyright",
  },
};

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function cachedJson(file, url, init = {}) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    console.log(`↓ ${url}`);
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(240000), ...init });
    if (!res.ok) throw new Error(`${res.status} em ${url}`);
    const text = await res.text();
    const json = JSON.parse(text);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, text);
    return json;
  }
}

/** Área geodésica aproximada (Chamberlain e Duquette) em hectares para Polygon/MultiPolygon. */
function areaHaOf(geometry) {
  const R = 6378137;
  const rad = (d) => (d * Math.PI) / 180;
  const ringArea = (ring) => {
    let sum = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[i + 1];
      sum += rad(x2 - x1) * (2 + Math.sin(rad(y1)) + Math.sin(rad(y2)));
    }
    return (Math.abs(sum) * R * R) / 2;
  };
  const polys = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const m2 = polys.reduce((t, [outer, ...holes]) => t + ringArea(outer) - holes.reduce((h, r) => h + ringArea(r), 0), 0);
  return Math.round(m2 / 10000);
}

const yearOf = (s) => {
  const m = String(s ?? "").match(/(\d{4})\s*$/) ?? String(s ?? "").match(/\b(1[89]\d{2}|20\d{2})\b/);
  return m ? Number(m[1]) : null;
};

async function fromCnuc(root, a) {
  const q = new URLSearchParams({
    service: "WFS", version: "1.1.0", request: "GetFeature", typeName: CNUC_LAYER,
    outputFormat: "application/json", srsName: "EPSG:4326", CQL_FILTER: `cd_cnuc='${a.cnuc}'`,
  });
  const json = await cachedJson(path.join(root, ".geo-cache", `extra-cnuc-${a.cnuc}.json`), `${CNUC_WFS}?${q}`);
  if (json.features.length !== 1) throw new Error(`${a.name}: ${json.features.length} registros no CNUC para ${a.cnuc}`);
  const f = json.features[0];
  const p = f.properties;
  return {
    geometry: f.geometry,
    cnuc: p.cd_cnuc,
    areaHa: Math.round(Number(p.ha_total)) || areaHaOf(f.geometry),
    // O ano vem do ato de criação: "cria_ano" no CNUC pode ser a data de uma alteração posterior (ex.: mudança de nome).
    createdYear: yearOf(p.cria_ato) ?? yearOf(p.cria_ano),
    creationAct: p.cria_ato?.trim() || null,
  };
}

async function fromOsm(root, a) {
  const q = new URLSearchParams({ osm_ids: `R${a.osmRelation}`, format: "geojson", polygon_geojson: "1", extratags: "1" });
  const json = await cachedJson(path.join(root, ".geo-cache", `extra-osm-${a.osmRelation}.json`), `${NOMINATIM}?${q}`);
  const f = json.features[0];
  if (!f || !/Polygon/.test(f.geometry?.type)) throw new Error(`${a.name}: sem polígono no OSM (R${a.osmRelation})`);
  const t = f.properties.extratags ?? {};
  return {
    geometry: f.geometry,
    cnuc: t["ref:CNUC"] ?? "",
    areaHa: areaHaOf(f.geometry),
    createdYear: yearOf(t.start_date),
    creationAct: t.related_law ?? null,
  };
}

/** Devolve, para cada área publicável, o registro do parque e a geometria. */
export async function loadExtraAreas({ root, country, byCode }) {
  const dataDir = path.join(root, "data", country);
  const file = path.join(dataDir, "extra-areas.json");
  if (!(await exists(file))) return [];
  const areas = JSON.parse(await fs.readFile(file, "utf8"));
  const drafts = process.env.RAIZ_PREVIEW_DRAFTS === "1";
  const out = [];
  for (const a of areas) {
    const dir = path.join(dataDir, "parks", a.slug);
    let published = false;
    try {
      published = JSON.parse(await fs.readFile(path.join(dir, "guide.json"), "utf8")).status === "revisado";
    } catch {}
    if (!published && !(drafts && (await exists(dir)))) {
      console.log(`· ${a.slug}: fora do mapa (guia ainda não revisado)`);
      continue;
    }
    for (const uf of a.ufs) if (!byCode.has(uf)) throw new Error(`${a.name}: UF desconhecida ${uf}`);
    // "override": dados oficiais que o OpenStreetMap não traz ou traz truncados (cada valor com fonte no guia da área).
    const r = { ...(a.source === "cnuc" ? await fromCnuc(root, a) : await fromOsm(root, a)), ...a.override };
    // "also": outros códigos CNUC da mesma entrada (ex.: parque + APA); seus polígonos são somados no mapa.
    const alsoGeometries = [];
    for (const code of a.also ?? []) alsoGeometries.push((await fromCnuc(root, { ...a, cnuc: code })).geometry);
    out.push({
      geometry: r.geometry,
      alsoGeometries,
      park: {
        slug: a.slug,
        cnuc: r.cnuc,
        name: a.name,
        shortName: a.shortName,
        ufs: a.ufs,
        biome: a.biomes[0],
        biomes: a.biomes,
        areaHa: r.areaHa,
        createdYear: r.createdYear,
        creationAct: r.creationAct,
        category: a.category,
        categoryLabel: a.categoryLabel,
        manager: a.manager,
        officialSource: EXTRA_SOURCES[a.source],
      },
    });
    console.log(`+ ${a.slug}: ${r.areaHa} ha (${a.source})`);
  }
  return out;
}
