/**
 * Preenche `iucn` nos destaques (guide.flagships) que não constam do levantamento de biodiversidade
 * do parque, para a página da espécie não mostrar "Sem avaliação" quando existe avaliação.
 * Usa o GBIF: /species/match (nome científico → chave) e /species/{key}/iucnRedListCategory.
 * Categorias já presentes (no destaque ou no levantamento) não são trocadas.
 *
 *   node scripts/fill-flagship-iucn.mjs            (consulta; grava .geo-cache/flagship-iucn.json)
 *   node scripts/fill-flagship-iucn.mjs --apply    (grava nos guide.json)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PARKS = path.join(ROOT, "data/br/parks");
const CACHE = path.join(ROOT, ".geo-cache/flagship-iucn.json");
const APPLY = process.argv.includes("--apply");
const VALID = new Set(["LC", "NT", "VU", "EN", "CR", "EW", "EX", "DD"]);
const UA = { "User-Agent": "RaizAtlas/1.4 (curadoria; jonathanbalieiro@gmail.com)" };
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const cache = fs.existsSync(CACHE) ? read(CACHE) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.status === 404) return null;
      if (r.ok) return await r.json();
    } catch { /* tenta de novo */ }
    await sleep(1500 * (i + 1));
  }
  return null;
}

const slugs = fs.readdirSync(PARKS);
const surveyIucn = (slug, name) => {
  const f = path.join(PARKS, slug, "biodiversity.generated.json");
  if (!fs.existsSync(f)) return null;
  const bio = read(f);
  return [...bio.groups.flatMap((g) => g.species), ...bio.threatened].find((s) => s.scientificName.toLowerCase() === name.toLowerCase())?.iucn ?? null;
};

if (!APPLY) {
  const names = new Set();
  for (const slug of slugs) {
    const gf = path.join(PARKS, slug, "guide.json");
    if (!fs.existsSync(gf)) continue;
    for (const f of read(gf).flagships) if (!f.iucn && !surveyIucn(slug, f.scientificName) && !(f.scientificName in cache)) names.add(f.scientificName);
  }
  console.log(`${names.size} nomes a consultar`);
  for (const name of names) {
    const m = await get(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(name)}`);
    const key = m?.speciesKey ?? m?.usageKey;
    const r = key && m.matchType !== "NONE" ? await get(`https://api.gbif.org/v1/species/${key}/iucnRedListCategory`) : null;
    cache[name] = r && VALID.has(r.code) ? r.code : null;
    await sleep(150);
  }
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  console.log("consulta concluída");
} else {
  let filled = 0;
  for (const slug of slugs) {
    const gf = path.join(PARKS, slug, "guide.json");
    if (!fs.existsSync(gf)) continue;
    const guide = read(gf);
    let changed = false;
    for (const f of guide.flagships) {
      const code = cache[f.scientificName];
      if (f.iucn || !code || surveyIucn(slug, f.scientificName)) continue;
      f.iucn = code; filled++; changed = true;
    }
    if (changed) fs.writeFileSync(gf, JSON.stringify(guide, null, 2) + "\n");
  }
  console.log({ filled });
}
