/**
 * Validação do conteúdo editorial (sem rede): Expedições e dossiês de pesquisa.
 * Roda antes de todo build (`prebuild`) e com `npm run check:content`.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const DATA = path.join(process.cwd(), "data");
const read = (...p) => JSON.parse(fs.readFileSync(path.join(DATA, ...p), "utf8"));
const exists = (...p) => fs.existsSync(path.join(DATA, ...p));

const THEMES = new Set(["geologia", "hidrografia", "relevo", "clima", "biodiversidade", "conservação", "história", "patrimônio", "arqueologia", "visitação"]);
const FEATURES = new Set(["timeline"]); // só o que o ExpeditionView sabe desenhar
const PHOTO_HOSTS = new Set(["upload.wikimedia.org", "thumb.wikimedia.org", "inaturalist-open-data.s3.amazonaws.com", "static.inaturalist.org", "live.staticflickr.com"]); // next.config.ts
const THREAT_WORDS = [[/criticamente (em perigo|ameaçad)/i, "CR"], [/\bem perigo\b/i, "EN"], [/\bvulner[aá]ve(l|is)\b/i, "VU"], [/quase ameaçad/i, "NT"]];
const THREAT_SCOPE = /lista nacional|lista estadual|\bMMA\b|plano de manejo|ICMBio|\bno (Brasil|Rio Grande do Sul|Paraná|estado)\b|\bna (Bahia|Paraíba)\b/i;
/** Wikimedia Commons: Special:FilePath redireciona a foto original para o CDN de arquivos. */
const isAllowedPhotoUrl = (src) => {
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return false;
    if (url.hostname === "commons.wikimedia.org") {
      const prefix = "/wiki/Special:FilePath/";
      return url.pathname.startsWith(prefix) && url.pathname.length > prefix.length;
    }
    return PHOTO_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
};

/** Ponto dentro do polígono do parque (public/geo/<país>/parks/<parque>.json), descontando buracos. */
const insidePark = (country, slug, [x, y]) => {
  const file = path.join(process.cwd(), "public", "geo", country, "parks", `${slug}.json`);
  if (!fs.existsSync(file)) return false;
  const { geometry } = JSON.parse(fs.readFileSync(file, "utf8"));
  const inRing = (ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some(([outer, ...holes]) => inRing(outer) && !holes.some(inRing));
};
const validLocation = (loc, ids) => Array.isArray(loc?.coordinates) && loc.coordinates.length === 2 &&
  loc.coordinates.every(Number.isFinite) && ["ponto", "aproximado"].includes(loc.precision) &&
  loc.sourceIds?.length > 0 && loc.sourceIds.every((id) => ids.has(id)) && (!loc.osm || /^(node|way|relation)\/\d+$/.test(loc.osm));

// Wikipédia pode ser consultada, nunca citada; licenças ND proíbem o recorte que o layout faz; NC é aceita (uso não comercial).
const strings = function* (v) {
  if (typeof v === "string") yield v;
  else if (Array.isArray(v)) for (const x of v) yield* strings(x);
  else if (v && typeof v === "object") for (const x of Object.values(v)) yield* strings(x);
};
const noWiki = (data, at) => {
  for (const s of strings(data)) {
    if (s.startsWith("http://") || s.startsWith("https://")) continue;
    assert(!/wikip[eé]dia/i.test(s), `${at}: menção à Wikipédia: "${s.slice(0, 80)}"`);
    assert(!/CC BY(-NC)?(-SA)?-ND/i.test(s), `${at}: licença ND: "${s.slice(0, 80)}"`);
  }
  for (const s of strings(data)) assert(!/(en|pt)\.wikipedia\.org/.test(s), `${at}: URL da Wikipédia como fonte`);
};

let expeditions = 0, approved = 0, dossiers = 0, notes = 0, guides = 0, reviewed = 0, bios = 0, species = 0;
for (const country of fs.readdirSync(DATA).filter((d) => d !== "generated" && exists(d, "parks.generated.json"))) {
  if (exists(country, "photo-curation.json")) {
    const review = read(country, "photo-curation.json");
    assert(/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt), "Curadoria sem data de revisão");
    for (const [taxon, photo] of Object.entries(review.photos)) {
      assert(taxon && isAllowedPhotoUrl(photo.src), `Curadoria: URL inválida para ${taxon}`);
      assert(photo.author && photo.license && photo.licenseUrl && photo.sourceUrl && photo.alt && photo.context,
        `Curadoria: crédito ou contexto incompleto para ${taxon}`);
      assert(photo.width > 0 && photo.height > 0, `Curadoria: dimensões ausentes para ${taxon}`);
    }
    for (const entry of review.rejected) assert(entry.scientificName && entry.sourceUrl && entry.reason, "Rejeição fotográfica sem identificação ou justificativa");
  }
  const parks = new Map(read(country, "parks.generated.json").map((p) => [p.slug, p]));
  if (exists(country, "park-photo-curation.json")) {
    const curation = read(country, "park-photo-curation.json");
    const generated = exists(country, "park-media.generated.json") ? read(country, "park-media.generated.json") : {};
    assert(/^\d{4}-\d{2}-\d{2}$/.test(curation.reviewedAt), "Curadoria de galerias sem data de revisão");
    for (const [slug, entry] of Object.entries(curation.parks)) {
      assert(parks.has(slug), `Curadoria de galerias: parque desconhecido ${slug}`);
      const seen = new Set();
      for (const p of entry.photos ?? []) {
        assert(isAllowedPhotoUrl(p.src), `Curadoria de galerias (${slug}): foto fora dos hosts permitidos: ${p.src}`);
        assert(p.alt && p.author && p.license && p.licenseUrl && p.sourceUrl && p.context?.trim(), `Curadoria de galerias (${slug}): crédito ou contexto incompleto em ${p.sourceUrl}`);
        assert(!/\bND\b/i.test(p.license), `Curadoria de galerias (${slug}): licença ND não permite o recorte do layout: ${p.sourceUrl}`);
        assert(p.width > 0 && p.height > 0, `Curadoria de galerias (${slug}): dimensões ausentes em ${p.sourceUrl}`);
        assert(!seen.has(p.sourceUrl), `Curadoria de galerias (${slug}): foto repetida ${p.sourceUrl}`);
        seen.add(p.sourceUrl);
      }
      if (entry.cover) {
        const available = [...(entry.photos ?? []), ...(generated[slug]?.photos ?? [])].map((p) => p.sourceUrl);
        assert(available.includes(entry.cover), `Curadoria de galerias (${slug}): a capa não está na galeria: ${entry.cover}`);
      }
    }
    for (const r of curation.rejected) assert(parks.has(r.park) && r.sourceUrl && r.reason?.trim(), "Rejeição de galeria sem parque, foto ou justificativa");
  }
  if (!exists(country, "parks")) continue;
  for (const slug of fs.readdirSync(path.join(DATA, country, "parks"))) {
    const where = `${country}/parks/${slug}`;
    const park = parks.get(slug);
    assert(park, `${where}: pasta de parque sem cadastro em parks.generated.json`);

    if (exists(country, "parks", slug, "expedition.json")) {
      const e = read(country, "parks", slug, "expedition.json");
      const at = `${where}/expedition.json`;
      expeditions++;
      noWiki(e, at);
      if (e.approved) approved++;
      assert.equal(e.schemaVersion, 2, `${at}: schemaVersion`);
      assert.equal(e.officialName, park.name, `${at}: officialName difere do cadastro (${park.name})`);
      for (const k of ["title", "subtitle", "centralQuestion", "closingTitle", "closing", "status", "lastVerifiedAt"]) {
        assert(typeof e[k] === "string" && e[k].trim(), `${at}: campo ${k} vazio`);
      }
      assert.equal(typeof e.approved, "boolean", `${at}: approved`);
      if (/rascunho|revisao/.test(e.status)) assert(!e.approved, `${at}: status "${e.status}" incompatível com aprovação`);
      assert(e.moments.length >= 1 && e.moments.length <= 5, `${at}: de 1 a 5 momentos`);
      assert(e.introduction.length > 0, `${at}: introdução vazia`);

      const refs = new Set(e.references.map((r) => r.id));
      assert.equal(refs.size, e.references.length, `${at}: referência duplicada`);
      for (const r of e.references) {
        assert(r.url.startsWith("https://") && r.institution && r.title && r.accessedAt && r.use, `${at}: referência ${r.id} incompleta`);
      }

      const photos = [e.cover, ...e.moments.flatMap((m) => m.images)].filter(Boolean);
      const srcs = new Set();
      for (const p of photos) {
        assert(isAllowedPhotoUrl(p.src), `${at}: foto fora dos hosts permitidos: ${p.src}`);
        assert(p.alt && p.author && p.license && p.licenseUrl && p.sourceUrl, `${at}: atribuição incompleta em ${p.src}`);
        assert(p.context && p.context.length >= 20, `${at}: legenda sem contexto em ${p.src}`);
        assert(!srcs.has(p.src), `${at}: foto repetida ${p.src}`);
        srcs.add(p.src);
      }

      for (const k of e.keyFacts ?? []) {
        assert(k.label && k.value && refs.has(k.sourceId), `${at}: fato em números sem fonte válida: "${k.label}"`);
      }
      assert((e.keyFacts ?? []).length <= 6, `${at}: no máximo 6 fatos em "Em números"`);
      for (const g of e.glossary ?? []) assert(g.term && g.definition && refs.has(g.sourceId), `${at}: termo do glossário sem fonte válida: "${g.term}"`);
      const ids = new Set();
      for (const m of e.moments) {
        for (const c of m.citations ?? []) assert(refs.has(c.sourceId) && c.locator, `${at}: citação sem fonte ou localizador em ${m.id}`);
        assert(m.id && m.eyebrow && m.title && m.question, `${at}: momento incompleto`);
        assert(!ids.has(m.id), `${at}: momento duplicado ${m.id}`);
        ids.add(m.id);
        assert(m.paragraphs.length > 0, `${at}: momento ${m.id} sem texto`);
        if (m.map) assert(m.map.label?.trim() && (m.map.frame === "entorno" || validLocation(m.map.location, refs)),
          `${at}: lugar do momento ${m.id} sem rótulo, coordenadas, precisão ou fonte existente`);
        assert(m.sourceIds.length > 0 && m.sourceIds.every((id) => refs.has(id)), `${at}: momento ${m.id} com fonte inexistente`);
      }

      // Parágrafo repetido (ex.: introdução copiada num momento) é erro editorial.
      const paragraphs = [...e.introduction, ...e.moments.flatMap((m) => m.paragraphs), e.closing].map((p) => p.trim());
      const dup = paragraphs.find((p, i) => paragraphs.indexOf(p) !== i);
      assert(!dup, `${at}: parágrafo repetido: "${dup?.slice(0, 80)}…"`);

      if (e.feature) {
        assert(FEATURES.has(e.feature.type), `${at}: interação desconhecida ${e.feature.type}`);
        assert(ids.has(e.feature.momentId), `${at}: interação aponta para momento inexistente`);
        assert(e.feature.items.length >= 2, `${at}: linha do tempo com menos de 2 marcos`);
        for (const it of e.feature.items) {
          assert(it.year && it.title && it.description && it.sourceIds.every((id) => refs.has(id)) && it.sourceIds.length, `${at}: marco ${it.id} incompleto`);
        }
      }
    }

    if (exists(country, "parks", slug, "guide.json")) {
      const g = read(country, "parks", slug, "guide.json");
      const at = `${where}/guide.json`;
      guides++;
      noWiki(g, at);
      if (g.status === "revisado") reviewed++;
      assert.equal(g.schemaVersion, 1, `${at}: schemaVersion`);
      assert(["rascunho", "revisado"].includes(g.status), `${at}: status deve ser "rascunho" ou "revisado"`);
      assert(g.hook?.trim() && g.hook.length <= 140, `${at}: hook vazio ou com mais de 140 caracteres (${g.hook?.length})`);
      assert(g.intro?.trim() && g.intro.length <= 480, `${at}: intro vazia ou com mais de 480 caracteres (${g.intro?.length})`);
      const ids = new Set(g.sources.map((s) => s.id));
      assert.equal(ids.size, g.sources.length, `${at}: fonte duplicada`);
      for (const s of g.sources) assert(s.id && s.institution && s.title && s.url?.startsWith("https://") && s.accessed, `${at}: fonte ${s.id} incompleta`);
      const cites = (list, what) => {
        assert(Array.isArray(list) && list.length > 0, `${at}: ${what} sem fonte`);
        for (const id of list) assert(ids.has(id), `${at}: ${what} cita fonte inexistente "${id}"`);
      };
      cites(g.sourceIds, "intro");
      const sized = (arr, min, max, what) => assert(Array.isArray(arr) && arr.length >= min && arr.length <= max, `${at}: ${what} deve ter de ${min} a ${max} itens`);
      sized(g.protects.items, 1, 5, "protects.items");
      assert(g.protects.summary?.trim(), `${at}: protects.summary vazio`);
      sized(g.wonders, 0, 6, "wonders");
      sized(g.curiosities, 0, 8, "curiosities");
      sized(g.stories, 0, 6, "stories");
      sized(g.flagships, 0, 6, "flagships");
      for (const it of [...g.protects.items, ...g.wonders, ...g.stories]) {
        assert(it.title?.trim() && it.text?.trim(), `${at}: item sem título ou texto`);
        cites(it.sourceIds, `"${it.title}"`);
      }
      for (const c of g.curiosities) {
        assert(c.text?.trim() && c.text.length <= 260, `${at}: curiosidade vazia ou longa demais (máx. 260): "${c.text?.slice(0, 40)}"`);
        cites(c.sourceIds, "curiosidade");
      }
      for (const f of g.flagships) {
        assert(f.scientificName && f.name && f.why, `${at}: espécie-símbolo incompleta`);
        if (f.photo) assert(isAllowedPhotoUrl(f.photo.src) && f.photo.author && f.photo.license && f.photo.sourceUrl, `${at}: foto de ${f.scientificName} sem atribuição`);
        cites(f.sourceIds, `espécie ${f.scientificName}`);
        // A ficha mostra a categoria global (IUCN); o texto com outra categoria precisa nomear a lista de origem.
        const bioFile = exists(country, "parks", slug, "biodiversity.generated.json") && read(country, "parks", slug, "biodiversity.generated.json");
        const card = bioFile && [...bioFile.groups.flatMap((x) => x.species), ...bioFile.threatened].find((s) => s.iucn && s.scientificName.toLowerCase() === f.scientificName.toLowerCase());
        const said = THREAT_WORDS.filter(([re]) => re.test(f.why)).map(([, c]) => c);
        const claims = said.includes("CR") ? said.filter((c) => c !== "EN") : said;
        assert(!card || !claims.length || claims.includes(card.iucn) || THREAT_SCOPE.test(f.why),
          `${at}: ${f.scientificName} diz ${claims.join("/")} no texto, mas a ficha mostra ${card?.iucn} (IUCN global). Nomeie a lista citada (nacional, estadual, plano de manejo) ou retire a categoria.`);
      }
      for (const w of g.wonders) {
        if (w.location) {
          assert(validLocation(w.location, ids), `${at}: lugar de "${w.title}" sem coordenadas, precisão ou fonte existente`);
          assert(insidePark(country, slug, w.location.coordinates), `${at}: "${w.title}" fica fora do limite do parque (${w.location.coordinates.join(", ")})`);
        }
        if (!w.photo) continue;
        const p = w.photo;
        assert(isAllowedPhotoUrl(p.src), `${at}: foto fora dos hosts permitidos: ${p.src}`);
        assert(p.alt && p.author && p.license && p.licenseUrl && p.sourceUrl && p.context, `${at}: foto de "${w.title}" sem atribuição completa`);
      }
      const texts = [g.intro, ...g.protects.items.map((i) => i.text), ...g.wonders.map((w) => w.text), ...g.curiosities.map((c) => c.text), ...g.stories.map((s) => s.text)].map((t) => t.trim());
      const dup = texts.find((t, i) => texts.indexOf(t) !== i);
      assert(!dup, `${at}: texto repetido: "${dup?.slice(0, 80)}…"`);
    }

    if (exists(country, "parks", slug, "lost-world.json")) {
      const l = read(country, "parks", slug, "lost-world.json");
      const at = `${where}/lost-world.json`;
      noWiki(l, at);
      assert.equal(l.schemaVersion, 1, `${at}: schemaVersion`);
      assert(["rascunho", "revisado"].includes(l.status), `${at}: status`);
      assert(l.intro?.trim(), `${at}: intro vazia`);
      assert(l.items.length >= 1 && l.items.length <= 5, `${at}: de 1 a 5 itens`);
      const ids = new Set(l.sources.map((s) => s.id));
      for (const s of l.sources) assert(s.id && s.institution && s.title && s.url?.startsWith("https://") && s.accessed, `${at}: fonte ${s.id} incompleta`);
      const kinds = new Set(["extinta", "extinta_na_natureza", "possivelmente_extinta", "extinta_localmente", "megafauna_fossil", "reintroduzida"]);
      const seen = new Set();
      for (const it of l.items) {
        assert(kinds.has(it.kind), `${at}: tipo desconhecido "${it.kind}"`);
        assert(it.name && it.scientificName && it.when && it.text?.trim().length >= 60, `${at}: item incompleto "${it.name}"`);
        assert(!seen.has(it.scientificName), `${at}: espécie repetida ${it.scientificName}`);
        seen.add(it.scientificName);
        assert(it.sourceIds?.length && it.sourceIds.every((id) => ids.has(id)), `${at}: "${it.name}" com fonte inexistente`);
        if (it.photo) {
          assert(isAllowedPhotoUrl(it.photo.src), `${at}: foto fora dos hosts permitidos: ${it.photo.src}`);
          assert(it.photo.alt && it.photo.author && it.photo.license && it.photo.licenseUrl && it.photo.sourceUrl && it.photo.context, `${at}: foto de "${it.name}" sem atribuição completa`);
        }
      }
    }

    if (exists(country, "parks", slug, "biodiversity.generated.json")) {
      const b = read(country, "parks", slug, "biodiversity.generated.json");
      const at = `${where}/biodiversity.generated.json`;
      bios++;
      const ex = exists(country, "bio-exclusions.json") ? read(country, "bio-exclusions.json") : {};
      for (const s of [...b.groups.flatMap((g) => g.species), ...b.threatened]) {
        species++;
        assert(!(ex.plants?.[s.scientificName] || ex.animals?.[s.scientificName] || ex.perPark?.[slug]?.[s.scientificName]), `${at}: espécie excluída (cultivada, doméstica ou exótica): ${s.scientificName}`);
        assert(s.scientificName && Number.isInteger(s.gbifKey), `${at}: espécie sem nome científico ou chave GBIF`);
        if (s.photo) assert(isAllowedPhotoUrl(s.photo.src) && s.photo.author && s.photo.license && s.photo.sourceUrl, `${at}: foto de ${s.scientificName} sem atribuição`);
      }
    }

    if (exists(country, "parks", slug, "research.json")) {
      const r = read(country, "parks", slug, "research.json");
      const at = `${where}/research.json`;
      dossiers++;
      assert(r.headline && r.story && r.reviewedAt, `${at}: cabeçalho incompleto`);
      assert(r.notes.length > 0, `${at}: sem notas`);
      for (const n of r.notes) {
        notes++;
        assert(THEMES.has(n.theme), `${at}: tema desconhecido ${n.theme}`);
        assert(n.title && n.body && n.source?.label && n.source.url.startsWith("https://"), `${at}: nota "${n.title}" incompleta`);
      }
      for (const q of r.openQuestions) assert(q.field && q.note && q.sources.length, `${at}: divergência incompleta`);
    }
  }
}
console.log(`Conteúdo OK: ${guides} guias (${reviewed} revisados), ${bios} levantamentos de biodiversidade (${species} espécies), ${expeditions} expedições (${approved} aprovadas), ${dossiers} dossiês com ${notes} notas.`);
