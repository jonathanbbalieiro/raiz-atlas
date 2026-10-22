/**
 * Fotos de capa para parques que não têm nenhuma em park-media.generated.json.
 * Só usa arquivos da árvore de categorias do próprio parque no Commons (prova
 * de lugar), com licença livre (CC0, PD, CC BY, CC BY-SA) e ≥ 1200 px, sem
 * mapas, logotipos, documentos nem retratos de pessoas.
 *
 *   node scripts/fill-park-photos.mjs                (lista candidatas)
 *   node scripts/fill-park-photos.mjs --apply        (grava até 3 por parque)
 *   node scripts/fill-park-photos.mjs --apply slug…  (só estes parques)
 *
 * Revise a lista antes de usar --apply: o filtro por palavras não substitui o olhar humano.
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE = path.join(ROOT, ".geo-cache", "photos");
const UA = { "User-Agent": "raiz-atlas/1.1 (fotos de capa com prova de lugar)" };
const OK = /^(CC0|Public domain|CC BY(-SA)? [0-9.]+( [a-z]{2})?)$/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (h = "") => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const norm = (s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const BAD = /\b(map|mapa|logo|brasao|placa|sinal|carta|croqui|plano|pdf|cartilha|folder|crian|menina|menino|cacique|retrato|portrait|pessoa|equipe|reuniao|oficina|curso|aviso|fachada|sede|escudo|bandeira|flag|diagrama)\b/;
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
  throw new Error("Commons limitando requisições; rode de novo mais tarde.");
}

async function category(name) {
  const r = await api({ action: "query", list: "search", srnamespace: "14", srlimit: "8", srsearch: name });
  const names = (r.query?.search ?? []).map((h) => h.title);
  return names.find((n) => norm(n) === norm(`Category:${name}`)) ?? names.find((n) => norm(n).includes(norm(name.replace(/^Parque Nacional (d[aeo]s? )?/i, "")))) ?? null;
}
async function crawl(cat) {
  const files = new Set(), seen = new Set();
  let level = [cat];
  for (let d = 0; d < 2 && level.length; d++) {
    const next = [];
    for (const c of level) {
      if (seen.has(c) || seen.size >= 80 || files.size >= 1200) continue;
      seen.add(c);
      let cont;
      do {
        const r = await api({ action: "query", list: "categorymembers", cmtitle: c, cmlimit: "500", cmtype: "file|subcat", ...(cont ? { cmcontinue: cont } : {}) });
        for (const m of r.query?.categorymembers ?? []) (m.ns === 14 ? next : { push: (t) => files.add(t) }).push(m.title);
        cont = r.continue?.cmcontinue;
      } while (cont && files.size < 1200);
    }
    level = next;
  }
  return [...files];
}
async function info(titles) {
  const out = [];
  for (let i = 0; i < titles.length; i += 25) {
    const r = await api({ action: "query", prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiurlwidth: "1280", titles: titles.slice(i, i + 25).join("|") });
    for (const p of r.query?.pages ?? []) {
      const ii = p.imageinfo?.[0];
      if (!ii?.thumburl) continue;
      const m = ii.extmetadata ?? {};
      const license = m.LicenseShortName?.value ?? "";
      if (!OK.test(license) || !/jpeg|png|webp/.test(ii.mime ?? "") || ii.width < 1200) continue;
      const text = norm(`${p.title} ${strip(m.ImageDescription?.value)}`);
      if (BAD.test(text)) continue;
      out.push({
        title: p.title, area: ii.width * ii.height,
        photo: {
          src: ii.thumburl.split("?")[0],
          alt: "",
          author: strip(m.Artist?.value).slice(0, 80) || "Autor desconhecido",
          license, licenseUrl: m.LicenseUrl?.value ?? "https://commons.wikimedia.org/wiki/Commons:Public_domain",
          sourceUrl: ii.descriptionurl, width: ii.thumbwidth, height: ii.thumbheight,
        },
      });
    }
  }
  return out;
}

const mediaFile = path.join(ROOT, "data", "br", "park-media.generated.json");
const media = JSON.parse(await fs.readFile(mediaFile, "utf8"));
const parks = JSON.parse(await fs.readFile(path.join(ROOT, "data", "br", "parks.generated.json"), "utf8"));
for (const p of parks) {
  if ((media[p.slug]?.photos.length ?? 0) > 0) continue;
  if (only.length && !only.includes(p.slug)) continue;
  const cat = await category(p.name);
  if (!cat) { console.log(`· ${p.slug}: sem categoria no Commons`); continue; }
  const files = (await crawl(cat)).filter((t) => /\.(jpe?g|png|webp)$/i.test(t));
  const good = (await info(files.slice(0, 150))).sort((a, b) => b.area - a.area).slice(0, 6);
  console.log(`\n## ${p.slug} (${cat}, ${files.length} arquivos)`);
  for (const g of good) console.log(`   ${g.title.replace("File:", "")} | ${g.photo.author} | ${g.photo.license}`);
  if (apply && good.length) {
    media[p.slug] = { photos: good.slice(0, 3).map((g) => ({ ...g.photo, alt: `Paisagem do ${p.name}` })), wikipediaUrl: media[p.slug]?.wikipediaUrl ?? null };
  }
}
if (apply) await fs.writeFile(mediaFile, JSON.stringify(media, null, 2) + "\n");
