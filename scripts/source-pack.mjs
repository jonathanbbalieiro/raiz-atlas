/**
 * Pacote de fontes primárias: baixa os PDFs citados nos guias (planos de
 * manejo, decretos) e extrai o texto página a página, para que cada fato
 * possa ser conferido e citado com número de página.
 *
 *   node scripts/source-pack.mjs                 (todos os parques)
 *   node scripts/source-pack.mjs itatiaia iguacu (só estes)
 *
 * Saída (ignorada pelo git): .geo-cache/sources/<parque>/<id-da-fonte>.txt
 * Busca: node scripts/src-grep.mjs <parque> "termo" ["outro termo"...]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const PARKS = path.join(ROOT, "data", "br", "parks");
const OUT = path.join(ROOT, ".geo-cache", "sources");
const MAX_MB = 120;
const only = process.argv.slice(2);

async function download(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (raiz-atlas fontes)" }, redirect: "follow", signal: AbortSignal.timeout(300000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = new Uint8Array(await res.arrayBuffer());
      if (String.fromCharCode(...buf.slice(0, 5)) !== "%PDF-") throw new Error("não é PDF");
      if (buf.length > MAX_MB * 1048576) throw new Error("PDF grande demais");
      return buf;
    } catch (e) {
      if (i === 2) throw e;
      await new Promise((r) => setTimeout(r, 4000 * (i + 1)));
    }
  }
}

async function toText(buf) {
  const pdf = await getDocument({ data: buf, useSystemFonts: true, verbosity: 0 }).promise;
  const parts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    parts.push(`=== p.${i} ===\n` + tc.items.map((x) => x.str).join(" ").replace(/\s+/g, " "));
    page.cleanup();
  }
  return { text: parts.join("\n"), pages: pdf.numPages };
}

const report = [];
for (const slug of (await fs.readdir(PARKS)).filter((s) => !only.length || only.includes(s))) {
  const guide = JSON.parse(await fs.readFile(path.join(PARKS, slug, "guide.json"), "utf8"));
  const pdfs = guide.sources.filter((s) => /^https/.test(s.url) && (/\.pdf($|\?)/i.test(s.url) || /atolegal|anexo/.test(s.url)));
  for (const s of pdfs) {
    const dir = path.join(OUT, slug);
    const file = path.join(dir, `${s.id}.txt`);
    try {
      await fs.access(file);
      report.push(`= ${slug}/${s.id}: já extraído`);
      continue;
    } catch {}
    try {
      const { text, pages } = await toText(await download(s.url));
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(file, `# ${s.title}\n# ${s.url}\n` + text);
      const sparse = text.length / pages < 400; // PDF escaneado, sem camada de texto
      report.push(`✓ ${slug}/${s.id}: ${pages} p.${sparse ? " (POUCO TEXTO: provável digitalização)" : ""}`);
      console.log(report.at(-1));
    } catch (e) {
      report.push(`✗ ${slug}/${s.id}: ${e.message}`);
      console.log(report.at(-1));
    }
  }
}
await fs.mkdir(OUT, { recursive: true });
await fs.writeFile(path.join(OUT, "_relatorio.txt"), report.join("\n") + "\n");
console.log(`\nConcluído: ${report.filter((r) => r.startsWith("✓")).length} extraídos, ${report.filter((r) => r.startsWith("✗")).length} falhas.`);
