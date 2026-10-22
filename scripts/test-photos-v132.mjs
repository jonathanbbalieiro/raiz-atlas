import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const data = path.join(root, "data", "br");
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const media = read("data/br/park-media.generated.json");
const parks = read("data/br/parks.generated.json");
const slugs = parks.map((p) => p.slug);
assert.equal(slugs.length, 77);
assert.equal(Object.keys(media).length, 77);

const external = new Set(["commons.wikimedia.org", "upload.wikimedia.org", "thumb.wikimedia.org", "www.gov.br", "inaturalist-open-data.s3.amazonaws.com", "static.inaturalist.org"]);
let count = 0, bio = 0, expeditionCount = 0, approved = 0, annotated = 0;
const restrictedHistorical = [];
for (const slug of slugs) {
  const list = media[slug]?.photos;
  assert(Array.isArray(list), `${slug}: galeria ausente`);
  const sources = new Set();
  for (const p of list) {
    count++;
    assert(!sources.has(p.sourceUrl), `${slug}: fotografia duplicada`);
    sources.add(p.sourceUrl);
    assert(p.alt && p.author && p.license && p.licenseUrl && p.sourceUrl, `${slug}: crédito faltando`);
    assert(external.has(new URL(p.src).hostname), `${slug}: host não permitido`);
    if (/\bNC\b|\bND\b|all rights reserved/i.test(p.license)) restrictedHistorical.push(`${slug}:${p.license}`);
    if (p.context) annotated++;
  }
  const guide = read(`data/br/parks/${slug}/guide.json`);
  for (const f of guide.flagships) {
    if (!f.photo) continue;
    assert(f.photo.author && f.photo.license && f.photo.sourceUrl, `${slug}: espécie sem crédito`);
  }
  const b = read(`data/br/parks/${slug}/biodiversity.generated.json`);
  bio += b.groups.flatMap((g) => g.species).length;
  const efile = path.join(data, "parks", slug, "expedition.json");
  if (fs.existsSync(efile)) {
    const e = JSON.parse(fs.readFileSync(efile, "utf8"));
    expeditionCount++;
    if (e.approved) approved++;
  }
}
assert.equal(expeditionCount, 75);
assert.equal(approved, 0);

for (const [slug, part] of Object.entries({
  "restinga-de-jurubatiba": "Vegeta%C3%A7%C3%A3o_de_restinga_e_lagoa_-_Jurubatiba.jpg",
  "guaricana": "Parque_Nacional_Guaricana_-_Luiz_Alves_(02).jpg",
  "virua": "Cuxi%C3%BA_%28Chiropotes_sagulatus%29",
})) {
  assert(media[slug].photos.some((p) => p.src.includes(part) || p.sourceUrl.includes(part)), `nova foto não incorporada: ${slug}`);
}
assert(!media.guaricana.photos.some((p) => p.sourceUrl.endsWith("Lar_doce_mar.jpg")), "Guaricana manteve foto substituída");
assert(["restinga-de-jurubatiba", "guaricana", "virua"].every(slug =>
  media[slug].photos.filter(p => p.sourceUrl.includes("Vegetação_de_restinga") || p.sourceUrl.includes("Guaricana_-_Luiz_Alves") || p.sourceUrl.includes("Chiropotes_sagulatus")).every(p => p.license === "CC BY-SA 4.0")
), "novas fotografias precisam ter licença livre conferida");
console.log(`OK v1.3.2: 77 parques, ${count} fotos de galeria (${annotated} com contexto), ${bio} espécies selecionadas e 75 Expedições inalteradas.`);
if (restrictedHistorical.length) console.log(`AVISO: licenças com restrições já presentes na base: ${restrictedHistorical.join(", ")}`);
