/**
 * Amplia "Quem vive aqui" SEM regenerar: mantém as espécies e fotos já curadas de cada
 * `biodiversity.generated.json` e acrescenta as seguintes mais registradas no GBIF dentro do
 * polígono (mesmos filtros do fetch-biodiversity: GRIIS, exclusões, só espécies). Entra só espécie
 * com nome popular em português e foto nítida do iNaturalist (grau pesquisa, horizontal, >= 1.200 px,
 * mesma espécie; ver docs/CURADORIA_FOTOGRAFICA.md: fotos de organismos podem ser de outro lugar).
 * Código-base copiado de scripts/fetch-biodiversity.mjs.
 *
 *   node scripts/expand-biodiversity.mjs emas serra-do-cipo     (slugs; sem slug = todos)
 *
 * Depois: node scripts/clean-biodiversity.mjs && node scripts/check-content.mjs
 */
import crypto from "node:crypto";

import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const COUNTRY = "br";
const UA = { "User-Agent": "raiz-atlas/1.1 (pipeline de biodiversidade; uso educativo)" };
const COMMERCIAL_OK = /^(CC0|Public domain|CC BY(-SA)? [0-9.]+( [a-z]{2})?)$/i;
const GRIIS_BRAZIL = "21cf83b3-fec6-4c42-95bc-b8555a991bc3";
/** Pontos do polígono enviado ao GBIF (a geometria vai na URL, que tem limite de tamanho). */
const WKT_POINTS = [140, 60];
const ACCESSED = new Date().toISOString().slice(0, 10);

/** Grupos exibidos; `take` limita a seleção por registros, independentemente de foto. */
const GROUPS = [
  { id: "mamiferos", label: "Mamíferos", query: "classKey=359", facet: 60, take: 12 },
  { id: "aves", label: "Aves", query: "classKey=212", facet: 60, take: 16 },
  { id: "repteis", label: "Répteis", query: "classKey=11592253&classKey=11418114&classKey=11493978", facet: 60, take: 8 },
  { id: "anfibios", label: "Anfíbios", query: "classKey=131", facet: 60, take: 8 },
  { id: "peixes", label: "Peixes", query: "classKey=204&classKey=121", facet: 60, take: 8 },
  { id: "borboletas", label: "Borboletas e mariposas", query: "orderKey=797", facet: 60, take: 8 },
  { id: "plantas", label: "Plantas", query: "phylumKey=7707728", facet: 60, take: 16 },
];
const THREAT = ["CR", "EN", "VU"];
/** Registros que o GRIIS não cobre como espécie (domésticos registrados como espécie selvagem). */
const BLOCK = new Set([5219173 /* Canis lupus (cães) */, 2436436 /* Homo sapiens */]);
const IUCN_QID = {
  Q211005: "LC", Q719675: "NT", Q278113: "VU", Q11394: "EN", Q219127: "CR",
  Q239509: "EW", Q237350: "EX", Q3245245: "DD",
};

/** Cultivadas, domésticas e exóticas apontadas por scripts/clean-biodiversity.mjs: nunca voltam numa nova coleta. */
const EXCL = (() => {
  try {
    return JSON.parse(fsSync.readFileSync(path.join(ROOT, "data", COUNTRY, "bio-exclusions.json"), "utf8"));
  } catch {
    return {};
  }
})();
const excluded = (slug, name) => !!(EXCL.plants?.[name] || EXCL.animals?.[name] || EXCL.perPark?.[slug]?.[name]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (h = "") => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

async function getJson(url, { headers, allowFail = false } = {}) {
  const file = path.join(ROOT, ".geo-cache", "bio", crypto.createHash("sha1").update(url).digest("hex") + ".json");
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {}
  for (let attempt = 0; attempt < 6; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers: { ...UA, ...headers } });
    } catch {
      await sleep(3000 * (attempt + 1));
      continue;
    }
    const text = await res.text();
    if (res.ok && /^[[{]/.test(text)) {
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, text);
      return JSON.parse(text);
    }
    if (allowFail && res.status >= 400 && res.status < 500 && res.status !== 429) return null;
    await sleep(4000 * (attempt + 1));
  }
  if (allowFail) return null;
  throw new Error(`Falha ao buscar ${url}`);
}

/* ---------- Polígono do parque -> WKT aceito pelo GBIF ---------- */

const area = (ring) => {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  return a / 2; // > 0: anti-horário
};
function simplify(points, tol) {
  if (points.length < 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    const [ax, ay] = points[s], [bx, by] = points[e];
    let max = 0, idx = -1;
    for (let i = s + 1; i < e; i++) {
      const [px, py] = points[i];
      const d = Math.abs((by - ay) * px - (bx - ax) * py + bx * ay - by * ax) / (Math.hypot(bx - ax, by - ay) || 1);
      if (d > max) [max, idx] = [d, i];
    }
    if (max > tol && idx > 0) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}
/** Anel fechado: primeiro = último, o que anularia o Douglas-Peucker; divide no ponto mais distante. */
function simplifyRing(ring, tol) {
  const open = ring.slice(0, -1);
  let far = 0, max = -1;
  open.forEach(([x, y], i) => {
    const d = (x - open[0][0]) ** 2 + (y - open[0][1]) ** 2;
    if (d > max) [max, far] = [d, i];
  });
  const a = simplify(open.slice(0, far + 1), tol);
  const b = simplify([...open.slice(far), open[0]], tol);
  return [...a, ...b.slice(1)];
}
function hull(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), q) <= 0) lower.pop();
    lower.push(q);
  }
  for (const q of p.reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), q) <= 0) upper.pop();
    upper.push(q);
  }
  const h = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  return [...h, h[0]];
}
// 3 casas decimais: cerca de 100 m, abaixo da precisão das próprias ocorrências.
const ringWkt = (r) => "(" + r.map(([x, y]) => `${x.toFixed(3)} ${y.toFixed(3)}`).join(",") + ")";

function parkWkt(feature, maxPoints) {
  const g = feature.geometry ?? feature;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  let rings = polys.map((p) => p[0]).sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
  const total = rings.reduce((n, r) => n + Math.abs(area(r)), 0);
  rings = rings.filter((r, i) => i === 0 || Math.abs(area(r)) > total * 0.002).slice(0, 10);
  let tol = 0.002, out;
  do {
    out = rings.map((r) => simplifyRing(r, tol)).filter((r) => r.length >= 4);
    tol *= 1.5;
  } while (out.reduce((n, r) => n + r.length, 0) > maxPoints);
  out = out.map((r) => (area(r) > 0 ? r : [...r].reverse()));
  const exact = out.length === 1 ? `POLYGON(${ringWkt(out[0])})` : `MULTIPOLYGON(${out.map((r) => `(${ringWkt(r)})`).join(",")})`;
  const h = hull(rings.flat());
  return { exact, hull: `POLYGON(${ringWkt(area(h) > 0 ? h : [...h].reverse())})` };
}

/* ---------- Consultas ---------- */

const BASE =
  "https://api.gbif.org/v1/occurrence/search?limit=0&occurrenceStatus=PRESENT&hasGeospatialIssue=false" +
  "&basisOfRecord=HUMAN_OBSERVATION&basisOfRecord=PRESERVED_SPECIMEN&basisOfRecord=MACHINE_OBSERVATION" +
  "&basisOfRecord=MATERIAL_SAMPLE&basisOfRecord=OCCURRENCE&basisOfRecord=OBSERVATION&facet=speciesKey&facetMincount=2";

async function gbifFacet(wkt, extra, limit) {
  const r = await getJson(`${BASE}&geometry=${encodeURIComponent(wkt)}&${extra}&facetLimit=${limit}`, { allowFail: true });
  if (!r) return null;
  return { records: r.count, species: (r.facets[0]?.counts ?? []).map((c) => ({ key: Number(c.name), records: c.count })) };
}

async function griisKeys() {
  const keys = new Set();
  for (let offset = 0; ; offset += 1000) {
    const r = await getJson(`https://api.gbif.org/v1/species/search?datasetKey=${GRIIS_BRAZIL}&limit=1000&offset=${offset}`);
    for (const s of r.results) if (s.nubKey) keys.add(s.nubKey);
    if (r.endOfRecords) break;
  }
  return keys;
}

const speciesInfo = new Map();
async function gbifSpecies(keys) {
  const todo = keys.filter((k) => !speciesInfo.has(k));
  for (let i = 0; i < todo.length; i += 8) {
    await Promise.all(
      todo.slice(i, i + 8).map(async (k) => {
        const s = await getJson(`https://api.gbif.org/v1/species/${k}`, { allowFail: true });
        speciesInfo.set(k, s ? { scientificName: s.canonicalName ?? s.scientificName, rank: s.rank, family: s.family ?? null } : null);
      }),
    );
  }
}

const wikidata = new Map();
async function wikidataInfo(keys) {
  const todo = keys.filter((k) => !wikidata.has(k));
  for (let i = 0; i < todo.length; i += 120) {
    const batch = todo.slice(i, i + 120);
    const q = `SELECT ?gbif ?item ?ptbr ?pt ?img ?iucn WHERE {
      VALUES ?gbif { ${batch.map((k) => `"${k}"`).join(" ")} }
      ?item wdt:P846 ?gbif.
      OPTIONAL { ?item rdfs:label ?ptbr FILTER(lang(?ptbr) = "pt-br") }
      OPTIONAL { ?item rdfs:label ?pt FILTER(lang(?pt) = "pt") }
      OPTIONAL { ?item wdt:P18 ?img }
      OPTIONAL { ?item wdt:P141 ?iucn }
    }`;
    const r = await getJson("https://query.wikidata.org/sparql?query=" + encodeURIComponent(q), {
      headers: { Accept: "application/sparql-results+json" },
    });
    for (const k of batch) wikidata.set(k, { qid: null, names: [], images: [], iucn: null });
    for (const b of r.results.bindings) {
      const e = wikidata.get(Number(b.gbif.value));
      e.qid ??= b.item.value.split("/").pop();
      // Rótulo pt-BR primeiro (o "pt" às vezes é a forma de Portugal: "grande-kiskadi" x bem-te-vi).
      for (const l of [b.ptbr?.value, b.pt?.value]) if (l && !e.names.includes(l)) e.names.push(l);
      e.iucn ??= b.iucn ? IUCN_QID[b.iucn.value.split("/").pop()] ?? null : null;
      if (b.img) {
        const t = "File:" + decodeURIComponent(b.img.value.split("/Special:FilePath/")[1]);
        if (!e.images.includes(t)) e.images.push(t);
      }
    }
    await sleep(1200);
  }
}

/** Reserva para nome popular: iNaturalist (resolve sinônimos, ex.: Aratinga aurea -> periquito-rei). */
const inat = new Map();
async function inatInfo(keys) {
  for (const k of keys) {
    if (inat.has(k) || !speciesInfo.get(k)) continue;
    const name = speciesInfo.get(k).scientificName;
    const r = await getJson(
      "https://api.inaturalist.org/v1/taxa?rank=species&locale=pt-BR&preferred_place_id=6878&per_page=3&q=" + encodeURIComponent(name),
      { allowFail: true },
    );
    const t = r?.results?.find((x) => x.matched_term?.toLowerCase() === name.toLowerCase());
    inat.set(k, t ? {
      name: t.preferred_common_name && t.preferred_common_name !== t.english_common_name ? t.preferred_common_name : null,
      introduced: t.establishment_means?.establishment_means === "introduced",
    } : null);
    await sleep(1100); // limite recomendado pelo iNaturalist: ~1 requisição por segundo
  }
}

const commons = new Map();
async function commonsInfo(titles) {
  const todo = [...new Set(titles)].filter((t) => !commons.has(t));
  // Lotes de 25: nomes de arquivo longos estouram o limite de tamanho da URL com 50.
  for (let i = 0; i < todo.length; i += 25) {
    const batch = todo.slice(i, i + 25);
    const r = await getJson(
      "https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo" +
        "&iiprop=url|extmetadata|size|mime&iiurlwidth=640&titles=" + encodeURIComponent(batch.join("|")),
      { allowFail: true },
    );
    for (const t of batch) commons.set(t, null);
    if (!r?.query) continue; // falha pontual: essas espécies ficam sem foto, o resto segue
    const normalized = new Map((r.query.normalized ?? []).map((n) => [n.to, n.from]));
    for (const page of r.query.pages ?? []) {
      const ii = page.imageinfo?.[0];
      if (!ii) continue;
      const m = ii.extmetadata ?? {};
      const lic = m.LicenseShortName?.value ?? "";
      if (!COMMERCIAL_OK.test(lic) || !/jpeg|png|webp/.test(ii.mime ?? "") || !ii.thumburl) continue;
      commons.set(normalized.get(page.title) ?? page.title, {
        src: ii.thumburl.split("?")[0],
        author: strip(m.Artist?.value).slice(0, 80) || "Autor desconhecido",
        license: lic,
        licenseUrl: m.LicenseUrl?.value ?? "https://commons.wikimedia.org/wiki/Commons:Public_domain",
        sourceUrl: ii.descriptionurl,
        width: ii.thumbwidth,
        height: ii.thumbheight,
      });
    }
    await sleep(1200);
  }
}

/* ---------- Ampliação ---------- */
const LIC = {
  cc0: ["CC0", "https://creativecommons.org/publicdomain/zero/1.0/", 0],
  "cc-by": ["CC BY 4.0", "https://creativecommons.org/licenses/by/4.0", 0],
  "cc-by-sa": ["CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0", 0],
  "cc-by-nc": ["CC BY-NC 4.0", "https://creativecommons.org/licenses/by-nc/4.0", 1],
  "cc-by-nc-sa": ["CC BY-NC-SA 4.0", "https://creativecommons.org/licenses/by-nc-sa/4.0", 1],
};
const SHARD_TAG = process.argv.includes("--shard") ? "-" + process.argv[process.argv.indexOf("--shard") + 1].replace("/", "of") : "";
const PHOTO_CACHE = path.join(ROOT, ".geo-cache", `expand-photo-cache${SHARD_TAG}.json`);
const photoCache = fsSync.existsSync(PHOTO_CACHE) ? JSON.parse(fsSync.readFileSync(PHOTO_CACHE, "utf8")) : (fsSync.existsSync(path.join(ROOT, ".geo-cache", "expand-photo-cache.json")) ? JSON.parse(fsSync.readFileSync(path.join(ROOT, ".geo-cache", "expand-photo-cache.json"), "utf8")) : {});
const PLAN = path.join(ROOT, ".geo-cache", "species-photo-plan.json");
const plan = fsSync.existsSync(PLAN) ? JSON.parse(fsSync.readFileSync(PLAN, "utf8")) : {};

async function rawJson(url) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(40000) }).catch(() => null);
    if (r?.ok) return r.json().catch(() => null);
    await sleep(3000 * (i + 1));
  }
  return null;
}

const BLOCK_FILE = path.join(ROOT, "data", COUNTRY, "photo-blocklist.json");
const blockedSrc = new Set(fsSync.existsSync(BLOCK_FILE) ? JSON.parse(fsSync.readFileSync(BLOCK_FILE, "utf8")).rejected.map((r) => r.src) : []);
const okDims = (d) => d && d.width >= 1200 && d.width >= d.height * 1.1 && d.width <= d.height * 2;
const asPhoto = (p) => {
  const lic = LIC[p?.license_code], m = p?.url?.match(/photos\/(\d+)\/square\.([a-z]+)$/i), d = p?.original_dimensions;
  if (!lic || !m || !okDims(d)) return null;
  const author = (p.attribution || "").replace(/^\(c\) /, "").replace(/, (some rights reserved|no rights reserved).*$/, "");
  const src = `https://inaturalist-open-data.s3.amazonaws.com/photos/${m[1]}/large.${m[2]}`;
  if (blockedSrc.has(src)) return null;
  return { src, author, license: lic[0], licenseUrl: lic[1], sourceUrl: `https://www.inaturalist.org/photos/${m[1]}`, width: 1024, height: Math.round((1024 * d.height) / d.width) };
};

/** Foto do iNaturalist para a espécie: primeiro as fotos curadas do táxon (em ordem de qualidade), depois a observação mais votada. Cache em disco; null = sem foto adequada. */
async function inatPhoto(sci) {
  const cached = photoCache[sci] ?? plan[sci];
  if (cached && !blockedSrc.has(cached.src)) return (photoCache[sci] = cached);
  let photo = null;
  const t = await rawJson(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(sci)}&rank=species&per_page=3`);
  await sleep(1500);
  const taxon = t?.results?.find((x) => x.name === sci);
  if (taxon) {
    const full = await rawJson(`https://api.inaturalist.org/v1/taxa/${taxon.id}`);
    await sleep(1500);
    for (const tp of full?.results?.[0]?.taxon_photos ?? []) { photo = asPhoto(tp.photo); if (photo) break; }
  }
  if (!photo) {
    const r = await rawJson(`https://api.inaturalist.org/v1/observations?taxon_name=${encodeURIComponent(sci)}&quality_grade=research&captive=false&photo_license=cc0,cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa&photos=true&popular=true&order_by=votes&per_page=40&locale=pt-BR`);
    await sleep(1500);
    for (const o of r?.results ?? []) {
      if (o.taxon?.name !== sci || o.taxon.rank !== "species") continue;
      photo = asPhoto(o.photos?.[0]);
      if (photo) break;
    }
  }
  photoCache[sci] = photo;
  fsSync.writeFileSync(PHOTO_CACHE, JSON.stringify(photoCache));
  return photo;
}

const parks = JSON.parse(await fs.readFile(path.join(ROOT, "data", COUNTRY, "parks.generated.json"), "utf8"));
const argv = process.argv.slice(2);
const shardArg = argv.includes("--shard") ? argv[argv.indexOf("--shard") + 1] : null; // "i/n": processa o parque de índice k se k % n === i
const only = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--shard");
let selected = only.length ? parks.filter((p) => only.includes(p.slug)) : parks;
if (shardArg) { const [i, n] = shardArg.split("/").map(Number); selected = selected.filter((_, k) => k % n === i); }
const introduced = await griisKeys();
let done = 0;
for (const park of selected) {
  const file = path.join(ROOT, "data", COUNTRY, "parks", park.slug, "biodiversity.generated.json");
  if (!fsSync.existsSync(file)) continue;
  const bio = JSON.parse(await fs.readFile(file, "utf8"));
  if (bio.expandedAt === ACCESSED && !argv.includes("--force")) { console.log(`${park.slug}: já ampliado hoje, pulando`); continue; }
  const feature = JSON.parse(await fs.readFile(path.join(ROOT, "public", "geo", COUNTRY, "parks", `${park.slug}.json`), "utf8"));
  let wkt = null;
  for (const n of WKT_POINTS) {
    const { exact } = parkWkt(feature, n);
    if (await gbifFacet(exact, "classKey=359", 1)) { wkt = exact; break; }
  }
  wkt ??= parkWkt(feature, WKT_POINTS[0]).hull;

  const have = new Set([...bio.groups.flatMap((g) => g.species), ...bio.threatened].map((s) => s.scientificName));
  const raw = [];
  for (const g of GROUPS) raw.push({ ...g, result: await gbifFacet(wkt, g.query, g.facet) });
  const keys = [...new Set(raw.flatMap((g) => g.result?.species.map((s) => s.key) ?? []))];
  await gbifSpecies(keys);
  await wikidataInfo(keys);

  // Fichas já existentes sem foto ou com foto pequena (< 500 px) ganham foto curada do iNaturalist.
  for (const sp of [...bio.groups.flatMap((g) => g.species), ...bio.threatened]) {
    if (sp.photo && (sp.photo.width ?? 0) >= 500) continue;
    const ph = await inatPhoto(sp.scientificName);
    if (ph) sp.photo = { ...ph, alt: `${sp.name ?? sp.scientificName} (${sp.scientificName})` };
  }
  let added = 0;
  for (const g of raw) {
    let grp = bio.groups.find((x) => x.id === g.id);
    const quota = g.take - (grp?.species.length ?? 0);
    if (quota <= 0 || !g.result) continue;
    const fresh = [];
    for (const s of g.result.species) { // já vem em ordem decrescente de registros
      if (fresh.length >= quota) break;
      const info = speciesInfo.get(s.key);
      if (!info || info.rank !== "SPECIES" || have.has(info.scientificName) || introduced.has(s.key) || BLOCK.has(s.key) || excluded(park.slug, info.scientificName)) continue;
      const wd = wikidata.get(s.key);
      let pt = wd?.names.find((n) => n.toLowerCase() !== info.scientificName.toLowerCase()) ?? null;
      // só espécies com nome popular na Wikidata (as mais conhecidas); sem consulta extra ao iNaturalist
      if (!pt || pt.toLowerCase().startsWith(info.scientificName.split(" ")[0].toLowerCase() + " ")) continue; // sem nome popular (ou só o nome científico)
      const photo = await inatPhoto(info.scientificName);
      if (!photo) continue;
      have.add(info.scientificName);
      fresh.push({
        gbifKey: s.key, scientificName: info.scientificName, name: pt.charAt(0).toUpperCase() + pt.slice(1),
        family: info.family, records: s.records, iucn: wd?.iucn ?? null, wikidata: wd?.qid ?? null,
        photo: { ...photo, alt: `${pt} (${info.scientificName})` },
      });
    }
    if (!fresh.length) continue;
    if (!grp) { grp = { id: g.id, label: g.label, records: g.result.records, species: [] }; bio.groups.push(grp); }
    grp.species.push(...fresh);
    added += fresh.length;
  }
  bio.expandedAt = ACCESSED;
  await fs.writeFile(file, JSON.stringify(bio, null, 2) + "\n");
  done++;
  console.log(`[${done}/${selected.length}] ${park.slug}: +${added} espécies`);
}
