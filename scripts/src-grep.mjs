/**
 * Busca em fontes primárias extraídas por source-pack.mjs, com número de página.
 *   node scripts/src-grep.mjs itatiaia "espécies de aves" "endêmic"
 * Mostra até 6 trechos por termo (±160 caracteres) e a página de cada um.
 */
import fs from "node:fs/promises";
import path from "node:path";

const [slug, ...terms] = process.argv.slice(2);
if (!slug || !terms.length) {
  console.log('Uso: node scripts/src-grep.mjs <parque> "termo" ["termo"...]');
  process.exit(1);
}
const dir = path.join(path.resolve(import.meta.dirname, ".."), ".geo-cache", "sources", slug);
const norm = (s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
let files;
try {
  files = (await fs.readdir(dir)).filter((f) => f.endsWith(".txt"));
} catch {
  console.log(`Sem fontes extraídas para ${slug}. Rode: node scripts/source-pack.mjs ${slug}`);
  process.exit(1);
}
for (const f of files) {
  const raw = await fs.readFile(path.join(dir, f), "utf8");
  const title = raw.split("\n")[0].replace(/^# /, "");
  const pages = raw.split(/^=== p\.(\d+) ===$/m);
  console.log(`\n##### ${f.replace(".txt", "")} · ${title}`);
  for (const term of terms) {
    const t = norm(term);
    let shown = 0;
    for (let i = 1; i < pages.length && shown < 6; i += 2) {
      const text = pages[i + 1] ?? "";
      const n = norm(text);
      let at = n.indexOf(t);
      while (at >= 0 && shown < 6) {
        console.log(`[p.${pages[i]}] «${term}»: …${text.slice(Math.max(0, at - 160), at + t.length + 160)}…`);
        shown++;
        at = n.indexOf(t, at + 400);
      }
    }
    if (!shown) console.log(`(nenhum resultado para «${term}»)`);
  }
}
