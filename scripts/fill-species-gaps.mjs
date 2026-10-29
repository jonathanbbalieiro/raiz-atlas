/**
 * Preenche lacunas em `biodiversity.generated.json`: nome popular em português (iNaturalist, pt-BR)
 * e foto (fotos curadas do táxon no iNaturalist; mesmas regras de scripts/expand-biodiversity.mjs,
 * incluindo data/br/photo-blocklist.json). Não remove nem acrescenta espécies.
 *
 *   node scripts/fill-species-gaps.mjs            (consulta e grava .geo-cache/species-gaps-plan.json; retomável)
 *   node scripts/fill-species-gaps.mjs --apply    (aplica o plano aos arquivos dos parques)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PARKS = path.join(ROOT, "data/br/parks");
const PLAN = path.join(ROOT, ".geo-cache/species-gaps-plan.json");
const UA = { "User-Agent": "RaizAtlas/1.4 (curadoria de especies; jonathanbalieiro@gmail.com)" };
const APPLY = process.argv.includes("--apply");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LIC = {
  cc0: ["CC0", "https://creativecommons.org/publicdomain/zero/1.0/"],
  "cc-by": ["CC BY 4.0", "https://creativecommons.org/licenses/by/4.0"],
  "cc-by-sa": ["CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0"],
  "cc-by-nc": ["CC BY-NC 4.0", "https://creativecommons.org/licenses/by-nc/4.0"],
  "cc-by-nc-sa": ["CC BY-NC-SA 4.0", "https://creativecommons.org/licenses/by-nc-sa/4.0"],
};
const blocked = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, "data/br/photo-blocklist.json"), "utf8")).rejected.map((r) => r.src));
const files = fs.readdirSync(PARKS).map((p) => path.join(PARKS, p, "biodiversity.generated.json")).filter((f) => fs.existsSync(f));
const all = (j) => [...(j.groups ?? []).flatMap((g) => g.species ?? []), ...(j.threatened ?? [])];
const noName = (s) => !s.name || s.name === s.scientificName;
const noPhoto = (s) => !s.photo || (s.photo.width ?? 0) < 500;

async function getJson(url) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(40000) }).catch(() => null);
    if (r?.ok) return r.json().catch(() => null);
    await sleep(3000 * (i + 1));
  }
  return null;
}

function asPhoto(p, relaxed = false) {
  const lic = LIC[p?.license_code], m = p?.url?.match(/photos\/(\d+)\/square\.([a-z]+)$/i), d = p?.original_dimensions;
  if (!lic || !m || !d) return null;
  // Rigoroso: horizontal e >= 1.200 px. Flexível (espécies raras, com poucas fotos): >= 800 px e proporção entre 0,9 e 2,2.
  const ok = relaxed ? d.width >= 800 && d.width >= d.height * 0.9 && d.width <= d.height * 2.2 : d.width >= 1200 && d.width >= d.height * 1.1 && d.width <= d.height * 2;
  if (!ok) return null;
  const src = `https://inaturalist-open-data.s3.amazonaws.com/photos/${m[1]}/large.${m[2]}`;
  if (blocked.has(src)) return null;
  const author = (p.attribution || "").replace(/^\(c\) /, "").replace(/, (some rights reserved|no rights reserved).*$/, "");
  return { src, author, license: lic[0], licenseUrl: lic[1], sourceUrl: `https://www.inaturalist.org/photos/${m[1]}`, width: 1024, height: Math.round((1024 * d.height) / d.width) };
}

async function lookup(sci, wantName, wantPhoto) {
  const out = { name: null, photo: null };
  const t = await getJson(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(sci)}&rank=species&locale=pt-BR&preferred_place_id=6878&per_page=3&all_names=true`);
  await sleep(1500);
  const taxon = t?.results?.find((x) => x.name === sci);
  if (!taxon) return out;
  if (wantName) {
    const pt = (taxon.names ?? []).filter((n) => n.lexicon === "portuguese").map((n) => n.name);
    out.name = (taxon.preferred_common_name && pt.includes(taxon.preferred_common_name) ? taxon.preferred_common_name : pt[0]) ?? null;
  }
  if (wantPhoto) {
    const full = await getJson(`https://api.inaturalist.org/v1/taxa/${taxon.id}`);
    await sleep(1500);
    const tps = full?.results?.[0]?.taxon_photos ?? [];
    for (const relaxed of [false, true]) {
      for (const tp of tps) { out.photo = asPhoto(tp.photo, relaxed); if (out.photo) break; }
      if (out.photo) break;
    }
  }
  return out;
}

if (!APPLY) {
  const need = new Map();
  for (const f of files) for (const s of all(JSON.parse(fs.readFileSync(f, "utf8")))) {
    const n = noName(s), p = noPhoto(s);
    if (!n && !p) continue;
    const e = need.get(s.scientificName) ?? { n: false, p: false };
    need.set(s.scientificName, { n: e.n || n, p: e.p || p });
  }
  const plan = fs.existsSync(PLAN) ? JSON.parse(fs.readFileSync(PLAN, "utf8")) : {};
  const todo = [...need].filter(([k]) => !(k in plan));
  console.log(`${need.size} espécies com lacuna; ${todo.length} a consultar`);
  const queue = [...todo];
  let done = 0;
  await Promise.all(Array.from({ length: 2 }, async () => {
    while (queue.length) {
      const [sci, w] = queue.shift();
      plan[sci] = await lookup(sci, w.n, w.p);
      if (++done % 20 === 0) { fs.writeFileSync(PLAN, JSON.stringify(plan)); console.log(`${done}/${todo.length}`); }
    }
  }));
  fs.writeFileSync(PLAN, JSON.stringify(plan));
  const v = Object.values(plan);
  console.log("com nome:", v.filter((x) => x.name).length, "| com foto:", v.filter((x) => x.photo).length, "de", v.length);
} else {
  const plan = JSON.parse(fs.readFileSync(PLAN, "utf8"));
  let names = 0, photos = 0;
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(f, "utf8"));
    let ch = false;
    for (const s of all(j)) {
      const p = plan[s.scientificName];
      if (!p) continue;
      if (noName(s) && p.name) { s.name = p.name.charAt(0).toUpperCase() + p.name.slice(1); names++; ch = true; }
      if (noPhoto(s) && p.photo) { s.photo = { ...p.photo, alt: `${s.name ?? s.scientificName} (${s.scientificName})` }; photos++; ch = true; }
    }
    if (ch) fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n");
  }
  console.log({ names, photos });
}
