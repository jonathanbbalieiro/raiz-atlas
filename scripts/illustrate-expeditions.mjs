/**
 * Ilustra Expedições sem foto com as fotos das maravilhas do guia do mesmo
 * parque (que já têm autor, licença e prova de lugar). Regras:
 *   - só mexe em Expedições sem capa e sem imagens nos momentos;
 *   - a capa é a foto da maravilha mais citada no texto da Expedição;
 *   - cada momento recebe, no máximo, a foto da maravilha que ele mais cita;
 *   - nenhuma foto se repete na mesma Expedição; sem citação, sem foto.
 *
 *   node scripts/illustrate-expeditions.mjs            (relatório)
 *   node scripts/illustrate-expeditions.mjs --apply
 */
import fs from "node:fs/promises";
import path from "node:path";

const PARKS = path.join(path.resolve(import.meta.dirname, ".."), "data", "br", "parks");
const apply = process.argv.includes("--apply");
const norm = (s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const STOP = new Set(["de", "do", "da", "dos", "das", "e", "a", "o", "as", "os", "no", "na", "em", "um", "uma"]);
const GENERIC = new Set(["cachoeira", "serra", "rio", "pico", "morro", "gruta", "lagoa", "praia", "mirante", "vale", "parque", "ilha", "campos"]);
const keywords = (title) =>
  norm(title).split(/[^a-z0-9]+/).filter((t) => t.length > 3 && !STOP.has(t) && !GENERIC.has(t));

/** Quantas vezes o nome (palavras distintivas, ou a frase inteira) aparece no texto. */
function mentions(title, text) {
  const t = norm(text);
  const phrase = norm(title);
  let n = t.split(phrase).length - 1;
  if (n === 0) {
    const ks = keywords(title);
    // Sem a frase inteira, exige 2+ palavras distintivas (uma só, como o nome do parque, aparece em todo o texto).
    if (ks.length >= 2 && ks.every((k) => t.includes(k))) n = ks.reduce((a, k) => a + (t.split(k).length - 1), 0) / ks.length;
  }
  return n;
}

let touched = 0;
for (const slug of await fs.readdir(PARKS)) {
  const ef = path.join(PARKS, slug, "expedition.json");
  const gf = path.join(PARKS, slug, "guide.json");
  let e, g;
  try {
    e = JSON.parse(await fs.readFile(ef, "utf8"));
    g = JSON.parse(await fs.readFile(gf, "utf8"));
  } catch {
    continue;
  }
  if (e.cover || e.moments.some((m) => m.images.length)) continue;
  const wonders = g.wonders.filter((w) => w.photo);
  if (!wonders.length) {
    console.log(`· ${slug}: o guia não tem fotos de maravilhas`);
    continue;
  }
  const used = new Set();
  const take = (w, ctxPrefix = "") => {
    used.add(w.photo.sourceUrl);
    const ctx = w.photo.context || w.title;
    return { ...w.photo, context: ctxPrefix ? `${ctxPrefix}${ctx}` : ctx };
  };
  const whole = e.moments.map((m) => m.paragraphs.join(" ")).join(" ") + " " + e.introduction.join(" ");
  const ranked = wonders.map((w) => ({ w, n: mentions(w.title, whole) })).sort((a, b) => b.n - a.n);
  const placed = [];
  // momentos: foto da maravilha mais citada no momento, ainda não usada
  for (const m of e.moments) {
    const text = m.paragraphs.join(" ") + " " + m.title;
    const best = wonders
      .filter((w) => !used.has(w.photo.sourceUrl))
      .map((w) => ({ w, n: mentions(w.title, text) }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)[0];
    if (best) {
      m.images = [take(best.w)];
      placed.push(`${m.id}: ${best.w.title}`);
    }
  }
  // capa: a maravilha mais citada que ainda não foi usada; senão a primeira foto livre
  const coverPick = ranked.find((x) => !used.has(x.w.photo.sourceUrl)) ?? null;
  if (coverPick) {
    e.cover = take(coverPick.w);
    placed.unshift(`capa: ${coverPick.w.title}`);
  }
  if (placed.length) {
    e.photoStatus = "curadoria_parcial";
    touched++;
    console.log(`✓ ${slug}: ${placed.join(" | ")}`);
    if (apply) await fs.writeFile(ef, JSON.stringify(e, null, 2) + "\n");
  } else console.log(`· ${slug}: nenhuma maravilha citada no texto`);
}
console.log(`\n${touched} Expedição(ões) ilustrada(s)${apply ? "" : " (use --apply para gravar)"}`);
