/** Busca pontual e retomável; apenas gera candidatas, nunca aprova fotografias. */
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, '.geo-cache', 'photo-review-2026-10-29');
await fs.mkdir(output, { recursive: true });
const report = JSON.parse(await fs.readFile(path.join(root, 'docs/audits/fotos-atual/auditoria.json'), 'utf8'));
const weak = new Map();
for (const issue of report.issues) {
  if (issue.issue === 'resolucao_baixa_para_o_uso' && !/json|galeria|maravilhas/.test(issue.location)) {
    weak.set(issue.subject, (weak.get(issue.subject) ?? 0) + 1);
  }
}
const targets = [...new Set([
  ...report.issues.filter(i => i.issue === 'sem_foto' && /destaques|^plantas$/.test(i.location)).map(i => i.subject),
  ...[...weak].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name]) => name),
  'Crypturellus parvirostris',
])];
const strip = (s = '') => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const file = path.join(output, 'candidates.json');
const candidates = JSON.parse(await fs.readFile(file, 'utf8').catch(() => '{}'));
for (const name of targets) {
  if (candidates[name]) continue;
  const params = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2',
    generator: 'search', gsrnamespace: '6', gsrsearch: `"${name}" filetype:bitmap`, gsrlimit: '8',
    prop: 'imageinfo', iiprop: 'url|size|extmetadata|mime', iiurlwidth: '1280' });
  try {
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      headers: { 'User-Agent': 'RaizAtlas/1.4 (editorial photo review)' }, signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.error) throw new Error(data.error.info);
    candidates[name] = (data.query?.pages ?? []).flatMap(page => {
      const p = page.imageinfo?.[0], meta = p?.extmetadata ?? {};
      const license = meta.LicenseShortName?.value ?? '';
      if (!p || !/jpeg|png|webp/.test(p.mime) || p.width < 1280 || !/^(CC0|Public domain|CC BY(?:-SA)? [\d.]+)$/.test(license)) return [];
      return [{ title: page.title, description: strip(meta.ImageDescription?.value),
        categories: meta.Categories?.value, original: p.url, originalWidth: p.width, originalHeight: p.height,
        photo: { src: p.thumburl ?? p.url, width: p.thumbwidth ?? p.width, height: p.thumbheight ?? p.height,
          sourceUrl: p.descriptionurl, author: strip(meta.Artist?.value), license,
          licenseUrl: meta.LicenseUrl?.value ?? 'https://creativecommons.org/publicdomain/mark/1.0/' } }];
    }).sort((a, b) => Math.min(b.photo.width, b.photo.height) - Math.min(a.photo.width, a.photo.height));
    await fs.writeFile(file, JSON.stringify(candidates, null, 2) + '\n');
    console.log(`${name}: ${candidates[name].length}`);
  } catch (error) { console.log(`${name}: FALHA ${error.message}`); }
  await new Promise(resolve => setTimeout(resolve, 1000));
}
console.log(file);
