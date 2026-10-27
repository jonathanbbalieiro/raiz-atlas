/**
 * Busca candidatas de foto para maravilhas sem imagem e para capas/galerias
 * pequenas, e monta folhas de contato para revisão visual. Não grava nada nos
 * dados: a escolha é editorial (ver docs/CURADORIA_FOTOGRAFICA.md).
 *
 *   NODE_USE_ENV_PROXY=1 node --env-file=.env.local scripts/find-photo-candidates.mjs --wonders [parque...] --out <pasta>
 *   NODE_USE_ENV_PROXY=1 node scripts/find-photo-candidates.mjs --covers [parque...] --out <pasta>
 *
 * Fontes: Wikimedia Commons (texto, categorias e fotos com coordenadas dentro do
 * polígono do parque) e Wikidata (itens do atrativo com foto P18 e categoria P373).
 * Cada candidata traz a evidência de lugar encontrada; nenhuma é aprovada aqui.
 * Respostas ficam em cache em .geo-cache/photo-finder (o Commons limita requisições).
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE = path.join(ROOT, ".geo-cache", "photo-finder");
const UA = { "User-Agent": "RaizAtlas/1.4 (curadoria de fotos; jonathanbalieiro@gmail.com)" };
const args = process.argv.slice(2);
const mode = args.includes("--covers") ? "covers" : "wonders";
const outDir = args[args.indexOf("--out") + 1];
const only = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--out");
if (!outDir || args.indexOf("--out") < 0) {
  console.log("Uso: node scripts/find-photo-candidates.mjs --wonders|--covers [parque...] --out <pasta>");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (h = "") => String(h).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const fold = (s = "") => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
// Licenças aceitas pelo projeto; ND nunca (o layout recorta as fotos).
const LICENSE_OK = /^(CC0|Public domain|PD|CC BY(-NC)?(-SA)? [0-9.]+( [a-z]{2})?)$/i;
const NOT_PHOTO = /\b(map|mapa|logo|diagram|diagrama|bandeira|flag|selo|brasao|carta|planta baixa|grafico|chart|svg|scan|exsicata|herbarium)\b/;
// Pessoas: o projeto não usa retratos de indígenas nem de crianças; o resto passa por revisão visual.
const PEOPLE = /\b(crianca|criancas|indigena|indigenas|retrato|portrait|selfie)\b/;
// Fotos da Estação Espacial: a coordenada é o ponto sob a estação, não o assunto. Figuras de artigo também ficam de fora.
const NOT_EVIDENCE = /\biss0\d{2}-e-|view of (earth|south america|brazil)|\bfigure \d|zookeys|\bfig\. ?\d/;
const STOP = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "as", "os", "na", "no", "em", "para", "com", "ate", "junto", "rio", "rios", "serra", "lago", "lagoa", "cachoeira", "cachoeiras", "parque", "nacional", "trilha", "trilhas", "morro", "campos", "mirante", "gruta", "cavernas"]);

let failures = 0;
async function getJson(url) {
  const key = crypto.createHash("sha1").update(url).digest("hex");
  const file = path.join(CACHE, `${key}.json`);
  try {
    const cached = JSON.parse(await fs.readFile(file, "utf8"));
    if (!cached.error && cached.stat !== "fail") return cached;
  } catch { /* sem cache */ }
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(60000) }).catch(() => null);
    const json = res?.ok ? await res.json().catch(() => null) : null;
    // A API do Commons responde 200 com {"error": …} quando está sobrecarregada
    // (cirrussearch-too-busy, maxlag); o Flickr, com stat "fail". Isso não é
    // "nenhum resultado": nunca vai para o cache e a consulta é repetida.
    const apiError = json?.error?.code ?? (json?.stat === "fail" ? json.message : null);
    if (json && !apiError) {
      await fs.mkdir(CACHE, { recursive: true });
      await fs.writeFile(file, JSON.stringify(json));
      // A busca por texto do Commons (CirrusSearch) é a que sobrecarrega; as demais podem ser mais rápidas.
      await sleep(url.includes("list=search") ? 900 : 250);
      return json;
    }
    await sleep(res?.status === 429 ? 20000 * (attempt + 1) : /busy|maxlag/.test(apiError ?? "") ? 8000 : 3000 * (attempt + 1));
  }
  // Falha persistente: segue adiante, mas o alvo fica marcado como busca incompleta.
  failures++;
  return {};
}
const commons = (params) => getJson(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ format: "json", formatversion: "2", maxlag: "5", ...params })}`);

async function parkShape(slug) {
  const { geometry } = JSON.parse(await fs.readFile(path.join(ROOT, "public/geo/br/parks", `${slug}.json`), "utf8"));
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const inRing = (ring, x, y) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  return (x, y) => polygons.some(([outer, ...holes]) => inRing(outer, x, y) && !holes.some((h) => inRing(h, x, y)));
}

/** Fotos com coordenadas dentro do parque: grade de buscas de raio 10 km sobre o polígono. */
async function geoFiles(park, inside) {
  const [w, s, e, n] = park.bbox;
  const area = (e - w) * (n - s);
  // Maravilhas dependem mais de texto e Wikidata: menos pontos de busca por coordenada.
  const target = Math.max(0.16, Math.sqrt(area / (mode === "wonders" ? 16 : 36)));
  // Pelo menos um ponto por eixo: parques mais estreitos que o passo ficavam sem nenhuma busca.
  const nx = Math.max(1, Math.round((e - w) / target)), ny = Math.max(1, Math.round((n - s) / target));
  const stepX = (e - w) / nx, stepY = (n - s) / ny, step = Math.max(stepX, stepY);
  const found = new Map();
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x = w + stepX * (i + 0.5), y = s + stepY * (j + 0.5);
      // Só consulta pontos cujo raio toca o parque (aproximação pelo centro e cantos).
      const probe = [[x, y], [x - step / 2, y - step / 2], [x + step / 2, y + step / 2], [x - step / 2, y + step / 2], [x + step / 2, y - step / 2]];
      if (!probe.some(([px, py]) => inside(px, py))) continue;
      const r = await commons({ action: "query", list: "geosearch", gsnamespace: "6", gscoord: `${y}|${x}`, gsradius: "10000", gslimit: "500" });
      for (const g of r.query?.geosearch ?? []) if (inside(g.lon, g.lat)) found.set(g.title, [g.lon, g.lat]);
    }
  }
  return found;
}

async function searchFiles(query, limit = 40) {
  const r = await commons({ action: "query", list: "search", srnamespace: "6", srsearch: `${query} filetype:bitmap`, srlimit: String(limit) });
  return (r.query?.search ?? []).map((s) => s.title);
}

async function categoryFiles(query, keywords) {
  const r = await commons({ action: "query", list: "search", srnamespace: "14", srsearch: query, srlimit: "8" });
  const cats = (r.query?.search ?? []).map((s) => s.title).filter((t) => keywords.some((k) => fold(t).includes(k))).slice(0, 3);
  const files = [];
  for (const cat of cats) {
    const m = await commons({ action: "query", list: "categorymembers", cmtitle: cat, cmtype: "file", cmlimit: "100" });
    for (const f of m.query?.categorymembers ?? []) files.push([f.title, cat]);
  }
  return files;
}

/** Itens do Wikidata com o nome do atrativo, coordenada perto do parque e foto. */
/**
 * Itens do Wikidata com coordenada dentro do parque e foto (P18) ou categoria
 * (P373), por SPARQL (uma consulta por parque, sem o mecanismo de busca por
 * nome, que costuma responder "ocupado"). O nome do item é comparado com o do
 * atrativo localmente; a coordenada do item é a prova de lugar.
 */
const parkItems = new Map();
async function wikidataParkItems(park, inside) {
  if (parkItems.has(park.slug)) return parkItems.get(park.slug);
  const [w, s, e, n] = park.bbox;
  const sparql = `SELECT ?item ?itemLabel ?coord ?img ?cat WHERE {
    SERVICE wikibase:box { ?item wdt:P625 ?coord .
      bd:serviceParam wikibase:cornerSouthWest "Point(${w} ${s})"^^geo:wktLiteral .
      bd:serviceParam wikibase:cornerNorthEast "Point(${e} ${n})"^^geo:wktLiteral . }
    OPTIONAL { ?item wdt:P18 ?img } OPTIONAL { ?item wdt:P373 ?cat }
    FILTER(BOUND(?img) || BOUND(?cat))
    SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". } } LIMIT 3000`;
  const r = await getJson(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`);
  const items = new Map();
  for (const b of r.results?.bindings ?? []) {
    const [x, y] = (/Point\(([-0-9.]+) ([-0-9.]+)\)/.exec(b.coord?.value ?? "") ?? []).slice(1).map(Number);
    if (!Number.isFinite(x) || !inside(x, y)) continue;
    const id = b.item.value.split("/").pop();
    const entry = items.get(id) ?? { id, label: b.itemLabel?.value ?? id, images: new Set(), cat: null };
    if (b.img) entry.images.add(decodeURIComponent(b.img.value.split("/").pop()).replace(/_/g, " "));
    if (b.cat) entry.cat = b.cat.value;
    items.set(id, entry);
  }
  parkItems.set(park.slug, [...items.values()]);
  return parkItems.get(park.slug);
}

async function wikidataFiles(keywords, park, inside) {
  const out = [];
  for (const item of await wikidataParkItems(park, inside)) {
    if (!keywords.length || !keywords.some((k) => fold(item.label).includes(k))) continue;
    for (const img of item.images) out.push({ title: `File:${img}`, evidence: `Wikidata ${item.id} (${item.label}) com coordenada no parque` });
    if (item.cat) {
      const m = await commons({ action: "query", list: "categorymembers", cmtitle: `Category:${item.cat}`, cmtype: "file", cmlimit: "60" });
      for (const f of m.query?.categorymembers ?? []) out.push({ title: f.title, evidence: `categoria do item Wikidata ${item.id} (${item.cat})` });
    }
  }
  return out;
}

/*
 * Flickr (opcional): exige FLICKR_API_KEY, lida de .env.local com
 *   node --env-file=.env.local scripts/find-photo-candidates.mjs …
 * As licenças vêm da própria API; ND e "todos os direitos reservados" ficam de fora.
 */
const FLICKR_KEY = process.env.FLICKR_API_KEY;
const flickr = (params) => getJson(`https://api.flickr.com/services/rest/?${new URLSearchParams({ api_key: FLICKR_KEY, format: "json", nojsoncallback: "1", ...params })}`);
let flickrLicenses;
async function flickrLicenseMap() {
  if (flickrLicenses) return flickrLicenses;
  const r = await flickr({ method: "flickr.photos.licenses.getInfo" });
  flickrLicenses = new Map();
  for (const l of r.licenses?.license ?? []) {
    const cc = /creativecommons\.org\/licenses\/([a-z-]+)\/([0-9.]+)/.exec(l.url ?? "");
    if (cc && !cc[1].includes("nd")) flickrLicenses.set(String(l.id), { name: `CC ${cc[1].toUpperCase()} ${cc[2]}`, url: l.url });
    else if (/publicdomain\/zero/.test(l.url ?? "")) flickrLicenses.set(String(l.id), { name: "CC0 1.0", url: l.url });
    else if (/publicdomain\/mark/.test(l.url ?? "")) flickrLicenses.set(String(l.id), { name: "Public domain", url: l.url });
  }
  return flickrLicenses;
}

async function flickrCandidates(t, park, inside, keywords) {
  const licenses = await flickrLicenseMap();
  const common = {
    method: "flickr.photos.search", license: [...licenses.keys()].join(","), content_type: "1", media: "photos", per_page: "100",
    extras: "license,owner_name,geo,url_z,url_l,url_h,url_k,description,tags,date_taken",
  };
  const searches = mode === "wonders"
    ? [[{ text: `${t.title} ${park.shortName}`, sort: "relevance" }, "Flickr: busca atrativo + parque"],
       [{ text: t.title, bbox: park.bbox.join(","), sort: "relevance" }, "Flickr: busca com GPS na área do parque"]]
    : [[{ text: park.shortName, sort: "relevance" }, "Flickr: busca pelo parque"],
       [{ bbox: park.bbox.join(","), sort: "interestingness-desc", accuracy: "11" }, "Flickr: GPS na área do parque"]];
  const seen = new Map();
  for (const [params, why] of searches) {
    const r = await flickr({ ...common, ...params });
    for (const p of r.photos?.photo ?? []) if (!seen.has(p.id)) seen.set(p.id, { p, why });
  }
  const out = [];
  for (const { p, why } of seen.values()) {
    const license = licenses.get(String(p.license));
    const width = Number(p.width_k ?? p.width_h ?? p.width_l ?? 0), height = Number(p.height_k ?? p.height_h ?? p.height_l ?? 0);
    const text = fold(`${p.title} ${p.description?._content ?? ""} ${p.tags ?? ""}`);
    if (!license || width < 1200 || NOT_PHOTO.test(text) || PEOPLE.test(text)) continue;
    const point = Number(p.latitude) || Number(p.longitude) ? [Number(p.longitude), Number(p.latitude)] : null;
    const inPark = !!point && inside(point[0], point[1]);
    const hits = keywords.filter((k) => text.includes(k));
    const evidence = [why];
    if (inPark) evidence.push(`GPS da foto dentro do parque (precisão ${p.accuracy})`);
    if (hits.length) evidence.push(`menciona: ${hits.join(", ")}`);
    if (mode === "wonders" && !hits.length && !inPark) continue;
    if (mode === "covers" && !inPark && !text.includes(fold(park.shortName))) continue;
    out.push({
      title: `Flickr: ${p.title}`, provider: "flickr", thumb: p.url_z ?? p.url_l, src: p.url_k ?? p.url_h ?? p.url_l,
      width, height, license: license.name, licenseUrl: license.url, author: p.ownername,
      description: strip(p.description?._content).slice(0, 220), sourceUrl: `https://www.flickr.com/photos/${p.owner}/${p.id}`,
      point, inPark, evidence, score: (inPark ? 3 : 0) + hits.length * 2 + (width >= 2000 ? 1 : 0) + (width / height >= 1.25 ? 1 : 0),
    });
  }
  return out;
}

async function imageInfo(titles) {
  const info = new Map();
  for (let i = 0; i < titles.length; i += 40) {
    const r = await commons({
      action: "query", titles: titles.slice(i, i + 40).join("|"), prop: "imageinfo|coordinates",
      iiprop: "url|size|mime|extmetadata", iiurlwidth: "480", iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|ImageDescription|Categories|DateTimeOriginal",
    });
    for (const p of r.query?.pages ?? []) if (p.imageinfo?.[0]) info.set(p.title, { ii: p.imageinfo[0], coord: p.coordinates?.[0] });
  }
  return info;
}

const parks = JSON.parse(await fs.readFile(path.join(ROOT, "data/br/parks.generated.json"), "utf8"));
const media = JSON.parse(await fs.readFile(path.join(ROOT, "data/br/park-media.generated.json"), "utf8"));
const targets = [];
for (const park of parks) {
  if (only.length && !only.includes(park.slug)) continue;
  const guide = JSON.parse(await fs.readFile(path.join(ROOT, "data/br/parks", park.slug, "guide.json"), "utf8"));
  if (mode === "wonders") guide.wonders.forEach((w, index) => !w.photo && targets.push({ park, index, title: w.title }));
  else if ((media[park.slug]?.photos ?? []).length < 3 || only.length) targets.push({ park, title: park.name });
}

const results = [];
for (const t of targets) {
  const { park } = t;
  const failedBefore = failures;
  const inside = await parkShape(park.slug);
  const keywords = fold(t.title).split(/[^a-z0-9]+/).filter((k) => k.length > 2 && !STOP.has(k));
  const evidence = new Map();
  const add = (title, why) => evidence.set(title, [...(evidence.get(title) ?? []), why]);
  if (mode === "wonders") {
    // Uma só busca por texto no Commons (a que costuma responder "ocupado"); as categorias
    // do atrativo chegam pelo item do Wikidata (P373), com coordenada no parque.
    for (const f of await searchFiles(`"${t.title}" ${park.shortName}`)) add(f, "busca: atrativo + parque");
    for (const { title, evidence: why } of await wikidataFiles(keywords, park, inside)) add(title, why);
  } else {
    for (const f of await searchFiles(`"${park.name}"`, 50)) add(f, "busca: nome do parque");
    for (const [f, cat] of await categoryFiles(park.name, [fold(park.shortName).split(" ").pop()])) add(f, `categoria ${cat}`);
    // Itens do Wikidata com coordenada no parque (cachoeiras, serras, rios) e foto própria.
    for (const item of await wikidataParkItems(park, inside)) for (const img of item.images) add(`File:${img}`, `Wikidata ${item.id} (${item.label}) com coordenada no parque`);
  }
  const geo = await geoFiles(park, inside);
  const info = await imageInfo([...new Set([...evidence.keys(), ...geo.keys()])]);
  const candidates = [];
  // Coordenada repetida em vários arquivos é genérica (o Wiki Loves Earth atribui
  // a mesma a todas as fotos de uma área protegida): não prova onde a foto foi feita.
  const pointOf = (title, coord) => geo.get(title) ?? (coord ? [coord.lon, coord.lat] : null);
  const coordCount = new Map();
  for (const [title, { coord }] of info) {
    const p = pointOf(title, coord);
    if (p) coordCount.set(p.map((v) => v.toFixed(4)).join(","), (coordCount.get(p.map((v) => v.toFixed(4)).join(",")) ?? 0) + 1);
  }
  for (const [title, { ii, coord }] of info) {
    const m = ii.extmetadata ?? {};
    const license = m.LicenseShortName?.value ?? "";
    const text = fold(`${title} ${strip(m.ImageDescription?.value)} ${m.Categories?.value ?? ""}`);
    if (!LICENSE_OK.test(license) || !/jpeg|png|webp/.test(ii.mime) || NOT_PHOTO.test(text) || NOT_EVIDENCE.test(text) || PEOPLE.test(text) || ii.width < 1200) continue;
    const point = pointOf(title, coord);
    const shared = point ? coordCount.get(point.map((v) => v.toFixed(4)).join(",")) ?? 0 : 0;
    const inPark = !!point && shared < 2 && inside(point[0], point[1]);
    const hits = keywords.filter((k) => text.includes(k));
    const why = [...(evidence.get(title) ?? [])];
    if (inPark) why.push("coordenada dentro do parque");
    else if (shared >= 2) why.push(`coordenada genérica (igual em ${shared} arquivos)`);
    if (hits.length) why.push(`menciona: ${hits.join(", ")}`);
    // Para maravilhas, exige ligação com o atrativo ou, nas genéricas, foto dentro do parque.
    if (mode === "wonders" && !hits.length && !inPark && !why.some((w) => w.startsWith("Wikidata") || w.startsWith("categoria do item"))) continue;
    if (mode === "covers" && !inPark && !text.includes(fold(park.shortName)) && !why.some((w) => w.startsWith("Wikidata"))) continue;
    const score = (inPark ? 3 : 0) + hits.length * 2 + (why.some((w) => /Wikidata|categoria/.test(w)) ? 2 : 0) +
      (ii.width >= 3000 ? 1 : 0) + (ii.width / ii.height >= 1.25 ? 1 : 0);
    candidates.push({
      title, thumb: ii.thumburl, width: ii.width, height: ii.height, license, licenseUrl: m.LicenseUrl?.value ?? null,
      author: strip(m.Artist?.value).slice(0, 90), description: strip(m.ImageDescription?.value).slice(0, 220),
      sourceUrl: ii.descriptionurl, point, inPark, evidence: why, score,
    });
  }
  if (FLICKR_KEY) candidates.push(...await flickrCandidates(t, park, inside, keywords));
  candidates.sort((a, b) => b.score - a.score || b.width - a.width);
  results.push({ slug: park.slug, park: park.name, index: t.index ?? null, title: t.title, incomplete: failures > failedBefore, candidates: candidates.slice(0, mode === "covers" ? 16 : 10) });
  await writeOutputs();
  console.log(`${park.slug} · ${t.title}: ${candidates.length} candidatas (${geo.size} fotos com coordenada no parque)${failures > failedBefore ? ` · BUSCA INCOMPLETA: ${failures - failedBefore} consultas falharam` : ""}`);
}

await writeOutputs();
console.log(`Folhas de contato em ${outDir}`);

/** Grava JSON e folhas de contato; chamado a cada alvo para permitir revisão durante a busca. */
async function writeOutputs() {
await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, `${mode}.json`), JSON.stringify(results, null, 1));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const sheet = (items, offset) => `<!doctype html><meta charset="utf-8"><style>
body{font:12px system-ui;margin:8px;background:#fff}h2{font-size:15px;margin:14px 0 4px}
.g{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}.c{border:1px solid #ccc;padding:3px}
.c img{width:100%;height:170px;object-fit:contain;background:#eee}.k{font-weight:700;font-size:14px}.p{color:#060}</style>
${items.map((r, ri) => `<h2>${offset + ri} · ${esc(r.slug)} · ${esc(r.title)} (${r.candidates.length})</h2><div class="g">${r.candidates.map((c, ci) =>
  `<div class="c"><img src="${esc(c.thumb)}"><div class="k">${offset + ri}.${ci} ${c.width}×${c.height} ${esc(c.license)}</div>
  <div class="${c.inPark ? "p" : ""}">${esc(c.evidence.join(" · ").slice(0, 120))}</div><div>${esc(c.title.slice(5, 70))}</div></div>`).join("")}</div>`).join("")}`;
for (let i = 0; i < results.length; i += 4) {
  await fs.writeFile(path.join(outDir, `${mode}-${String(i / 4).padStart(2, "0")}.html`), sheet(results.slice(i, i + 4), i));
}
}
