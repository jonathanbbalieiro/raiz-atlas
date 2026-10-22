/**
 * Completa a foto das espécies-símbolo de cada guia que não aparecem no
 * levantamento de biodiversidade do parque: busca a imagem do táxon no
 * Wikidata (P18, pelo nome científico) e confere autor e licença no Commons.
 * Só aceita CC0, domínio público, CC BY e CC BY-SA. Não sobrescreve `photo`.
 *
 * Uso: npm run photo:flagships
 */
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PARKS = path.join(ROOT, "data", "br", "parks");
const UA = { "User-Agent": "raiz-atlas/1.1 (fotos de espécies-símbolo)" };
import { classifyCommonsLicense } from "./commons-license.mjs";

const accepts = (license) => { const result = classifyCommonsLicense(license); return result.allowed && !result.review; };
const strip = (h = "") => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lower = (s) => s.toLowerCase();

async function json(url, init) {
  for (let i = 0; i < 5; i++) {
    const res = await fetch(url, { ...init, headers: { ...UA, ...init?.headers } });
    const text = await res.text();
    if (res.ok && /^[[{]/.test(text)) return JSON.parse(text);
    await sleep(3000 * (i + 1));
  }
  return null;
}

const guides = [];
for (const slug of await fs.readdir(PARKS)) {
  const file = path.join(PARKS, slug, "guide.json");
  let guide, bio;
  try {
    guide = JSON.parse(await fs.readFile(file, "utf8"));
    bio = JSON.parse(await fs.readFile(path.join(PARKS, slug, "biodiversity.generated.json"), "utf8"));
  } catch {
    continue;
  }
  const withPhoto = new Set(
    [...bio.groups.flatMap((g) => g.species), ...bio.threatened].filter((s) => s.photo).map((s) => lower(s.scientificName)),
  );
  const need = guide.flagships.filter((f) => !f.photo && !withPhoto.has(lower(f.scientificName)));
  if (need.length) guides.push({ slug, file, guide, need });
}
const names = [...new Set(guides.flatMap((g) => g.need.map((f) => f.scientificName)))];
console.log(`${names.length} espécies-símbolo sem foto em ${guides.length} guias`);

// Wikidata: imagem do táxon pelo nome científico (P225).
const images = new Map();
for (let i = 0; i < names.length; i += 40) {
  const batch = names.slice(i, i + 40);
  const q = `SELECT ?name ?img WHERE { VALUES ?name { ${batch.map((n) => `"${n}"`).join(" ")} } ?t wdt:P225 ?name; wdt:P18 ?img }`;
  const r = await json("https://query.wikidata.org/sparql?query=" + encodeURIComponent(q), { headers: { Accept: "application/sparql-results+json" } });
  for (const b of r?.results.bindings ?? []) {
    const list = images.get(b.name.value) ?? [];
    list.push("File:" + decodeURIComponent(b.img.value.split("/Special:FilePath/")[1]));
    images.set(b.name.value, list);
  }
  await sleep(1200);
}

// Commons: licença e autor.
const titles = [...new Set([...images.values()].flat())];
const info = new Map();
for (let i = 0; i < titles.length; i += 25) {
  const batch = titles.slice(i, i + 25);
  const r = await json(
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=1280&titles=" +
      encodeURIComponent(batch.join("|")),
  );
  const normalized = new Map((r?.query?.normalized ?? []).map((n) => [n.to, n.from]));
  for (const page of r?.query?.pages ?? []) {
    const ii = page.imageinfo?.[0];
    if (!ii) continue;
    const m = ii.extmetadata ?? {};
    const license = m.LicenseShortName?.value ?? "";
    if (!accepts(license) || !/jpeg|png|webp/.test(ii.mime ?? "") || ii.width < 600 || !ii.thumburl) continue;
    info.set(normalized.get(page.title) ?? page.title, {
      src: ii.thumburl.split("?")[0],
      author: strip(m.Artist?.value).slice(0, 80) || "Autor desconhecido",
      license,
      licenseUrl: m.LicenseUrl?.value ?? "https://commons.wikimedia.org/wiki/Commons:Public_domain",
      sourceUrl: ii.descriptionurl,
      width: ii.thumbwidth,
      height: ii.thumbheight,
    });
  }
  await sleep(1200);
}

let filled = 0, missing = [];
for (const { file, guide, slug, need } of guides) {
  for (const f of need) {
    const photo = (images.get(f.scientificName) ?? []).map((t) => info.get(t)).find(Boolean);
    if (!photo) {
      missing.push(`${slug}:${f.scientificName}`);
      continue;
    }
    f.photo = { ...photo, alt: `${f.name} (${f.scientificName})`, context: `${f.name}, ${f.scientificName}.` };
    filled++;
  }
  await fs.writeFile(file, JSON.stringify(guide, null, 2) + "\n");
}
console.log(`✓ ${filled} fotos preenchidas; ${missing.length} sem foto livre: ${missing.join(", ")}`);
