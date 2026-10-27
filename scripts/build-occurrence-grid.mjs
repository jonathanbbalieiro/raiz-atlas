/**
 * "Onde foi registrada": agrega em quadrados os registros do GBIF de cada espécie
 * da seleção, dentro do mesmo recorte e com os mesmos filtros do levantamento
 * (fetch-biodiversity.mjs). Nunca publica pontos exatos.
 *
 *   NODE_USE_ENV_PROXY=1 node scripts/build-occurrence-grid.mjs chapada-dos-veadeiros
 *
 * Espécies ameaçadas (CR, EN, VU ou na aba de ameaçadas) usam quadrados de 0,1°
 * (~11 km), para não indicar onde encontrá-las; as demais, de 0,02° (~2 km).
 * Registros com incerteza maior que 10 km ficam de fora.
 * Saída: public/geo/br/occurrences/<parque>.json. Nunca editar à mão.
 */
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const UA = { "User-Agent": "RaizAtlas/1.4 (atlas dos parques nacionais; jonathanbalieiro@gmail.com)" };
const slug = process.argv[2];
if (!slug) {
  console.log("Uso: node scripts/build-occurrence-grid.mjs <parque>");
  process.exit(1);
}

const FILTERS = "occurrenceStatus=PRESENT&hasCoordinate=true&hasGeospatialIssue=false" +
  "&basisOfRecord=HUMAN_OBSERVATION&basisOfRecord=PRESERVED_SPECIMEN&basisOfRecord=MACHINE_OBSERVATION" +
  "&basisOfRecord=MATERIAL_SAMPLE&basisOfRecord=OCCURRENCE&basisOfRecord=OBSERVATION";
const FINE = 0.02;
const COARSE = 0.1;
const MAX_UNCERTAINTY_M = 10000;
const MAX_RECORDS = 3000;
const THREAT = new Set(["CR", "EN", "VU"]);

const bio = JSON.parse(await fs.readFile(path.join(ROOT, "data/br/parks", slug, "biodiversity.generated.json"), "utf8"));
const gbifSource = bio.sources.find((s) => s.url.startsWith("https://www.gbif.org/occurrence/search?"));
const wkt = gbifSource && new URL(gbifSource.url).searchParams.get("geometry");
if (!wkt) throw new Error(`${slug}: levantamento sem recorte geográfico do GBIF`);

const threatenedKeys = new Set(bio.threatened.map((s) => s.gbifKey));
const species = new Map();
for (const s of [...bio.groups.flatMap((g) => g.species), ...bio.threatened]) {
  if (Number.isSafeInteger(s.gbifKey) && s.gbifKey > 0) species.set(s.gbifKey, s);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function page(key, offset) {
  const url = `https://api.gbif.org/v1/occurrence/search?${FILTERS}&speciesKey=${key}` +
    `&geometry=${encodeURIComponent(wkt)}&limit=300&offset=${offset}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(60000) }).catch(() => null);
    if (res?.ok) return res.json();
    await sleep(2000 * (attempt + 1));
  }
  throw new Error(`GBIF falhou para ${key} (offset ${offset})`);
}

const out = {};
let total = 0;
for (const [key, s] of species) {
  const sensitive = threatenedKeys.has(key) || THREAT.has(s.iucn);
  const cell = sensitive ? COARSE : FINE;
  const cells = new Map();
  let used = 0;
  for (let offset = 0; offset < MAX_RECORDS; offset += 300) {
    const r = await page(key, offset);
    for (const o of r.results) {
      if (o.coordinateUncertaintyInMeters > MAX_UNCERTAINTY_M) continue;
      // Canto sudoeste do quadrado, arredondado para não carregar ruído de ponto flutuante.
      const x = Math.round(Math.floor(o.decimalLongitude / cell) * cell * 1000) / 1000;
      const y = Math.round(Math.floor(o.decimalLatitude / cell) * cell * 1000) / 1000;
      const id = `${x},${y}`;
      cells.set(id, (cells.get(id) ?? 0) + 1);
      used++;
    }
    if (r.endOfRecords) break;
    await sleep(300);
  }
  total += used;
  out[key] = { cell, records: used, cells: [...cells].map(([id, count]) => [...id.split(",").map(Number), count]) };
  console.log(`${s.scientificName}: ${used} registros em ${cells.size} quadrados de ${cell}°${sensitive ? " (ameaçada)" : ""}`);
  await sleep(300);
}

await fs.mkdir(path.join(ROOT, "public/geo/br/occurrences"), { recursive: true });
await fs.writeFile(path.join(ROOT, "public/geo/br/occurrences", `${slug}.json`), JSON.stringify({
  generatedAt: new Date().toISOString().slice(0, 10),
  boundary: bio.boundary,
  source: { title: "GBIF: ocorrências de espécies", url: gbifSource.url },
  method: `Mesmos filtros do levantamento; quadrados de ${FINE}° (ameaçadas: ${COARSE}°); sem registros com incerteza acima de ${MAX_UNCERTAINTY_M / 1000} km.`,
  species: out,
}));
console.log(`${species.size} espécies, ${total} registros agregados.`);
