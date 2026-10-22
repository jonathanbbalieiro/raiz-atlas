/**
 * Pipeline de geodados: baixa limites oficiais, simplifica e grava
 *
 *   public/geo/<país>/admin1.json          TopoJSON das divisões de 1º nível
 *   public/geo/<país>/outline.json         contorno do país (linha)
 *   public/geo/<país>/parks.json           todos os parques, geometria leve (visão país/estado)
 *   public/geo/<país>/parks/<slug>.json    um parque, geometria detalhada (visão do parque)
 *   data/<país>/parks.generated.json       metadados oficiais de cada parque
 *   data/generated/geo-index.json          bbox e ponto de rótulo do país e das divisões
 *
 * Uso: npm run geo   (downloads ficam em .geo-cache/; apague a pasta para baixar de novo)
 *
 * Fontes:
 *  - IBGE, API de Malhas Territoriais v3 (dados públicos; citar a fonte).
 *  - ICMBio, limites e atributos das UCs federais via GeoServer da INDE (dados públicos; citar a fonte).
 */
import fs from "node:fs/promises";
import path from "node:path";
import mapshaper from "mapshaper";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE = path.join(ROOT, ".geo-cache");
const DATA = path.join(ROOT, "data");
const PUBLIC_GEO = path.join(ROOT, "public", "geo");

/**
 * Simplificação por distância (metros): mantém o mesmo nível de detalhe em
 * parques pequenos e enormes, o que um percentual global não faz.
 */
const SIMPLIFY = { admin1: "interval=3500", parksOverview: "interval=1500", parkDetail: "interval=60" };

async function cached(name, url) {
  const file = path.join(CACHE, name);
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    console.log(`↓ ${url}`);
    const res = await fetch(url, { headers: { "User-Agent": "maravilhas-naturais/0.1 (pipeline de geodados)" } });
    if (!res.ok) throw new Error(`${res.status} em ${url}`);
    const text = await res.text();
    await fs.mkdir(CACHE, { recursive: true });
    await fs.writeFile(file, text);
    return JSON.parse(text);
  }
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function writeJson(file, data, { quiet = false } = {}) {
  const text = typeof data === "string" ? data : JSON.stringify(data);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, text);
  if (!quiet) console.log(`✓ ${path.relative(ROOT, file)} (${(Buffer.byteLength(text) / 1024).toFixed(1)} KB)`);
  return Buffer.byteLength(text);
}

/** Roda comandos do mapshaper em memória e devolve o texto da saída (GeoJSON por padrão). */
async function ms(input, commands, output = "format=geojson geojson-type=FeatureCollection") {
  const out = await mapshaper.applyCommands(`-i in.json ${commands} -o out.json ${output}`, {
    "in.json": JSON.stringify(input),
  });
  return out["out.json"].toString();
}

const round = (n, p = 1e4) => Math.round(n * p) / p;

function bboxOf(geojson) {
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  const visit = (c) => {
    if (typeof c[0] === "number") {
      w = Math.min(w, c[0]);
      s = Math.min(s, c[1]);
      e = Math.max(e, c[0]);
      n = Math.max(n, c[1]);
    } else c.forEach(visit);
  };
  const features = geojson.type === "FeatureCollection" ? geojson.features : [geojson];
  features.forEach((f) => visit(f.geometry.coordinates));
  return [w, s, e, n].map((v) => round(v));
}

/** Ponto dentro de polígono (ray casting) para Polygon/MultiPolygon GeoJSON. */
function contains(geometry, [x, y]) {
  const polys = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polys.some((rings) => {
    let inside = false;
    for (const ring of rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
    }
    return inside;
  });
}

/* ------------------------------------------------------------------ */
/* Texto                                                              */
/* ------------------------------------------------------------------ */

const LOWER = new Set(["de", "da", "do", "das", "dos", "e"]);
/** Correções pontuais de grafia no cadastro de origem. */
const SPELLING = { "Lençois": "Lençóis" };

function titleCase(s) {
  return s
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((w, i) => (i > 0 && LOWER.has(w) ? w : w.charAt(0).toLocaleUpperCase("pt-BR") + w.slice(1)))
    .map((w) => SPELLING[w] ?? w)
    .join(" ")
    .replace(/-(\p{L})/gu, (_, c) => "-" + c.toLocaleUpperCase("pt-BR"));
}

/** "Parque Nacional Marinho dos Abrolhos" → "Abrolhos" */
function shortName(name) {
  const s = name.replace(/^Parque Nacional\s+(Marinho\s+|e Histórico\s+)?((da|do|de|das|dos)\s+)?/i, "");
  return s.charAt(0).toLocaleUpperCase("pt-BR") + s.slice(1);
}

const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Normaliza os biomas do cadastro do ICMBio para chaves estáveis. */
const BIOME_KEYS = [
  ["amazonia", /amaz/i],
  ["cerrado", /cerrado/i],
  ["mata_atlantica", /mata atl/i],
  ["caatinga", /caatinga/i],
  ["pantanal", /pantanal/i],
  ["pampa", /pampa/i],
  ["marinho", /marinh/i],
];
function biomeKeys(text) {
  return BIOME_KEYS.filter(([, re]) => re.test(text ?? "")).map(([k]) => k);
}

/* ------------------------------------------------------------------ */
/* Provedores por país. Para um novo país, adicione uma entrada aqui. */
/* ------------------------------------------------------------------ */

const IBGE = "https://servicodados.ibge.gov.br/api/v3/malhas";
const GEOJSON = "formato=application/vnd.geo%2Bjson";

const providers = {
  br: {
    admin1: () => cached("br-uf.json", `${IBGE}/paises/BR?${GEOJSON}&qualidade=intermediaria&intrarregiao=UF`),
    /** Todos os parques nacionais (categoria PARNA) do ICMBio. */
    parks: () =>
      cached(
        "br-parnas.json",
        "https://geoservicos.inde.gov.br/geoserver/ICMBio/ows?service=WFS&version=1.0.0" +
          "&request=GetFeature&typeName=ICMBio:limiteucsfederais_a&outputFormat=application/json" +
          "&srsName=EPSG:4326&CQL_FILTER=sigla_cate=%27PARNA%27",
      ),
    /** Converte os atributos do WFS do ICMBio para o nosso formato. */
    parkProps: (p) => {
      const name = titleCase(p.nomeuc);
      const biomes = biomeKeys(p.biomas);
      const predominant = biomeKeys(p.bioma_pred)[0] ?? biomes[0];
      return {
        cnuc: p.cnuc,
        name,
        shortName: shortName(name),
        ufs: String(p.uf).split("/"),
        biome: predominant,
        biomes: biomes.includes(predominant) ? biomes : [predominant, ...biomes],
        areaHa: Math.round(p.areahaalb),
        createdYear: Number(p.criacaoano) || null,
        creationAct: p.criacaoato?.trim() || null,
      };
    },
  },
};

async function buildCountry(countrySlug) {
  const provider = providers[countrySlug];
  if (!provider) throw new Error(`Sem provedor de geodados para "${countrySlug}"`);

  const countryDir = path.join(DATA, countrySlug);
  const admin1List = await readJson(path.join(countryDir, "admin1.json"));
  const byOfficialCode = new Map(admin1List.map((a) => [String(a.officialCode), a]));
  const byCode = new Map(admin1List.map((a) => [a.code, a]));
  const index = {};

  // 1. Divisões de 1º nível --------------------------------------------------
  const raw = await provider.admin1();
  for (const f of raw.features) {
    const a = byOfficialCode.get(String(f.properties.codarea));
    if (!a) throw new Error(`Código sem correspondência em admin1.json: ${f.properties.codarea}`);
    f.properties = { slug: a.slug, code: a.code, name: a.name };
  }
  const admin1 = JSON.parse(await ms(raw, `-simplify ${SIMPLIFY.admin1} keep-shapes -clean`));
  for (const f of admin1.features) index[`${countrySlug}/${f.properties.slug}`] = { bbox: bboxOf(f) };
  // Ponto de rótulo dentro do polígono (melhor que o centroide para estados côncavos).
  const labels = JSON.parse(await ms(admin1, "-points inner"));
  for (const f of labels.features) {
    index[`${countrySlug}/${f.properties.slug}`].labelPoint = f.geometry.coordinates.map((v) => round(v));
  }
  index[countrySlug] = { bbox: bboxOf(admin1) };
  await writeJson(
    path.join(PUBLIC_GEO, countrySlug, "admin1.json"),
    await ms(admin1, "-rename-layers admin1", "format=topojson quantization=100000"),
  );

  // Contorno do país (fronteira + costa), desenhado como linha sobre o mapa.
  const outline = JSON.parse(await ms(admin1, "-dissolve -lines"));
  await fs.rm(path.join(PUBLIC_GEO, countrySlug, "mask.json"), { force: true });
  await writeJson(path.join(PUBLIC_GEO, countrySlug, "outline.json"), outline);

  // 2. Parques ----------------------------------------------------------------
  const parksRaw = await provider.parks();
  const parks = [];
  const used = new Set();
  for (const f of parksRaw.features) {
    const props = provider.parkProps(f.properties);
    for (const uf of props.ufs) if (!byCode.has(uf)) throw new Error(`${props.name}: UF desconhecida ${uf}`);
    let slug = slugify(props.shortName);
    if (used.has(slug)) slug = slugify(props.name);
    used.add(slug);
    parks.push({ slug, ...props });
    f.properties = { slug };
  }
  const bySlug = new Map(parks.map((p) => [p.slug, p]));

  // Ponto interno de cada parque: rótulo/pin no mapa e escolha do estado "canônico"
  // (o da URL) para parques que cruzam divisas.
  const inner = JSON.parse(await ms(parksRaw, "-dissolve slug -points inner"));
  for (const pt of inner.features) {
    const park = bySlug.get(pt.properties.slug);
    park.labelPoint = pt.geometry.coordinates.map((v) => round(v));
    const host = admin1.features.find(
      (s) => park.ufs.includes(s.properties.code) && contains(s.geometry, park.labelPoint),
    );
    // Parques marinhos caem no mar: ficam com a primeira UF do cadastro.
    park.admin1 = (host ? host.properties.slug : byCode.get(park.ufs[0]).slug);
  }

  // Geometria leve (todos os parques, carregada uma vez) ...
  const overview = JSON.parse(
    await ms(
      parksRaw,
      `-dissolve slug -simplify ${SIMPLIFY.parksOverview} keep-shapes -clean`,
      "format=geojson geojson-type=FeatureCollection precision=0.001",
    ),
  );
  for (const f of overview.features) {
    const p = bySlug.get(f.properties.slug);
    f.properties = { slug: p.slug, biome: p.biome };
  }
  await writeJson(path.join(PUBLIC_GEO, countrySlug, "parks.json"), overview);

  // ... e detalhada (uma por parque, carregada ao entrar nele).
  const detail = JSON.parse(
    await ms(
      parksRaw,
      `-dissolve slug -simplify ${SIMPLIFY.parkDetail} keep-shapes -clean`,
      "format=geojson geojson-type=FeatureCollection precision=0.0001",
    ),
  );
  await fs.rm(path.join(PUBLIC_GEO, countrySlug, "parks"), { recursive: true, force: true });
  let total = 0;
  for (const f of detail.features) {
    const p = bySlug.get(f.properties.slug);
    p.bbox = bboxOf(f);
    f.properties = { slug: p.slug, biome: p.biome };
    total += await writeJson(path.join(PUBLIC_GEO, countrySlug, "parks", `${p.slug}.json`), f, { quiet: true });
  }
  console.log(`✓ public/geo/${countrySlug}/parks/*.json (${detail.features.length} arquivos, ${(total / 1024).toFixed(0)} KB no total)`);

  parks.sort((a, b) => a.name.localeCompare(b.name, "pt"));
  await writeJson(path.join(countryDir, "parks.generated.json"), JSON.stringify(parks, null, 2) + "\n");
  return index;
}

const countries = (await fs.readdir(DATA, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && d.name !== "generated")
  .map((d) => d.name);

const index = {};
for (const c of countries) Object.assign(index, await buildCountry(c));
await writeJson(
  path.join(DATA, "generated", "geo-index.json"),
  JSON.stringify(Object.fromEntries(Object.entries(index).sort(([a], [b]) => a.localeCompare(b))), null, 2) + "\n",
);
