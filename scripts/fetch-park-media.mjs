/**
 * Associa a cada parque fotos do Wikimedia Commons (via Wikidata, P18) e o
 * link da Wikipédia em português. Só entram fotos com licença compatível com
 * uso comercial (CC0, domínio público, CC BY, CC BY-SA); autor e licença vão
 * junto para o crédito exibido no site.
 *
 *   data/<país>/park-media.generated.json
 *
 * Uso: npm run media   (depois de npm run geo)
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.resolve(import.meta.dirname, "..");
const UA = { "User-Agent": "maravilhas-naturais/0.1 (pipeline de mídia)" };
const COMMERCIAL_OK = /^(CC0|Public domain|CC BY(-SA)? [0-9.]+( [a-z]{2})?)$/i;
const MAX_PHOTOS = 4;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (h = "") => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/^parque nacional\s+(marinho\s+|e historico\s+)?((da|do|de|das|dos)\s+)?/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** GET com cache em .geo-cache/media (reexecuções não repetem chamadas) e espera progressiva. */
async function getJson(url, init) {
  const file = path.join(ROOT, ".geo-cache", "media", crypto.createHash("sha1").update(url).digest("hex") + ".json");
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {}
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { ...init, headers: { ...UA, ...init?.headers } });
    const text = await res.text();
    if (res.ok && text.startsWith("{")) {
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, text);
      return JSON.parse(text);
    }
    await sleep(5000 * (attempt + 1)); // limite de requisições: espera e tenta de novo
  }
  throw new Error(`Falha ao buscar ${url}`);
}

const countryArg = process.argv[2] ?? "br";
const parks = JSON.parse(await fs.readFile(path.join(ROOT, "data", countryArg, "parks.generated.json"), "utf8"));

// 1. Wikidata: imagens (P18) e artigo da Wikipédia em português, numa consulta só.
const sparql = `SELECT ?item ?label ?image ?ptwiki WHERE {
  ?item wdt:P31/wdt:P279* wd:Q46169; wdt:P17 wd:Q155; rdfs:label ?label FILTER(lang(?label)="pt").
  OPTIONAL { ?item wdt:P18 ?image }
  OPTIONAL { ?ptwiki schema:about ?item; schema:isPartOf <https://pt.wikipedia.org/> }
}`;
const wd = await getJson(
  "https://query.wikidata.org/sparql?query=" + encodeURIComponent(sparql),
  { headers: { Accept: "application/sparql-results+json" } },
);
const byKey = new Map();
for (const b of wd.results.bindings) {
  const k = norm(b.label.value);
  const e = byKey.get(k) ?? { images: new Set(), ptwiki: null };
  if (b.image) e.images.add("File:" + decodeURIComponent(b.image.value.split("/Special:FilePath/")[1]));
  if (b.ptwiki) e.ptwiki = b.ptwiki.value;
  byKey.set(k, e);
}

// 2. Para parques sem imagem no Wikidata, busca no Commons pelo nome.
const wanted = new Map(); // slug -> títulos de arquivo
for (const p of parks) {
  const e = byKey.get(norm(p.name)) ?? byKey.get(norm(p.shortName));
  const titles = [...(e?.images ?? [])];
  if (titles.length < 2) {
    const q = `"${p.name}" filetype:bitmap`;
    const r = await getJson(
      "https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srnamespace=6&srlimit=6&srsearch=" +
        encodeURIComponent(q),
    );
    for (const hit of r.query?.search ?? []) if (!titles.includes(hit.title)) titles.push(hit.title);
    await sleep(1500);
  }
  wanted.set(p.slug, { titles: titles.slice(0, 8), ptwiki: e?.ptwiki ?? null });
}

// 3. Licença e autor de cada arquivo, em lotes de 50 títulos.
const allTitles = [...new Set([...wanted.values()].flatMap((w) => w.titles))];
const info = new Map();
for (let i = 0; i < allTitles.length; i += 50) {
  const batch = allTitles.slice(i, i + 50);
  const r = await getJson(
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo" +
      "&iiprop=url|extmetadata|size|mime&iiurlwidth=1280&titles=" +
      encodeURIComponent(batch.join("|")),
  );
  const normalized = new Map((r.query.normalized ?? []).map((n) => [n.to, n.from]));
  for (const page of r.query.pages ?? []) {
    const ii = page.imageinfo?.[0];
    if (!ii) continue;
    info.set(normalized.get(page.title) ?? page.title, { page: page.title, ii });
  }
  await sleep(1500);
}

const out = {};
let withPhoto = 0;
for (const p of parks) {
  const w = wanted.get(p.slug);
  const photos = [];
  for (const t of w.titles) {
    const hit = info.get(t);
    if (!hit) continue;
    const { ii, page } = hit;
    const m = ii.extmetadata ?? {};
    const lic = m.LicenseShortName?.value ?? "";
    if (!COMMERCIAL_OK.test(lic) || !/jpeg|png|webp/.test(ii.mime ?? "")) continue;
    if (ii.width < 900) continue; // pequenas demais para a capa
    // Evita mapas/logos e fotos do lado de outro país (ex.: Iguaçu na Argentina).
    const text = `${page} ${strip(m.ImageDescription?.value)}`;
    if (/\b(map|mapa|logo|location|localiza\w*|argentin\w*|paraguay|venezuel\w*|guyana|bolivia|peru)\b/i.test(text)) continue;
    photos.push({
      src: ii.thumburl.split("?")[0],
      // Texto alternativo uniforme em português (as descrições do Commons vêm em várias línguas).
      alt: `Paisagem do ${p.name}`,
      author: strip(m.Artist?.value).slice(0, 80) || "Autor desconhecido",
      license: lic,
      licenseUrl: m.LicenseUrl?.value ?? "https://commons.wikimedia.org/wiki/Commons:Public_domain",
      sourceUrl: ii.descriptionurl,
      width: ii.thumbwidth,
      height: ii.thumbheight,
    });
    if (photos.length >= MAX_PHOTOS) break;
  }
  if (photos.length) withPhoto++;
  out[p.slug] = { photos, wikipediaUrl: w.ptwiki };
}

const file = path.join(ROOT, "data", countryArg, "park-media.generated.json");
await fs.writeFile(file, JSON.stringify(out, null, 2) + "\n");
console.log(`✓ ${path.relative(ROOT, file)}: ${withPhoto}/${parks.length} parques com foto`);
