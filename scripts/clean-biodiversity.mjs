/**
 * Limpa o levantamento de biodiversidade de espécies que não são da vida
 * silvestre do parque (alface, milho, gado, cães, pombos, espécies exóticas).
 *
 *  Plantas   Flora e Funga do Brasil (JBRJ): remove quando o único status
 *            registrado é Exótica, Cultivada ou Naturalizada. Sem registro lá
 *            (nome não resolvido) fica para revisão, não é removida.
 *  Animais   lista de domésticos/exóticos conhecidos + GRIIS (já aplicada na coleta).
 *
 * As exclusões ficam em data/br/bio-exclusions.json, que `fetch-biodiversity.mjs`
 * também lê: uma nova coleta não traz as espécies de volta.
 *
 * Uso:  node scripts/clean-biodiversity.mjs --dry     (só relatório)
 *       node scripts/clean-biodiversity.mjs           (aplica)
 * Respostas da API ficam em .geo-cache/flora.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "data", "br");
const CACHE = path.join(ROOT, ".geo-cache", "flora");
const DRY = process.argv.includes("--dry");
fs.mkdirSync(CACHE, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = { "User-Agent": "raiz-atlas/1.3 (limpeza de biodiversidade; uso educativo)" };

/** Domésticos, ferais e exóticos comuns que aparecem como "espécie selvagem" nos registros. */
const ANIMAL_BLOCK = new Set(
  [
    "Bos taurus", "Bos indicus", "Bubalus bubalis", "Equus caballus", "Equus asinus", "Sus scrofa", "Capra hircus", "Ovis aries",
    "Gallus gallus", "Meleagris gallopavo", "Anas platyrhynchos", "Cairina moschata", "Anser anser", "Numida meleagris", "Pavo cristatus",
    "Columba livia", "Passer domesticus", "Sturnus vulgaris", "Estrilda astrild", "Lonchura punctulata", "Lonchura malacca", "Psittacula krameri",
    "Myiopsitta monachus", "Melopsittacus undulatus", "Felis catus", "Canis familiaris", "Canis lupus", "Mus musculus", "Rattus rattus", "Rattus norvegicus",
    "Oryctolagus cuniculus", "Lepus europaeus", "Cavia porcellus", "Apis mellifera", "Bombyx mori", "Rhipicephalus microplus",
    "Oreochromis niloticus", "Cyprinus carpio", "Ctenopharyngodon idella", "Poecilia reticulata", "Lithobates catesbeianus", "Rana catesbeiana",
    "Trachemys scripta", "Hemidactylus mabouia", "Hemidactylus frenatus", "Achatina fulica", "Corbicula fluminea", "Limnoperna fortunei",
    "Tilapia rendalli", "Coptodon rendalli", "Colossoma macropomum", "Pterophyllum scalare", "Cichla kelberi", "Cichla ocellaris", "Cichla monoculus",
    "Homo sapiens", "Aedes aegypti", "Aedes albopictus", "Musca domestica", "Blattella germanica", "Periplaneta americana",
  ].map((s) => s.toLowerCase()),
);

/** Plantas sabidamente cultivadas, para pegar mesmo o que a Flora não resolve. */
const PLANT_BLOCK_GENERA = new Set(
  [
    "Lactuca", "Zea", "Glycine", "Oryza", "Triticum", "Hordeum", "Saccharum", "Coffea", "Solanum lycopersicum", "Capsicum", "Cucurbita", "Cucumis",
    "Citrullus", "Daucus", "Beta", "Brassica", "Allium", "Phaseolus", "Pisum", "Musa", "Mangifera", "Citrus",
    "Eucalyptus", "Pinus", "Helianthus annuus", "Gossypium", "Sorghum", "Pennisetum", "Urochloa", "Megathyrsus", "Melinis", "Hyparrhenia",
  ].map((s) => s.toLowerCase()),
);

const cacheFile = (name) => path.join(CACHE, crypto.createHash("sha1").update(name).digest("hex") + ".json");

async function flora(name) {
  const f = cacheFile(name);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
  const url = "https://servicos.jbrj.gov.br/v2/flora/taxon/" + encodeURIComponent(name);
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (res.ok) {
        const text = await res.text();
        let json = [];
        try { json = JSON.parse(text); } catch { json = []; }
        const hit = (Array.isArray(json) ? json : []).find((x) => x.taxon?.taxonomicstatus === "NOME_ACEITO") ?? json[0];
        const dist = (hit?.distribuition ?? []).map((d) => ({ uf: d.locationid, means: d.establishmentmeans, dom: d.occurrenceremarks?.phytogeographicDomain ?? [] }));
        const rec = hit ? { found: true, accepted: hit.taxon.scientificname, status: hit.taxon.taxonomicstatus, dist } : { found: false };
        fs.writeFileSync(f, JSON.stringify(rec));
        return rec;
      }
      if (res.status === 404) { const rec = { found: false }; fs.writeFileSync(f, JSON.stringify(rec)); return rec; }
    } catch {}
    await sleep(3000 * (attempt + 1));
  }
  return { found: false, error: true };
}

const DOMAIN = { amazonia: "Amazônia", cerrado: "Cerrado", mata_atlantica: "Mata Atlântica", caatinga: "Caatinga", pantanal: "Pantanal", pampa: "Pampa" };
/** Domínios vizinhos: nos limites entre biomas e nos mosaicos (campos rupestres, ecótonos) a espécie do domínio ao lado é plausível. */
const NEIGHBORS = {
  "Cerrado": ["Amazônia", "Caatinga", "Mata Atlântica", "Pantanal"],
  "Caatinga": ["Cerrado", "Mata Atlântica"],
  "Amazônia": ["Cerrado", "Pantanal"],
  "Mata Atlântica": ["Cerrado", "Caatinga", "Pampa", "Pantanal"],
  "Pantanal": ["Cerrado", "Amazônia", "Mata Atlântica"],
  "Pampa": ["Mata Atlântica"],
};
const verdict = (rec, biomes = []) => {
  if (!rec.found) return { kind: "nao-resolvida" };
  const means = new Set(rec.dist.map((d) => (d.means ?? "").toLowerCase()));
  if (!means.size) return { kind: "sem-status" };
  const native = [...means].some((m) => m.startsWith("nativ") || m.startsWith("endêm") || m.startsWith("endem"));
  if (native) {
    // Nativa do Brasil, mas só de domínios que não são o do parque: registro duvidoso (herbário mal georreferenciado, erro de identificação).
    const domains = new Set(rec.dist.filter((d) => /^nativ|^endêm|^endem/i.test(d.means ?? "")).flatMap((d) => d.dom));
    const own = biomes.map((b) => DOMAIN[b]).filter(Boolean);
    const wanted = [...new Set(own.flatMap((w) => [w, ...(NEIGHBORS[w] ?? [])]))];
    if (domains.size && wanted.length && !wanted.some((w) => domains.has(w))) return { kind: "fora-do-bioma", domains: [...domains] };
    return { kind: "nativa" };
  }
  return { kind: "nao-nativa", means: [...means] };
};

/* ---------- coleta ---------- */
const parks = JSON.parse(fs.readFileSync(path.join(DATA, "parks.generated.json"), "utf8"));
const files = fs.readdirSync(path.join(DATA, "parks")).map((slug) => ({ slug, file: path.join(DATA, "parks", slug, "biodiversity.generated.json") })).filter((x) => fs.existsSync(x.file));
const bios = new Map(files.map((x) => [x.slug, JSON.parse(fs.readFileSync(x.file, "utf8"))]));

const plantNames = new Set();
for (const b of bios.values()) {
  for (const g of b.groups) if (g.id === "plantas") for (const s of g.species) plantNames.add(s.scientificName);
  for (const s of b.threatened) plantNames.add(s.scientificName); // plantas ameaçadas entram na consulta; animais serão ignorados pelo veredito
}
console.log(`${plantNames.size} nomes para consultar na Flora e Funga do Brasil`);
const verdicts = new Map();
let n = 0;
for (const name of plantNames) {
  const binomial = name.split(" ").slice(0, 2).join(" ");
  verdicts.set(name, { rec: await flora(binomial) });
  if (++n % 50 === 0) process.stdout.write(`  ${n}/${plantNames.size}\r`);
  if (!fs.existsSync(cacheFile(binomial))) await sleep(300);
}

/* ---------- decisões ---------- */
const excl = { plants: {}, animals: {}, perPark: {}, generatedAt: new Date().toISOString().slice(0, 10), source: "Flora e Funga do Brasil (JBRJ) e lista de domésticos/exóticos" };
const review = [];
const excluded_bio = [];
const isPlantGroup = (b, s) => b.groups.find((g) => g.id === "plantas")?.species.some((x) => x.gbifKey === s.gbifKey);
for (const [slug, b] of bios) {
  for (const s of [...b.groups.flatMap((g) => g.species), ...b.threatened]) {
    const lname = s.scientificName.toLowerCase();
    const genus = lname.split(" ")[0];
    if (ANIMAL_BLOCK.has(lname.split(" ").slice(0, 2).join(" "))) { excl.animals[s.scientificName] = "doméstico, exótico ou invasor"; continue; }
    if (!isPlantGroup(b, s)) continue;
    const v = verdict(verdicts.get(s.scientificName).rec, parks.find((p) => p.slug === slug)?.biomes ?? []);
    if (v.kind === "nativa") continue;
    if (v.kind === "fora-do-bioma") { (excl.perPark[slug] ??= {})[s.scientificName] = `Flora e Funga do Brasil: nativa só de ${v.domains.join(", ")}`; excluded_bio.push(`${slug}: ${s.scientificName} (nativa só de ${v.domains.join(", ")})`); continue; }
    if (v.kind === "nao-nativa") excl.plants[s.scientificName] = `Flora e Funga do Brasil: ${v.means.join(", ")}`;
    else if (PLANT_BLOCK_GENERA.has(genus) || PLANT_BLOCK_GENERA.has(lname.split(" ").slice(0, 2).join(" "))) excl.plants[s.scientificName] ??= "cultivada ou exótica conhecida";
    else if (v.kind === "nao-resolvida" || v.kind === "sem-status") review.push(`${slug}: ${s.scientificName} (${v.kind})`);
  }
}

let removed = 0;
const perPark = {};
for (const [slug, b] of bios) {
  const drop = (s) => excl.plants[s.scientificName] || excl.animals[s.scientificName] || excl.perPark[slug]?.[s.scientificName];
  let c = 0;
  for (const g of b.groups) { const keep = g.species.filter((s) => !drop(s)); c += g.species.length - keep.length; g.species = keep; }
  const th = b.threatened.filter((s) => !drop(s)); c += b.threatened.length - th.length; b.threatened = th;
  if (c) { perPark[slug] = c; removed += c; if (!DRY) fs.writeFileSync(path.join(DATA, "parks", slug, "biodiversity.generated.json"), JSON.stringify(b, null, 2) + "\n"); }
}
if (!DRY) fs.writeFileSync(path.join(DATA, "bio-exclusions.json"), JSON.stringify(excl, null, 2) + "\n");
fs.writeFileSync(path.join(ROOT, ".geo-cache", "bio-revisar.txt"), review.join("\n"));
console.log(`\nexcluídas: ${Object.keys(excl.plants).length} plantas e ${Object.keys(excl.animals).length} animais em geral, mais ${Object.values(excl.perPark).reduce((n, o) => n + Object.keys(o).length, 0)} plantas fora do bioma de um parque específico (${removed} fichas removidas em ${Object.keys(perPark).length} parques)${DRY ? " [dry-run]" : ""}`);
console.log("para revisão (nome não resolvido na Flora):", review.length, "— .geo-cache/bio-revisar.txt");
console.log("plantas removidas:", Object.entries(excl.plants).slice(0, 40).map(([k, v]) => `${k} [${v.replace("Flora e Funga do Brasil: ", "")}]`).join("; "));
console.log("animais removidos:", Object.keys(excl.animals).join("; "));
