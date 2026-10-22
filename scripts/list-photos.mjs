/**
 * Lista as fotos livres da categoria do parque no Commons, com autor, licença
 * e descrição, para escolher à mão (prova de lugar = estar na categoria).
 *   node scripts/list-photos.mjs chapada-dos-veadeiros [filtro]
 * Mostra até 80 arquivos de ≥ 1200 px; "filtro" (opcional) restringe por palavra.
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE = path.join(ROOT, ".geo-cache", "photos");
const UA = { "User-Agent": "raiz-atlas/1.1 (lista de fotos por categoria)" };
const OK = /^(CC0|Public domain|CC BY(-SA)? [0-9.]+( [a-z]{2})?)$/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (h = "") => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const norm = (s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const [slug, filter] = process.argv.slice(2);

async function api(params) {
  const url = "https://commons.wikimedia.org/w/api.php?format=json&formatversion=2&" + new URLSearchParams(params);
  const file = path.join(CACHE, crypto.createHash("sha1").update(url).digest("hex") + ".json");
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch {}
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url, { headers: UA });
    const text = await res.text();
    if (res.ok && text.startsWith("{")) { await fs.mkdir(CACHE, { recursive: true }); await fs.writeFile(file, text); await sleep(450); return JSON.parse(text); }
    await sleep(5000 * (i + 1));
  }
  throw new Error("Commons limitando requisições; tente de novo mais tarde.");
}
const parks = JSON.parse(await fs.readFile(path.join(ROOT, "data", "br", "parks.generated.json"), "utf8"));
const park = parks.find((p) => p.slug === slug);
if (!park) { console.log("Parque não encontrado"); process.exit(1); }
const s = await api({ action: "query", list: "search", srnamespace: "14", srlimit: "8", srsearch: park.name });
const names = (s.query?.search ?? []).map((h) => h.title);
const cat = names.find((n) => norm(n) === norm(`Category:${park.name}`)) ?? names.find((n) => norm(n).includes(norm(park.name.replace(/^Parque Nacional (d[aeo]s? )?/i, "")))) ;
if (!cat) { console.log("Sem categoria no Commons"); process.exit(0); }
const files = new Set(), seen = new Set(); let level = [cat];
for (let d = 0; d < 2 && level.length; d++) {
  const next = [];
  for (const c of level) {
    if (seen.has(c) || seen.size >= 80 || files.size >= 1200) continue; seen.add(c);
    let cont;
    do {
      const r = await api({ action: "query", list: "categorymembers", cmtitle: c, cmlimit: "500", cmtype: "file|subcat", ...(cont ? { cmcontinue: cont } : {}) });
      for (const m of r.query?.categorymembers ?? []) (m.ns === 14 ? next : { push: (t) => files.add(t) }).push(m.title);
      cont = r.continue?.cmcontinue;
    } while (cont && files.size < 1200);
  }
  level = next;
}
const list = [...files].filter((t) => /\.(jpe?g|png|webp)$/i.test(t)).filter((t) => !filter || norm(t).includes(norm(filter)));
console.log(`${cat}: ${files.size} arquivos, ${list.length} após filtro`);
let shown = 0;
for (let i = 0; i < list.length && shown < 80; i += 25) {
  const r = await api({ action: "query", prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiurlwidth: "1280", titles: list.slice(i, i + 25).join("|") });
  for (const p of r.query?.pages ?? []) {
    const ii = p.imageinfo?.[0]; if (!ii?.thumburl) continue;
    const m = ii.extmetadata ?? {}; const lic = m.LicenseShortName?.value ?? "";
    if (!OK.test(lic) || ii.width < 1200 || !/jpeg|png|webp/.test(ii.mime ?? "")) continue;
    console.log(`• ${p.title.replace("File:", "")} | ${ii.width}px | ${strip(m.Artist?.value).slice(0, 30)} | ${lic} | ${strip(m.ImageDescription?.value).slice(0, 110)}`);
    if (++shown >= 80) break;
  }
}
