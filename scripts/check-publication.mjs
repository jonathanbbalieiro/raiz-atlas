/** Auditoria local de publicação; não acessa rede nem altera dados. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const strict = process.argv.includes('--strict');
const root = process.cwd();
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const base = path.join(root, 'data', 'br');
const parks = read('data/br/parks.generated.json');
assert.equal(parks.length, 77, 'Cadastro de parques não corresponde à base validada');
const expected = new Set(parks.map((p) => p.slug));
assert.equal(expected.size, 77, 'Slugs de parques duplicados');

const counts = { parks: parks.length, guides: 0, guidesReady: 0, expeditions: 0, expeditionsReady: 0, lostWorld: 0, lostWorldReady: 0, photosNC: 0, photoReferences: 0 };
const restricted = [];
function photos(obj, loc) {
  if (Array.isArray(obj)) return obj.forEach((x, i) => photos(x, `${loc}[${i}]`));
  if (!obj || typeof obj !== 'object') return;
  if (typeof obj.src === 'string' && typeof obj.license === 'string' && obj.sourceUrl) {
    counts.photoReferences++;
    const license = obj.license.toUpperCase();
    if (/(^|[-\s])NC(?=[-\s]|$)/.test(license)) {
      counts.photosNC++;
      restricted.push({ local: loc, licence: obj.license, file: obj.sourceUrl });
    }
    return;
  }
  for (const [k, v] of Object.entries(obj)) photos(v, `${loc}.${k}`);
}
photos(read('data/br/park-media.generated.json'), 'park-media.generated.json');
for (const slug of expected) {
  const dir = path.join(base, 'parks', slug);
  assert(fs.existsSync(dir), `Diretório ausente: ${slug}`);
  for (const [filename, field, ready, test] of [
    ['guide.json', 'guides', 'guidesReady', (x) => x.status === 'revisado'],
    ['expedition.json', 'expeditions', 'expeditionsReady', (x) => x.approved === true],
    ['lost-world.json', 'lostWorld', 'lostWorldReady', (x) => x.status === 'revisado'],
  ]) {
    const file = path.join(dir, filename);
    if (!fs.existsSync(file)) continue;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    counts[field]++;
    if (test(data)) counts[ready]++;
    photos(data, `parks/${slug}/${filename}`);
  }
  const bio = path.join(dir, 'biodiversity.generated.json');
  assert(fs.existsSync(bio), `Biodiversidade ausente: ${slug}`);
  photos(JSON.parse(fs.readFileSync(bio, 'utf8')), `parks/${slug}/biodiversity.generated.json`);
}

const raw = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
let validUrl = false;
try {
  const parsed = new URL(raw);
  validUrl = parsed.protocol === 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1' && parsed.pathname === '/' && parsed.hostname !== 'seu-dominio.com.br' && !parsed.username && !parsed.password && !parsed.search && !parsed.hash;
} catch {}
if (!validUrl) {
  const msg = 'Defina NEXT_PUBLIC_SITE_URL para o endereço HTTPS público (sem barra final), como https://meusite.com.br';
  if (strict || process.env.VERCEL_ENV === 'production') throw new Error(msg);
  console.warn(`AVISO: ${msg}`);
}
const preview = process.env.RAIZ_PREVIEW_DRAFTS === '1';
if (preview) console.warn('AVISO: RAIZ_PREVIEW_DRAFTS=1 publica páginas de revisão. Proteja o acesso na hospedagem; robots.txt não é autenticação.');
console.log(`Publicação — ${counts.parks} parques; ${counts.guidesReady}/${counts.guides} guias liberados; ${counts.expeditionsReady}/${counts.expeditions} Expedições liberadas; ${counts.lostWorldReady}/${counts.lostWorld} Mundo Perdido liberados.`);
console.log(`Fotografias: ${counts.photoReferences} referências auditadas; ${counts.photosNC} referências CC BY-NC: exigem respeitar a restrição de uso não comercial; esta auditoria não remove imagens.`);
if (counts.expeditionsReady === 0) console.warn('AVISO: nenhuma Expedição aprovada será publicada no modo público. Os arquivos estão preservados para revisão.');
if (counts.guidesReady === 0) console.warn('AVISO: guias em rascunho não aparecerão no modo público; fichas oficiais e biodiversidade continuam disponíveis.');
if (strict) {
  assert.equal(preview, false, 'Verificação pública não aceita RAIZ_PREVIEW_DRAFTS=1');
  console.log('✓ Verificação estrita de publicação passou.');
}
