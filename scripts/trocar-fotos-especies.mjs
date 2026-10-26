/**
 * Refaz a troca das fotos de espécies que apareciam com a cabeça cortada ou baixa qualidade
 * (rodada de 23/10/2026). Precisa de internet: consulta o iNaturalist para obter autor e licença
 * de cada foto e grava em biodiversity.generated.json e, quando indicado, nos flagships do guide.json.
 *
 *   node scripts/trocar-fotos-especies.mjs          (na raiz do projeto)
 *   node scripts/trocar-fotos-especies.mjs --dry    (só mostra o que mudaria)
 *
 * Depois: node scripts/check-content.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DRY = process.argv.includes("--dry");
const ROOT = path.resolve(process.cwd(), "data/br/parks");
const UA = { "User-Agent": "raiz-atlas/1.1 (ferramenta editorial de fotos)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LIC = {
  cc0: ["CC0", "https://creativecommons.org/publicdomain/zero/1.0/"],
  "cc-by": ["CC BY 4.0", "https://creativecommons.org/licenses/by/4.0"],
  "cc-by-sa": ["CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0"],
  "cc-by-nc": ["CC BY-NC 4.0", "https://creativecommons.org/licenses/by-nc/4.0"],
  "cc-by-nc-sa": ["CC BY-NC-SA 4.0", "https://creativecommons.org/licenses/by-nc-sa/4.0"],
};

// [nome científico, id da foto no iNaturalist, alt, parques ("all" = todos), contexto do guia (opcional)]
const TROCAS = [
  ["Guaruba guarouba", 706177489, "Ararajuba (Guaruba guarouba)", "amazonia,jamanxim", "Ararajubas fotografadas em liberdade em Itaituba (PA), no oeste paraense onde a espécie ainda ocorre."],
  ["Mico leucippe", 550967284, "Sagui-branco-de-orelhas-nuas (Mico leucippe)", "jamanxim", "Sagui-branco (Mico leucippe) fotografado em liberdade no oeste do Pará, onde a espécie ocorre."],
  ["Anodorhynchus hyacinthinus", 217287300, "Arara-azul-grande (Anodorhynchus hyacinthinus)", "chapada-dos-guimaraes,jamanxim,nascentes-do-rio-parnaiba,pantanal-mato-grossense,serra-da-bodoquena", "Arara-azul-grande (Anodorhynchus hyacinthinus), maior psitacídeo do mundo, fotografada em liberdade no Mato Grosso do Sul."],
  ["Dasypus novemcinctus", 741309235, "Tatu-galinha (Dasypus novemcinctus)", "all"],
  ["Ardea cocoi", 611522976, "Garça-moura (Ardea cocoi)", "all"],
  ["Micrablepharus atticolus", 611896010, "Lagarto-de-rabo-azul (Micrablepharus atticolus)", "all"],
  ["Puma concolor", 117547492, "Suçuarana (Puma concolor)", "all"],
  ["Leopardus guttulus", 739441795, "Gato-do-mato-pequeno (Leopardus guttulus)", "all"],
  ["Leopardus tigrinus", 325646848, "Gato-do-mato-pequeno (Leopardus tigrinus)", "all"],
  ["Pionites leucogaster", 636820933, "Marianinha-de-cabeça-amarela (Pionites leucogaster)", "all"],
  ["Cheracebus lugens", 750055314, "Guariba-de-cara-preta (Cheracebus lugens)", "all"],
  ["Oxymycterus nasutus", 535946639, "Rato-focinhudo (Oxymycterus nasutus)", "all"],
  ["Crypturellus obsoletus", 603345009, "Inhambu-guaçu (Crypturellus obsoletus)", "all"],
  ["Crypturellus cinereus", 230301903, "Inhambu-pixuna (Crypturellus cinereus)", "all"],
];

async function getJson(url) {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(url, { headers: UA });
    const t = await r.text();
    if (r.ok && t.startsWith("{")) return JSON.parse(t);
    await sleep(3000 * (i + 1));
  }
  throw new Error("iNaturalist indisponível: " + url);
}

/** Metadados de uma foto do iNaturalist (tenta o endpoint de fotos; senão procura nas observações). */
async function inatPhoto(taxon, id) {
  let m = null;
  try {
    m = (await getJson(`https://api.inaturalist.org/v1/photos/${id}`)).results?.[0] ?? null;
  } catch {}
  if (!m?.license_code) {
    for (const place of ["&place_id=6878", ""]) {
      const r = await getJson(
        `https://api.inaturalist.org/v1/observations?taxon_name=${encodeURIComponent(taxon)}&quality_grade=research&photo_license=cc0,cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa&order_by=votes&per_page=200&photos=true${place}`,
      );
      for (const o of r.results ?? []) for (const p of o.photos ?? []) if (String(p.id) === String(id)) m = p;
      if (m) break;
    }
  }
  if (!m) throw new Error(`foto ${id} não encontrada (${taxon})`);
  const lic = LIC[m.license_code];
  if (!lic) throw new Error(`foto ${id}: licença ${m.license_code} não aceita`);
  const author = (m.attribution || "").replace(/^\(c\) /, "").replace(/, (some rights reserved|no rights reserved).*$/, "");
  const od = m.original_dimensions ?? {};
  const k = Math.min(1, 1024 / Math.max(od.width, od.height));
  return {
    src: `https://inaturalist-open-data.s3.amazonaws.com/photos/${id}/large.jpg`,
    author,
    license: lic[0],
    licenseUrl: lic[1],
    sourceUrl: `https://www.inaturalist.org/photos/${id}`,
    width: Math.round(od.width * k),
    height: Math.round(od.height * k),
  };
}

function aplicar(sci, p, alt, parksArg, ctx) {
  const only = parksArg === "all" ? null : parksArg.split(",");
  const feitos = [];
  for (const park of fs.readdirSync(ROOT)) {
    if (only && !only.includes(park)) continue;
    let n = 0;
    let gn = 0;
    const bf = `${ROOT}/${park}/biodiversity.generated.json`;
    if (fs.existsSync(bf)) {
      const j = JSON.parse(fs.readFileSync(bf, "utf8"));
      const arr = [...(j.groups ?? []).flatMap((g) => g.species ?? []), ...(j.threatened ?? [])];
      for (const s of arr) if (s.scientificName === sci) { s.photo = { ...p, alt }; n++; }
      if (n && !DRY) fs.writeFileSync(bf, JSON.stringify(j, null, 2) + "\n");
    }
    if (ctx !== undefined || only) {
      const gf = `${ROOT}/${park}/guide.json`;
      if (fs.existsSync(gf)) {
        const g = JSON.parse(fs.readFileSync(gf, "utf8"));
        for (const f of g.flagships ?? []) {
          if (f.scientificName === sci && (ctx !== undefined || f.photo)) {
            f.photo = { ...p, alt, context: ctx ?? f.photo?.context };
            gn++;
          }
        }
        if (gn && !DRY) fs.writeFileSync(gf, JSON.stringify(g, null, 2) + "\n");
      }
    }
    if (n || gn) feitos.push(`${park}(bio ${n}, guia ${gn})`);
  }
  return feitos;
}

/** Ariranha: reaproveita a foto que a espécie-símbolo do Pantanal já usa (Commons, CC BY-SA 4.0). */
function ariranha() {
  const g = JSON.parse(fs.readFileSync(`${ROOT}/pantanal-mato-grossense/guide.json`, "utf8"));
  const f = (g.flagships ?? []).find((x) => x.scientificName === "Pteronura brasiliensis");
  if (!f?.photo) throw new Error("ariranha: foto do Pantanal não encontrada");
  const { src, author, license, licenseUrl, sourceUrl, width, height } = f.photo;
  const p = { src, author, license, licenseUrl, sourceUrl, width, height };
  return aplicar("Pteronura brasiliensis", p, "Ariranha (Pteronura brasiliensis)", "anavilhanas,araguaia,jau,pantanal-mato-grossense,serra-do-pardo,virua");
}

console.log(DRY ? "== simulação (nada será gravado) ==" : "== gravando ==");
console.log("Ariranha ->", ariranha().join(", "));
for (const [sci, id, alt, parks, ctx] of TROCAS) {
  try {
    const p = await inatPhoto(sci, id);
    const feitos = aplicar(sci, p, alt, parks, ctx);
    console.log(`${sci} (foto ${id}, ${p.author}, ${p.license}) ->`, feitos.length ? feitos.join(", ") : "nenhum parque");
  } catch (e) {
    console.log(`${sci}: FALHOU — ${e.message}`);
  }
  await sleep(1200);
}
console.log("Pronto. Rode: node scripts/check-content.mjs");
