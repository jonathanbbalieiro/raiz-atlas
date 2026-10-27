/** Sinais de revisão editorial; não são veredictos automáticos sobre os fatos. */
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const base = path.join(root, 'data/br/parks');
const repeated = new Map(), photoTaxa = new Map(), findings = [];
for (const slug of fs.readdirSync(base).sort()) {
  const guideFile = path.join(base, slug, 'guide.json');
  if (!fs.existsSync(guideFile)) continue;
  const guide = JSON.parse(fs.readFileSync(guideFile));
  const bio = JSON.parse(fs.readFileSync(path.join(base, slug, 'biodiversity.generated.json')));
  const species = [...bio.groups.flatMap(g => g.species), ...bio.threatened];
  for (const f of guide.flagships) {
    const list = repeated.get(f.why) ?? []; list.push({ park: slug, scientificName: f.scientificName }); repeated.set(f.why, list);
    const statuses = [...new Set(species.filter(s => s.scientificName === f.scientificName && s.iucn).map(s => s.iucn))];
    if (/\bvulnerável\b/iu.test(f.why) && statuses.some(s => s !== 'VU')) findings.push({ kind: 'categoria_divergente', park: slug, scientificName: f.scientificName, text: f.why, statuses, sourceIds: f.sourceIds });
  }
  for (const s of [...species, ...guide.flagships]) {
    if (!s.photo) continue;
    const taxa = photoTaxa.get(s.photo.sourceUrl) ?? new Map();
    const parks = taxa.get(s.scientificName) ?? new Set(); parks.add(slug); taxa.set(s.scientificName, parks); photoTaxa.set(s.photo.sourceUrl, taxa);
  }
  const walk = (value, location) => {
    if (typeof value === 'string' && /\b(?:maior|único|única|mais preservado)\b/iu.test(value)) findings.push({ kind: 'comparacao_a_conferir_na_fonte', park: slug, location, text: value });
    else if (Array.isArray(value)) value.forEach((v,i)=>walk(v,`${location}[${i}]`));
    else if (value && typeof value === 'object') for(const [k,v] of Object.entries(value)) if (!['photo','sources'].includes(k)) walk(v,`${location}.${k}`);
  };
  walk(guide, 'guide');
}
for(const [text,parks] of repeated) if(parks.length>1) findings.push({kind:'justificativa_repetida_revisar_especificidade',text,parks});
const review = JSON.parse(fs.readFileSync(path.join(root,'data/br/photo-curation.json')));
for(const [sourceUrl,taxa] of photoTaxa) if(taxa.size>1) findings.push({kind:'foto_associada_a_taxa_diferentes',sourceUrl,taxa:Object.fromEntries([...taxa].map(([name,parks])=>[name,[...parks]])),curatorialRejections:review.rejected.filter(r=>r.sourceUrl===sourceUrl)});
const report={note:'Triagem local, não validação científica ou revisão integral. Comparações e repetições são sinais para leitura das fontes; rejeições fotográficas são aplicadas pela camada de curadoria.',findings};
const out=path.join(root,'docs/audits/revisao-editorial.json');fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(`${findings.length} sinais de revisão registrados em ${out}`);
