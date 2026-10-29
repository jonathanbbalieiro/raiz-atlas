/**
 * Candidatos a destaque por parque, a partir de sinais que o levantamento do GBIF não dá:
 *
 *   iNaturalist  espécies mais observadas (grau pesquisa) na caixa do parque, por grupo. Reflete o que
 *                as pessoas veem e fotografam (buriti, arara-canindé), diferente do GBIF, que pesa a coleta
 *                científica (herbários favorecem plantas pequenas e pouco conhecidas).
 *   GBIF         plantas mais registradas dentro do polígono, sem exigir nome popular nem foto.
 *   Atual        destaques e levantamento já publicados (para não perder o que existe).
 *
 * A caixa do parque pode incluir áreas do entorno: o resultado é só candidato, nunca prova de presença.
 * Quem escolhe o destaque confirma a presença e o vínculo em fontes citáveis.
 *
 * Uso:  node scripts/flagship-candidates.mjs [slug ...]     (sem slug = todos)
 * Saída: .geo-cache/flagship/<slug>.json (cache: reexecuções não repetem chamadas)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PARKS = path.join(ROOT, "data/br/parks");
const OUT = path.join(ROOT, ".geo-cache/flagship");
const UA = { "User-Agent": "raiz-atlas/1.1 (candidatos a destaque; uso educativo)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

async function getJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) return await r.json();
      if (r.status === 429 || r.status >= 500) await sleep(2500 * (i + 1));
      else return null;
    } catch {
      await sleep(2500 * (i + 1));
    }
  }
  return null;
}

function bboxOf(geo) {
  let [w, s, e, n] = [180, 90, -180, -90];
  const walk = (c) => {
    if (typeof c[0] === "number") {
      w = Math.min(w, c[0]); e = Math.max(e, c[0]); s = Math.min(s, c[1]); n = Math.max(n, c[1]);
    } else c.forEach(walk);
  };
  for (const f of geo.features ?? [geo]) walk((f.geometry ?? f).coordinates);
  return { w, s, e, n };
}

const INAT_GROUPS = [
  { id: "plantas", iconic: "Plantae", n: 30 },
  { id: "aves", iconic: "Aves", n: 20 },
  { id: "mamiferos", iconic: "Mammalia", n: 15 },
  { id: "outros", iconic: "Reptilia,Amphibia,Actinopterygii,Mollusca,Arachnida,Insecta", n: 15 },
];

const slugs = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(PARKS);
let done = 0;
for (const slug of slugs) {
  const file = path.join(OUT, `${slug}.json`);
  if (fs.existsSync(file)) { done++; continue; }
  const geoFile = path.join(ROOT, "public/geo/br/parks", `${slug}.json`);
  if (!fs.existsSync(geoFile)) { console.log(`${slug}: sem geometria`); continue; }
  const box = bboxOf(JSON.parse(fs.readFileSync(geoFile, "utf8")));
  const bio = JSON.parse(fs.readFileSync(path.join(PARKS, slug, "biodiversity.generated.json"), "utf8"));
  const guide = JSON.parse(fs.readFileSync(path.join(PARKS, slug, "guide.json"), "utf8"));

  const inat = {};
  for (const g of INAT_GROUPS) {
    const url = "https://api.inaturalist.org/v1/observations/species_counts?" + new URLSearchParams({
      nelat: box.n, nelng: box.e, swlat: box.s, swlng: box.w, quality_grade: "research", rank: "species",
      iconic_taxa: g.iconic, per_page: String(g.n), locale: "pt-BR", introduced: "false",
    });
    const r = await getJson(url);
    inat[g.id] = (r?.results ?? []).map((x) => ({
      scientificName: x.taxon.name, name: x.taxon.preferred_common_name ?? null, observations: x.count,
      endemic: x.taxon.endemic ?? false, threatened: x.taxon.threatened ?? false, iconic: x.taxon.iconic_taxon_name,
    }));
    await sleep(1100);
  }

  const geom = new URL(bio.sources[0].url).searchParams.get("geometry");
  const gbifPlants = [];
  const facet = geom && await getJson("https://api.gbif.org/v1/occurrence/search?limit=0&occurrenceStatus=PRESENT&hasGeospatialIssue=false&phylumKey=7707728&facet=speciesKey&facetLimit=25&facetMincount=2&geometry=" + encodeURIComponent(geom));
  for (const c of facet?.facets?.[0]?.counts ?? []) {
    const sp = await getJson(`https://api.gbif.org/v1/species/${c.name}`);
    if (sp?.rank === "SPECIES") gbifPlants.push({ scientificName: sp.canonicalName, records: c.count });
  }

  fs.writeFileSync(file, JSON.stringify({
    slug,
    name: guide.hook ? undefined : undefined,
    bbox: box,
    inat,
    gbifPlants,
    currentFlagships: guide.flagships.map((f) => ({ scientificName: f.scientificName, name: f.name })),
    survey: bio.groups.map((g) => ({ group: g.id, top: g.species.slice(0, 8).map((s) => ({ scientificName: s.scientificName, name: s.name, records: s.records, iucn: s.iucn })) })),
    threatened: bio.threatened.map((s) => ({ scientificName: s.scientificName, name: s.name, iucn: s.iucn })),
  }, null, 1));
  done++;
  console.log(`[${done}/${slugs.length}] ${slug}`);
}
