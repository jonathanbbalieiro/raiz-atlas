/**
 * Preenche `iucn` nas espécies sem categoria em `biodiversity.generated.json`, usando a categoria
 * da Lista Vermelha da IUCN que o GBIF publica por táxon (/species/{key}/iucnRedListCategory).
 * Espécies que passam a ser CR/EN/VU entram também em `threatened`. Não remove nem troca categorias existentes.
 *
 *   node scripts/fill-iucn.mjs            (consulta, grava .geo-cache/iucn-fill.json; retomável)
 *   node scripts/fill-iucn.mjs --apply    (aplica aos arquivos dos parques)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PARKS = path.join(ROOT, "data/br/parks");
const CACHE = path.join(ROOT, ".geo-cache/iucn-fill.json");
const APPLY = process.argv.includes("--apply");
const VALID = new Set(["LC", "NT", "VU", "EN", "CR", "EW", "EX", "DD"]);
const THREAT = new Set(["CR", "EN", "VU"]);
const files = fs.readdirSync(PARKS).map((p) => path.join(PARKS, p, "biodiversity.generated.json")).filter((f) => fs.existsSync(f));
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const cache = fs.existsSync(CACHE) ? read(CACHE) : {};

if (!APPLY) {
  const keys = new Set();
  for (const f of files) for (const s of read(f).groups.flatMap((g) => g.species)) if (!s.iucn && !(s.gbifKey in cache)) keys.add(s.gbifKey);
  const queue = [...keys];
  console.log(`${queue.length} táxons a consultar`);
  let done = 0;
  const worker = async () => {
    for (let key; (key = queue.shift()) !== undefined;) {
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const r = await fetch(`https://api.gbif.org/v1/species/${key}/iucnRedListCategory`, { headers: { "User-Agent": "RaizAtlas/1.4 (curadoria; jonathanbalieiro@gmail.com)" } });
          if (r.status === 404) { cache[key] = null; break; }
          if (!r.ok) throw new Error(String(r.status));
          const code = (await r.json()).code;
          cache[key] = VALID.has(code) ? code : null;
          break;
        } catch { await new Promise((res) => setTimeout(res, 1500 * (attempt + 1))); }
      }
      if (++done % 50 === 0) { console.log(`${done}`); fs.writeFileSync(CACHE, JSON.stringify(cache)); }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  fs.writeFileSync(CACHE, JSON.stringify(cache));
  console.log("consulta concluída");
} else {
  let filled = 0, added = 0;
  for (const f of files) {
    const bio = read(f);
    let changed = false;
    for (const g of bio.groups) for (const s of g.species) {
      const code = cache[s.gbifKey];
      if (s.iucn || !code) continue;
      s.iucn = code; filled++; changed = true;
      if (THREAT.has(code) && !bio.threatened.some((t) => t.gbifKey === s.gbifKey)) { bio.threatened.push({ ...s }); added++; }
    }
    if (changed) fs.writeFileSync(f, JSON.stringify(bio, null, 2) + "\n");
  }
  console.log({ filled, addedToThreatened: added });
}
