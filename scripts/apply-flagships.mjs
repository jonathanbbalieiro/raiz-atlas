/**
 * Aplica a escolha de destaques pesquisada (até 6 por parque) em guide.json.
 *
 * Entrada: JSON { "<slug>": { "flagships": [ { scientificName, name, criteria[], why, sources[{institution,title,url}] } ] } }
 *   node scripts/apply-flagships.mjs .geo-cache/flagship/out-1.json            (só valida e mostra)
 *   node scripts/apply-flagships.mjs .geo-cache/flagship/out-1.json --apply    (grava)
 *
 * Regras (docs/DESTAQUES.md): 1 a 6 por parque; ao menos um critério declarado; justificativa específica
 * (80 a 420 caracteres, sem fórmula); 2 ou mais fontes https (sem Wikipédia); sem repetir espécie no parque.
 * As fontes novas entram em guide.sources e o destaque as cita por id. A foto de um destaque que já existia
 * é preservada.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const CRITERIA = ["endemica", "ameacada_com_acao", "habitat_critico", "papel_ecologico", "icone_da_paisagem", "cultural"];
const ROOT = path.resolve(import.meta.dirname, "..");
const PARKS = path.join(ROOT, "data/br/parks");
const FORMULAIC = /^(ave|mam[ií]fero|planta|r[eé]ptil|anf[ií]bio|peixe)[^.]{0,40}(vulner[aá]vel|amea[cç]ad|em perigo)[^.]{0,40}(registrad|registros)/i;
const today = new Date().toISOString().slice(0, 10);

const input = process.argv[2];
const apply = process.argv.includes("--apply");
if (!input) throw new Error("uso: node scripts/apply-flagships.mjs <arquivo.json> [--apply]");
const data = JSON.parse(fs.readFileSync(input, "utf8"));
const key = (s) => s.trim().toLowerCase();
const errors = [];
const pending = [];

for (const [slug, entry] of Object.entries(data)) {
  const gf = path.join(PARKS, slug, "guide.json");
  if (!fs.existsSync(gf)) { errors.push(`${slug}: parque inexistente`); continue; }
  const guide = JSON.parse(fs.readFileSync(gf, "utf8"));
  const list = entry.flagships ?? [];
  const at = (f) => `${slug}/${f?.scientificName ?? "?"}`;
  if (list.length > 6) errors.push(`${slug}: mais de 6 destaques`);
  const seen = new Set();
  const previous = new Map(guide.flagships.map((f) => [key(f.scientificName), f]));
  const out = [];
  for (const f of list) {
    if (!f.scientificName || !f.name || !f.why) { errors.push(`${at(f)}: campos obrigatórios`); continue; }
    if (seen.has(key(f.scientificName))) { errors.push(`${at(f)}: repetida no parque`); continue; }
    seen.add(key(f.scientificName));
    if (!f.criteria?.length || f.criteria.some((c) => !CRITERIA.includes(c))) errors.push(`${at(f)}: critérios inválidos (${CRITERIA.join(", ")})`);
    if (f.why.length < 80 || f.why.length > 420) errors.push(`${at(f)}: justificativa com ${f.why.length} caracteres (80 a 420)`);
    if (FORMULAIC.test(f.why)) errors.push(`${at(f)}: justificativa de fórmula ("ave ameaçada registrada no parque")`);
    const sources = f.sources ?? [];
    if (sources.length < 2) errors.push(`${at(f)}: precisa de 2 ou mais fontes`);
    for (const s of sources) {
      if (!s.institution || !s.title || !s.url?.startsWith("https://")) errors.push(`${at(f)}: fonte incompleta ou sem https`);
      if (/wikip[eé]dia|wikispecies/i.test(`${s.url} ${s.institution} ${s.title}`)) errors.push(`${at(f)}: fonte Wikipédia`);
    }
    if (apply) {
      const ids = [];
      for (const s of sources) {
        let src = guide.sources.find((x) => x.url === s.url);
        if (!src) {
          src = { id: `fl-${crypto.createHash("sha1").update(s.url).digest("hex").slice(0, 8)}`, institution: s.institution, title: s.title, url: s.url, accessed: today };
          guide.sources.push(src);
        }
        ids.push(src.id);
      }
      const old = previous.get(key(f.scientificName));
      const next = { scientificName: f.scientificName, name: f.name, criteria: f.criteria, why: f.why, sourceIds: ids };
      if (old?.photo) next.photo = old.photo;
      out.push(next);
    }
  }
  if (apply) {
    guide.flagships = out;
    pending.push([gf, guide]);
  }
  console.log(`${slug}: ${list.length} destaques`);
}
if (apply && !errors.length) for (const [gf, guide] of pending) fs.writeFileSync(gf, JSON.stringify(guide, null, 2) + "\n");
if (errors.length) {
  console.error(`\n${errors.length} problema(s):\n- ${errors.join("\n- ")}`);
  process.exitCode = 1;
}
