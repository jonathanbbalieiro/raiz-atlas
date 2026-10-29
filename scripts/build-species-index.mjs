/**
 * Índice "onde mais aparece no atlas": para cada espécie registrada em dois ou mais parques,
 * a lista de parques. Gera public/geo/br/species-parks.json, lido na página da espécie.
 *
 *   npm run species-index
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PARKS = path.join(ROOT, "data/br/parks");
const raw = JSON.parse(fs.readFileSync(path.join(ROOT, "data/br/parks.generated.json"), "utf8"));
const meta = new Map((Array.isArray(raw) ? raw : raw.parks).map((p) => [p.slug, p]));
const bySpecies = new Map();
for (const slug of fs.readdirSync(PARKS)) {
  const file = path.join(PARKS, slug, "biodiversity.generated.json");
  if (!fs.existsSync(file) || !meta.has(slug)) continue;
  const bio = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const s of [...bio.groups.flatMap((g) => g.species), ...bio.threatened]) {
    const key = s.scientificName.trim().toLowerCase();
    if (!bySpecies.has(key)) bySpecies.set(key, new Set());
    bySpecies.get(key).add(slug);
  }
}
const parks = Object.fromEntries([...meta].map(([slug, p]) => [slug, { name: p.shortName, uf: p.admin1 }]));
const species = Object.fromEntries([...bySpecies].filter(([, set]) => set.size > 1).map(([k, set]) => [k, [...set].sort()]));
fs.writeFileSync(path.join(ROOT, "public/geo/br/species-parks.json"), JSON.stringify({ parks, species }));
console.log(`${Object.keys(species).length} espécies em mais de um parque`);

// Perfis editoriais: validados e copiados para public/ (a página os lê de lá).
const profilesFile = path.join(ROOT, "data/br/species-profiles.json");
const profiles = fs.existsSync(profilesFile) ? JSON.parse(fs.readFileSync(profilesFile, "utf8")) : {};
const known = new Set(bySpecies.keys());
for (const slug of fs.readdirSync(PARKS)) {
  const guide = path.join(PARKS, slug, "guide.json");
  if (fs.existsSync(guide)) for (const f of JSON.parse(fs.readFileSync(guide, "utf8")).flagships ?? []) known.add(f.scientificName.trim().toLowerCase());
}
for (const [name, p] of Object.entries(profiles)) {
  if (!known.has(name.trim().toLowerCase())) throw new Error(`species-profiles: "${name}" não consta em nenhum levantamento nem guia`);
  if (!p.sources?.length || p.sources.some((x) => !x.institution || !x.title || !x.url?.startsWith("https://"))) throw new Error(`species-profiles: "${name}" precisa de fontes (institution, title, url https)`);
  if (!(p.summary || p.habits || p.history || p.curiosities?.length)) throw new Error(`species-profiles: "${name}" sem texto`);
  if (/wikip[eé]dia/i.test(JSON.stringify(p))) throw new Error(`species-profiles: "${name}" cita a Wikipédia`);
}
fs.writeFileSync(path.join(ROOT, "public/geo/br/species-profiles.json"), JSON.stringify(Object.fromEntries(Object.entries(profiles).map(([k, v]) => [k.trim().toLowerCase(), v]))));
console.log(`${Object.keys(profiles).length} perfis editoriais`);
