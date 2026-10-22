/**
 * Fotos das maravilhas, com prova de lugar. Para cada maravilha sem foto em
 * guide.json, procura no Wikimedia Commons e só ACEITA sozinho quando:
 *   1. o arquivo tem licença livre (CC0, PD, CC BY, CC BY-SA) e ≥ 900 px;
 *   2. o título/descrição contém todas as palavras distintivas do nome da
 *      maravilha (ex.: "Cachoeira Encantada" exige "encantada"); e
 *   3. o arquivo pertence à árvore de categorias do parque no Commons
 *      (prova de que foi fotografado ali) ou cita o nome do parque.
 * O que não passa vira candidata para revisão humana em .geo-cache/photos/.
 *
 *   node scripts/auto-wonder-photos.mjs             (só relatório)
 *   node scripts/auto-wonder-photos.mjs --apply     (grava as aceitas)
 *   node scripts/auto-wonder-photos.mjs --apply serra-do-cipo tijuca
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PARKS = path.join(ROOT, "data", "br", "parks");
const CACHE = path.join(ROOT, ".geo-cache", "photos");
const UA = { "User-Agent": "raiz-atlas/1.1 (fotos de maravilhas com prova de lugar)" };
import { classifyCommonsLicense } from "./commons-license.mjs";

const accepts = (license) => { const result = classifyCommonsLicense(license); return result.allowed && !result.review; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (h = "") => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const norm = (s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const STOP = new Set(["de", "do", "da", "dos", "das", "e", "a", "o", "as", "os", "no", "na", "em", "para", "com", "ate", "the", "of"]);
/** Palavras que sozinhas não identificam um lugar. */
const GENERIC = new Set([
  "cachoeira", "cachoeiras", "serra", "serras", "rio", "rios", "pico", "morro", "gruta", "grutas", "lagoa", "lagoas", "praia", "praias",
  "mirante", "trilha", "trilhas", "vale", "cavernas", "caverna", "campos", "campo", "parque", "nacional", "mata", "floresta", "ilha",
  "baia", "dunas", "duna", "chapada", "chapadao", "mar", "quedas", "corredeiras", "complexo", "arvores", "aldeia", "aldeias",
]);
const keywords = (s) => tokens(s);
const tokens = (s) => norm(s).split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !STOP.has(t));

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const only = args.filter((a) => !a.startsWith("--"));

async function api(params) {
  const url = "https://commons.wikimedia.org/w/api.php?format=json&formatversion=2&" + new URLSearchParams(params);
  const file = path.join(CACHE, crypto.createHash("sha1").update(url).digest("hex") + ".json");
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {}
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url, { headers: UA });
    const text = await res.text();
    if (res.ok && text.startsWith("{")) {
      await fs.mkdir(CACHE, { recursive: true });
      await fs.writeFile(file, text);
      await sleep(500);
      return JSON.parse(text);
    }
    await sleep(5000 * (i + 1));
  }
  throw new Error("Commons limitando requisições; rode de novo mais tarde (o que já foi baixado fica em cache).");
}

/** Categoria do parque no Commons: a de nome mais próximo do nome oficial. */
async function parkCategory(parkName) {
  const r = await api({ action: "query", list: "search", srnamespace: "14", srlimit: "8", srsearch: parkName });
  const names = (r?.query?.search ?? []).map((h) => h.title);
  const exact = names.find((n) => norm(n) === norm(`Category:${parkName}`));
  return exact ?? names.find((n) => norm(n).includes(norm(parkName.replace(/^Parque Nacional (d[aeo]s? )?/i, "")))) ?? null;
}

/** Arquivos da categoria e subcategorias (profundidade 2, até 80 categorias e 1200 arquivos). */
async function crawl(category) {
  const files = new Set();
  const seen = new Set();
  let level = [category];
  for (let depth = 0; depth < 2 && level.length; depth++) {
    const next = [];
    for (const cat of level) {
      if (seen.has(cat) || seen.size >= 80 || files.size >= 1200) continue;
      seen.add(cat);
      let cont;
      do {
        const r = await api({ action: "query", list: "categorymembers", cmtitle: cat, cmlimit: "500", cmtype: "file|subcat", ...(cont ? { cmcontinue: cont } : {}) });
        for (const m of r?.query?.categorymembers ?? []) (m.ns === 14 ? next : { push: (t) => files.add(t) }).push(m.title);
        cont = r?.continue?.cmcontinue;
      } while (cont && files.size < 1200);
    }
    level = next;
  }
  return files;
}

async function info(titles) {
  const out = new Map();
  for (let i = 0; i < titles.length; i += 25) {
    const batch = titles.slice(i, i + 25);
    const r = await api({ action: "query", prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiurlwidth: "1280", titles: batch.join("|") });
    for (const page of r?.query?.pages ?? []) {
      const ii = page.imageinfo?.[0];
      if (!ii?.thumburl) continue;
      const m = ii.extmetadata ?? {};
      const license = m.LicenseShortName?.value ?? "";
      if (!accepts(license) || !/jpeg|png|webp/.test(ii.mime ?? "") || ii.width < 900) continue;
      out.set(page.title, {
        title: page.title,
        description: strip(m.ImageDescription?.value).slice(0, 220),
        photo: {
          src: ii.thumburl.split("?")[0],
          author: strip(m.Artist?.value).slice(0, 80) || "Autor desconhecido",
          license,
          licenseUrl: m.LicenseUrl?.value ?? "https://commons.wikimedia.org/wiki/Commons:Public_domain",
          sourceUrl: ii.descriptionurl,
          width: ii.thumbwidth,
          height: ii.thumbheight,
        },
      });
    }
  }
  return out;
}

const report = {};
let accepted = 0, reviewed = 0;
const slugs = (await fs.readdir(PARKS)).filter((s) => !only.length || only.includes(s));
for (const slug of slugs) {
  const file = path.join(PARKS, slug, "guide.json");
  const guide = JSON.parse(await fs.readFile(file, "utf8"));
  const missing = guide.wonders.filter((w) => !w.photo);
  if (!missing.length) continue;
  const parks = JSON.parse(await fs.readFile(path.join(ROOT, "data", "br", "parks.generated.json"), "utf8"));
  const park = parks.find((p) => p.slug === slug);
  const parkTokens = tokens(park.shortName).filter((t) => !GENERIC.has(t));
  const category = await parkCategory(park.name);
  const inTree = category ? await crawl(category) : new Set();
  const used = new Set(guide.wonders.filter((w) => w.photo).map((w) => w.photo.sourceUrl));

  report[slug] = { category, treeFiles: inTree.size, wonders: {} };
  for (const w of missing) {
    const wt = tokens(w.title);
    const distinct = wt.filter((t) => !GENERIC.has(t));
    const search = await api({ action: "query", list: "search", srnamespace: "6", srlimit: "20", srsearch: `${w.title} ${park.shortName} filetype:bitmap` });
    const treeMatches = [...inTree].filter((t) => distinct.length && distinct.every((d) => norm(t).includes(d)));
    const titles = [...new Set([...(search?.query?.search ?? []).map((h) => h.title), ...treeMatches])];
    const infos = await info(titles);
    const cands = [];
    for (const [title, c] of infos) {
      if (used.has(c.photo.sourceUrl)) continue;
      const hay = norm(`${title} ${c.description}`);
      const nameHit = distinct.length > 0 && distinct.every((d) => hay.includes(d));
      const placeHit = inTree.has(title) || parkTokens.some((t) => hay.includes(t));
      cands.push({ ...c, nameHit, placeHit, inTree: inTree.has(title) });
    }
    cands.sort((a, b) => Number(b.nameHit && b.placeHit) - Number(a.nameHit && a.placeHit) || Number(b.inTree) - Number(a.inTree));
    if (process.env.LOOSE) {
      // Modo de revisão: arquivos da categoria do parque que citam QUALQUER palavra distintiva da maravilha ou do seu texto.
      const words = [...new Set([...distinct, ...keywords(w.text ?? "").slice(0, 0)])];
      const loose = [...inTree].filter((t) => words.some((d) => norm(t).includes(d))).slice(0, 6);
      if (loose.length && !cands.some((c) => c.nameHit && c.placeHit)) console.log(`? ${slug} · ${w.title}: ${loose.map((t) => t.replace("File:", "")).join(" || ")}`);
    }
    const best = cands.find((c) => c.nameHit && c.placeHit);
    report[slug].wonders[w.title] = { auto: !!best, candidates: cands.slice(0, 4).map((c) => ({ title: c.title, desc: c.description, nameHit: c.nameHit, inTree: c.inTree })) };
    if (best) {
      accepted++;
      used.add(best.photo.sourceUrl);
      if (apply) w.photo = { ...best.photo, alt: `${w.title}, ${park.shortName}`, context: `${w.title}. ${best.description.slice(0, 120)}`.trim() };
      console.log(`✓ ${slug} · ${w.title} ← ${best.title}${best.inTree ? " [categoria do parque]" : ""}`);
    } else {
      reviewed++;
      console.log(`· ${slug} · ${w.title}: ${cands.length} candidata(s) para revisão`);
    }
  }
  if (apply) await fs.writeFile(file, JSON.stringify(guide, null, 2) + "\n");
}
await fs.mkdir(CACHE, { recursive: true });
await fs.writeFile(path.join(CACHE, "relatorio.json"), JSON.stringify(report, null, 2));
console.log(`\n${accepted} aceitas automaticamente${apply ? " e gravadas" : " (use --apply para gravar)"}; ${reviewed} para revisão (.geo-cache/photos/relatorio.json)`);
