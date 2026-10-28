/**
 * Troca fotos ausentes ou pequenas (< 800 px) de espécies por fotos nítidas do iNaturalist
 * (observações de grau pesquisa, da mesma espécie, em qualquer lugar: ver docs/CURADORIA_FOTOGRAFICA.md).
 * Só mexe em `biodiversity.generated.json`; nunca em fotos escolhidas no guide.json.
 *
 *   node scripts/upgrade-species-photos-inat.mjs                 (simulação: grava .geo-cache/species-photo-plan.json)
 *   node scripts/upgrade-species-photos-inat.mjs --apply         (aplica o plano já gravado)
 *   node scripts/upgrade-species-photos-inat.mjs --limit 20      (testa com poucas espécies)
 *
 * A identificação é a do iNaturalist (nome científico idêntico, grau pesquisa); o contexto da foto
 * deve ser conferido visualmente em amostra antes do --apply.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PARKS = path.join(ROOT, "data/br/parks");
const PLAN = path.join(ROOT, ".geo-cache/species-photo-plan.json");
const UA = { "User-Agent": "RaizAtlas/1.4 (curadoria de fotos de especies; jonathanbalieiro@gmail.com)" };
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const LIMIT = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LIC = {
  cc0: ["CC0", "https://creativecommons.org/publicdomain/zero/1.0/", 0],
  "cc-by": ["CC BY 4.0", "https://creativecommons.org/licenses/by/4.0", 0],
  "cc-by-sa": ["CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0", 0],
  "cc-by-nc": ["CC BY-NC 4.0", "https://creativecommons.org/licenses/by-nc/4.0", 1],
  "cc-by-nc-sa": ["CC BY-NC-SA 4.0", "https://creativecommons.org/licenses/by-nc-sa/4.0", 1],
};

const parkFiles = fs.readdirSync(PARKS).map((p) => path.join(PARKS, p, "biodiversity.generated.json")).filter((f) => fs.existsSync(f));
const speciesOf = (j) => [...(j.groups ?? []).flatMap((g) => g.species ?? []), ...(j.threatened ?? [])];
const weak = (s) => !s.photo || (s.photo.width ?? 0) < 800;

async function getJson(url) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(40000) }).catch(() => null);
    if (r?.ok) return r.json().catch(() => null);
    await sleep(3000 * (i + 1));
  }
  return null;
}

async function best(sci) {
  const url = `https://api.inaturalist.org/v1/observations?taxon_name=${encodeURIComponent(sci)}&quality_grade=research&captive=false&photo_license=cc0,cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa&photos=true&order_by=votes&per_page=40&locale=pt-BR`;
  const r = await getJson(url);
  let top = null;
  for (const o of r?.results ?? []) {
    if (o.taxon?.name !== sci || o.taxon.rank !== "species") continue;
    const p = o.photos?.[0];
    const d = p?.original_dimensions;
    const lic = LIC[p?.license_code];
    if (!p || !d || !lic) continue;
    if (d.width < 1200 || d.width < d.height * 1.1 || d.width > d.height * 2) continue;
    const m = p.url.match(/photos\/(\d+)\/square\.([a-z]+)$/i);
    if (!m) continue;
    const score = (lic[2] ? 0 : 10) + Math.min(o.faves_count ?? 0, 5) + (o.identifications_count ?? 0) / 10;
    if (!top || score > top.score) {
      const author = (p.attribution || "").replace(/^\(c\) /, "").replace(/, (some rights reserved|no rights reserved).*$/, "");
      top = {
        score,
        photo: {
          src: `https://inaturalist-open-data.s3.amazonaws.com/photos/${m[1]}/large.${m[2]}`,
          author, license: lic[0], licenseUrl: lic[1],
          sourceUrl: `https://www.inaturalist.org/photos/${m[1]}`,
          width: 1024, height: Math.round((1024 * d.height) / d.width),
        },
      };
    }
  }
  return top?.photo ?? null;
}

if (!APPLY) {
  const need = new Map();
  for (const f of parkFiles) for (const s of speciesOf(JSON.parse(fs.readFileSync(f, "utf8")))) if (weak(s) && !need.has(s.scientificName)) need.set(s.scientificName, s.name);
  const plan = fs.existsSync(PLAN) ? JSON.parse(fs.readFileSync(PLAN, "utf8")) : {};
  const todo = [...need.keys()].filter((k) => !(k in plan)).slice(0, LIMIT);
  console.log(`${need.size} espécies fracas; ${todo.length} a consultar (${Object.keys(plan).length} já no plano)`);
  let n = 0;
  for (const sci of todo) {
    plan[sci] = await best(sci);
    if (++n % 20 === 0) { fs.writeFileSync(PLAN, JSON.stringify(plan, null, 1)); console.log(`${n}/${todo.length}`); }
    await sleep(1100);
  }
  fs.writeFileSync(PLAN, JSON.stringify(plan, null, 1));
  console.log("com foto nova:", Object.values(plan).filter(Boolean).length, "de", Object.keys(plan).length);
} else {
  const plan = JSON.parse(fs.readFileSync(PLAN, "utf8"));
  let total = 0;
  for (const f of parkFiles) {
    const j = JSON.parse(fs.readFileSync(f, "utf8"));
    let n = 0;
    for (const s of speciesOf(j)) {
      const p = plan[s.scientificName];
      if (p && weak(s)) { s.photo = { ...p, alt: `${s.name} (${s.scientificName})` }; n++; }
    }
    if (n) { fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n"); total += n; }
  }
  console.log("fotos trocadas:", total);
}
