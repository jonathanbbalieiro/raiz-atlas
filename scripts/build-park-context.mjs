/**
 * Entorno do parque: unidades de conservação (CNUC/MMA), terras indígenas (Funai)
 * e territórios quilombolas (Incra) num raio em torno do limite do parque.
 *
 *   NODE_USE_ENV_PROXY=1 node scripts/build-park-context.mjs chapada-dos-veadeiros [--margin 0.4]
 *
 * Saídas:
 *   public/geo/br/context/<parque>.json            geometrias simplificadas, para o mapa
 *   data/br/parks/<parque>/context.generated.json  lista sem geometria, para o painel
 * Nunca editar à mão: rodar de novo o script. O próprio parque fica de fora.
 */
import fs from "node:fs/promises";
import path from "node:path";
import mapshaper from "mapshaper";

const ROOT = path.resolve(import.meta.dirname, "..");
const UA = { "User-Agent": "RaizAtlas/1.4 (atlas dos parques nacionais; jonathanbalieiro@gmail.com)" };
const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const margin = Number(args[args.indexOf("--margin") + 1]) || 0.4;
if (!slug) {
  console.log("Uso: node scripts/build-park-context.mjs <parque> [--margin graus]");
  process.exit(1);
}

const SOURCES = {
  cnuc: {
    title: "MMA: Cadastro Nacional de Unidades de Conservação (CNUC), camada cnuc_2026_03",
    url: "https://geoservicos.inde.gov.br/geoserver/MMA/ows",
    layer: "MMA:cnuc_2026_03",
  },
  funai: {
    title: "Funai: terras indígenas (polígonos)",
    url: "https://geoserver.funai.gov.br/geoserver/Funai/ows",
    layer: "Funai:tis_poligonais",
  },
  incra: {
    title: "Incra: áreas de quilombolas (acervo fundiário)",
    url: "https://certificacao.incra.gov.br/csv_shp/zip/%C3%81reas%20de%20Quilombolas.zip",
  },
};

const parks = JSON.parse(await fs.readFile(path.join(ROOT, "data/br/parks.generated.json"), "utf8"));
const park = parks.find((p) => p.slug === slug);
if (!park) throw new Error(`Parque desconhecido: ${slug}`);
const [w, s, e, n] = park.bbox;
const box = [w - margin, s - margin, e + margin, n + margin];

/** WFS 1.1.0 com EPSG:4326 em URN espera latitude antes de longitude. */
async function wfs({ url, layer }) {
  const q = new URLSearchParams({
    service: "WFS", version: "1.1.0", request: "GetFeature", typeName: layer,
    outputFormat: "application/json", srsName: "EPSG:4326",
    bbox: `${box[1]},${box[0]},${box[3]},${box[2]},urn:ogc:def:crs:EPSG::4326`,
  });
  const res = await fetch(`${url}?${q}`, { headers: UA, signal: AbortSignal.timeout(240000) });
  if (!res.ok) throw new Error(`${layer}: HTTP ${res.status}`);
  return res.json();
}

async function incraZip() {
  const cache = path.join(ROOT, ".geo-cache", "incra-quilombolas.zip");
  try {
    return await fs.readFile(cache);
  } catch {
    const res = await fetch(SOURCES.incra.url, { headers: UA, signal: AbortSignal.timeout(300000) });
    if (!res.ok) throw new Error(`Incra: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.mkdir(path.dirname(cache), { recursive: true });
    await fs.writeFile(cache, buf);
    return buf;
  }
}

const LOWER = new Set(["de", "da", "do", "das", "dos", "e", "a", "o"]);
const titleCase = (text) => text.toLowerCase().replace(/\s+/g, " ").trim().split(" ")
  .map((word, i) => (i > 0 && LOWER.has(word) ? word : word.replace(/^(\p{L})/u, (c) => c.toUpperCase())))
  .join(" ")
  .replace(/\bRppn\b/g, "RPPN").replace(/\bApa\b/g, "APA");

/** Fases como aparecem nas bases oficiais, em linguagem de leitura. */
const PHASE = {
  Regularizada: "regularizada", Homologada: "homologada", Declarada: "declarada", Delimitada: "delimitada",
  "Em Estudo": "em estudo", "Encaminhada RI": "em criação como reserva indígena",
  "TITULO PARCIAL": "titulação parcial", TITULADO: "titulado", DECRETO: "decreto publicado",
  PORTARIA: "portaria publicada", RTID: "relatório técnico publicado",
};
const phase = (value) => PHASE[value] ?? value.toLowerCase();
const fold = (text) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const round = (v) => Math.round(v * 100) / 100;

function fromCnuc(f) {
  const p = f.properties;
  if (p.cd_cnuc === park.cnuc) return null;
  const kind = p.categoria === "Reserva Particular do Patrimônio Natural" ? "rppn"
    : p.grupo === "Proteção Integral" ? "protecao-integral" : "uso-sustentavel";
  return {
    ...f,
    properties: {
      id: `cnuc-${p.cd_cnuc}`, kind, name: titleCase(p.nome_uc), category: p.categoria,
      detail: `${p.esfera}${p.cria_ato && p.cria_ato !== "Sem informação" ? ` · ${p.cria_ato}` : ""}`,
      areaHa: round(Number(p.ha_total)), source: "cnuc",
    },
  };
}

function fromFunai(f) {
  const p = f.properties;
  return {
    ...f,
    properties: {
      id: `funai-${p.terrai_codigo}`, kind: "terra-indigena", name: p.terrai_nome,
      category: p.modalidade_ti, detail: [fold(p.terrai_nome).includes(fold(p.etnia_nome)) ? null : `Povo ${p.etnia_nome}`, `situação: ${phase(p.fase_ti)}`].filter(Boolean).join(" · "),
      areaHa: round(Number(p.superficie_perimetro_ha)) || null, source: "funai",
    },
  };
}

function fromIncra(f) {
  const p = f.properties;
  return {
    ...f,
    properties: {
      id: `incra-${p.cd_quilomb}`, kind: "quilombola", name: `Território Quilombola ${titleCase(p.nm_comunid)}`,
      category: "Território quilombola", detail: `${titleCase(p.nm_municip.replace(/\//g, ", "))} · situação: ${phase(p.fase)}`,
      areaHa: round(Number(p.nr_area_ha)) || null, source: "incra",
    },
  };
}

/** Recorta pela caixa, simplifica e devolve FeatureCollection em WGS84. */
async function prepare(name, input, extra = "") {
  const out = await mapshaper.applyCommands(
    `-i ${name} ${extra} -proj wgs84 -clip bbox=${box.join(",")} -simplify 12% keep-shapes -o out.json format=geojson precision=0.0001`,
    { [name]: input },
  );
  return JSON.parse(out["out.json"]);
}

console.log(`Entorno de ${park.name}: caixa ${box.map((v) => v.toFixed(2)).join(", ")}`);
const [cnuc, funai, zip] = await Promise.all([wfs(SOURCES.cnuc), wfs(SOURCES.funai), incraZip()]);
const layers = [
  ...(await prepare("cnuc.json", JSON.stringify(cnuc))).features.map(fromCnuc),
  ...(await prepare("ti.json", JSON.stringify(funai))).features.map(fromFunai),
  ...(await prepare("quilombolas.zip", zip, "encoding=latin1")).features.map(fromIncra),
].filter(Boolean);

// Áreas maiores primeiro, para as menores ficarem visíveis por cima.
layers.sort((a, b) => (b.properties.areaHa ?? 0) - (a.properties.areaHa ?? 0));
const generatedAt = new Date().toISOString().slice(0, 10);
const sources = Object.entries(SOURCES).map(([id, { title, url }]) => ({ id, title, url }));

await fs.mkdir(path.join(ROOT, "public/geo/br/context"), { recursive: true });
await fs.writeFile(path.join(ROOT, "public/geo/br/context", `${slug}.json`),
  JSON.stringify({ type: "FeatureCollection", features: layers.map((f, i) => ({ ...f, id: i })) }));
await fs.writeFile(path.join(ROOT, "data/br/parks", slug, "context.generated.json"), JSON.stringify({
  generatedAt, marginDegrees: margin, sources,
  areas: layers.map(({ properties: p }) => p),
}, null, 2) + "\n");

const count = (kind) => layers.filter((f) => f.properties.kind === kind).length;
console.log(`${layers.length} áreas: ${count("protecao-integral")} de proteção integral, ${count("uso-sustentavel")} de uso sustentável, ` +
  `${count("rppn")} RPPNs, ${count("terra-indigena")} terras indígenas, ${count("quilombola")} territórios quilombolas.`);
