/**
 * Pré-aquece no Wikimedia as miniaturas usadas pelo site (1920 px e 1280 px):
 * a primeira requisição de um tamanho novo gera a miniatura e pode levar 429;
 * depois de gerada, ela fica em cache e o site a serve sem falhas.
 * Sequencial, com pausa e novas tentativas; retomável (.geo-cache/thumbs-ok.json).
 * Uso: node scripts/warm-thumbs.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "data", "br");
const DONE = path.join(ROOT, ".geo-cache", "thumbs-ok.json");
const done = new Set(fs.existsSync(DONE) ? JSON.parse(fs.readFileSync(DONE, "utf8")) : []);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const urls = new Set();
const walk = (v) => {
  if (Array.isArray(v)) v.forEach(walk);
  else if (v && typeof v === "object") {
    if (typeof v.src === "string" && /wikimedia\.org\/wikipedia\/commons\/thumb\/.+\/(1920|3840)px-/.test(v.src)) urls.add(v.src);
    Object.values(v).forEach(walk);
  }
};
walk(JSON.parse(fs.readFileSync(path.join(DATA, "park-media.generated.json"), "utf8")));
for (const slug of fs.readdirSync(path.join(DATA, "parks"))) {
  for (const f of ["guide.json", "expedition.json", "lost-world.json"]) {
    const p = path.join(DATA, "parks", slug, f);
    if (fs.existsSync(p)) walk(JSON.parse(fs.readFileSync(p, "utf8")));
  }
}
const todo = [...urls].filter((u) => !done.has(u));
console.log(`${urls.size} miniaturas grandes, ${todo.length} a aquecer`);
let ok = 0, fail = 0;
for (const [i, u] of todo.entries()) {
  let good = false;
  for (let attempt = 0; attempt < 8 && !good; attempt++) {
    const res = await fetch(u, { headers: { "User-Agent": "raiz-atlas/1.3 (aquecimento de miniaturas; uso educativo)" } });
    const bytes = res.ok ? (await res.arrayBuffer()).byteLength : 0;
    if (res.ok && bytes > 5000) good = true;
    else await sleep(Math.max(Number(res.headers.get("retry-after")) * 1000 || 0, 4000 * (attempt + 1)));
  }
  if (good) { ok++; done.add(u); fs.writeFileSync(DONE, JSON.stringify([...done])); } else { fail++; console.log("falhou:", u); }
  if ((i + 1) % 25 === 0) console.log(`${i + 1}/${todo.length} (ok ${ok}, falhas ${fail})`);
  await sleep(2500);
}
console.log(`pronto: ok ${ok}, falhas ${fail}`);
