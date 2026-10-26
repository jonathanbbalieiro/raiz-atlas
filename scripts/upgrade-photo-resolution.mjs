/**
 * Sobe a resolução das fotos do Wikimedia Commons: consulta o tamanho do arquivo
 * original (API imageinfo) e reescreve `src` para a miniatura padrão mais alta
 * que o original permite (até 1920 px nas fotos de capa, maravilhas e expedições;
 * 1280 px nas espécies). Arquivos menores que o alvo passam a usar o original.
 * Também grava width/height reais e gera o relatório das fotos pequenas demais.
 *
 * Uso:  node scripts/upgrade-photo-resolution.mjs          (aplica)
 *       node scripts/upgrade-photo-resolution.mjs --dry     (só relatório)
 * Respostas ficam em .geo-cache/iminfo (reexecuções não repetem chamadas).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "data", "br");
const DRY = process.argv.includes("--dry");
const UA = { "User-Agent": "raiz-atlas/1.3 (resolucao de fotos; uso educativo)" };
// O Wikimedia só serve larguras padrão de miniatura: 20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920 e 3840.
const STEPS = [3840, 1920, 1280, 960];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CACHE = path.join(ROOT, ".geo-cache", "iminfo");
fs.mkdirSync(CACHE, { recursive: true });

/** Todos os arquivos JSON de conteúdo com fotos. */
function files() {
  const out = [path.join(DATA, "park-media.generated.json")];
  const parks = path.join(DATA, "parks");
  for (const slug of fs.readdirSync(parks)) {
    for (const f of ["guide.json", "expedition.json", "lost-world.json", "biodiversity.generated.json"]) {
      const p = path.join(parks, slug, f);
      if (fs.existsSync(p)) out.push(p);
    }
  }
  return out;
}

const isPhoto = (o) =>
  o && typeof o === "object" && typeof o.src === "string" && typeof o.sourceUrl === "string" &&
  /^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(o.src) && /commons\.wikimedia\.org\/wiki\/File:/.test(o.sourceUrl);

function* photos(v) {
  if (Array.isArray(v)) for (const x of v) yield* photos(x);
  else if (v && typeof v === "object") {
    if (isPhoto(v)) yield v;
    for (const x of Object.values(v)) yield* photos(x);
  }
}

const titleOf = (p) => decodeURIComponent(p.sourceUrl.split("/wiki/")[1]).replace(/_/g, " ");

async function imageinfo(titles) {
  const info = new Map();
  const todo = [];
  for (const t of titles) {
    const f = path.join(CACHE, crypto.createHash("sha1").update(t).digest("hex") + ".json");
    if (fs.existsSync(f)) info.set(t, JSON.parse(fs.readFileSync(f, "utf8")));
    else todo.push(t);
  }
  for (let i = 0; i < todo.length; i += 40) {
    const batch = todo.slice(i, i + 40);
    const url =
      "https://commons.wikimedia.org/w/api.php?action=query&format=json&redirects=1&prop=imageinfo&iiprop=size%7Cmime%7Curl&titles=" +
      encodeURIComponent(batch.join("|"));
    let json;
    for (let attempt = 0; attempt < 10; attempt++) {
      const res = await fetch(url, { headers: UA });
      if (res.ok) { json = await res.json(); break; }
      const wait = Number(res.headers.get("retry-after")) || 0;
      await sleep(Math.max(wait * 1000, 5000 * (attempt + 1)));
    }
    if (!json) throw new Error("imageinfo: falha repetida no lote " + i);
    const alias = new Map();
    for (const n of json.query.normalized ?? []) alias.set(n.to, n.from);
    for (const r of json.query.redirects ?? []) alias.set(r.to, alias.get(r.from) ?? r.from);
    for (const page of Object.values(json.query.pages)) {
      const ii = page.imageinfo?.[0];
      const orig = alias.get(page.title) ?? page.title;
      const rec = ii ? { w: ii.width, h: ii.height, mime: ii.mime, url: ii.url, title: page.title } : { missing: true };
      for (const key of new Set([orig, page.title, ...batch.filter((b) => b.replace(/_/g, " ") === orig)])) {
        info.set(key, rec);
        fs.writeFileSync(path.join(CACHE, crypto.createHash("sha1").update(key).digest("hex") + ".json"), JSON.stringify(rec));
      }
    }
    process.stdout.write(`  imageinfo ${Math.min(i + 40, todo.length)}/${todo.length}\r`);
    await sleep(1500);
  }
  return info;
}

/** Alvo por uso: espécies em cartões pequenos pedem menos que capas e expedições. */
const targetFor = (file) => (/biodiversity\.generated/.test(file) ? 1280 : 1920);

function thumbUrl(orig, width) {
  orig = orig.split("?")[0];
  const m = orig.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/(.+)\/([^/]+)$/);
  if (!m) return null;
  return `${m[1]}/thumb/${m[2]}/${m[3]}/${width}px-${m[3]}`;
}

const all = files();
const titles = new Set();
const perFile = new Map();
for (const f of all) {
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  const list = [...photos(j)];
  perFile.set(f, { j, list });
  for (const p of list) titles.add(titleOf(p));
}
console.log(`${titles.size} arquivos do Commons em ${all.length} JSONs`);
const info = await imageinfo([...titles]);

const stats = { changed: 0, same: 0, original: 0, missing: 0, small: [] };
for (const [f, { j, list }] of perFile) {
  let touched = false;
  const goal = targetFor(f);
  for (const p of list) {
    const rec = info.get(titleOf(p));
    if (!rec || rec.missing || !rec.w) { stats.missing++; continue; }
    if (!/^image\/(jpeg|png|webp)$/.test(rec.mime)) continue;
    const ratio = rec.h / rec.w;
    let src, w;
    if (rec.w <= STEPS.at(-1)) {
      src = rec.url.split("?")[0]; w = rec.w; stats.original++;
    } else {
      w = STEPS.find((s) => s <= Math.min(goal, rec.w)) ?? STEPS.at(-1);
      src = thumbUrl(rec.url, w);
      if (!src) continue;
    }
    if (rec.w < 1600 && !/biodiversity\.generated/.test(f)) {
      stats.small.push({ file: path.relative(ROOT, f), title: titleOf(p), w: rec.w, h: rec.h, license: p.license });
    }
    const h = Math.round(w * ratio);
    if (p.src !== src || p.width !== w || p.height !== h) {
      p.src = src; p.width = w; p.height = h; touched = true; stats.changed++;
    } else stats.same++;
  }
  if (touched && !DRY) fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n");
}
fs.writeFileSync(path.join(ROOT, ".geo-cache", "fotos-pequenas.json"), JSON.stringify(stats.small, null, 1));
console.log(`\nreescritas ${stats.changed} | já corretas ${stats.same} | originais usados ${stats.original} | sem info ${stats.missing} | originais < 1600 px (fora espécies): ${stats.small.length}${DRY ? " (dry-run)" : ""}`);
