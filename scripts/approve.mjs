/**
 * Aprovação editorial: só depois de uma revisão humana.
 *
 *   npm run approve -- guide chapada-dos-veadeiros iguacu     (guias específicos)
 *   npm run approve -- guide --all                            (todos os guias)
 *   npm run approve -- expedition iguacu fernando-de-noronha
 *
 * Guia aprovado: status "revisado". Expedição aprovada: approved true e status
 * "aprovado". Depois disso o build de produção passa a publicá-los.
 * Para voltar atrás, edite o arquivo e restaure "rascunho" / approved false.
 */
import fs from "node:fs";
import path from "node:path";

const PARKS = path.join(process.cwd(), "data", "br", "parks");
const [kind, ...args] = process.argv.slice(2);
if (!["guide", "expedition"].includes(kind) || !args.length) {
  console.log("Uso: npm run approve -- guide|expedition <slug...|--all>");
  process.exit(1);
}
const file = kind === "guide" ? "guide.json" : "expedition.json";
const slugs = args.includes("--all")
  ? fs.readdirSync(PARKS).filter((s) => fs.existsSync(path.join(PARKS, s, file)))
  : args;

let n = 0;
for (const slug of slugs) {
  const p = path.join(PARKS, slug, file);
  if (!fs.existsSync(p)) {
    console.error(`✗ ${slug}: sem ${file}`);
    process.exitCode = 1;
    continue;
  }
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  if (kind === "guide") j.status = "revisado";
  else Object.assign(j, { approved: true, status: "aprovado" });
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
  n++;
}
console.log(`✓ ${n} ${kind === "guide" ? "guia(s)" : "expedição(ões)"} aprovado(s). Rode npm run check:content e faça o deploy.`);
