/** Auditoria reproduzível: separa falta de metadados de falha HTTP (não testa rede). */
import fs from "node:fs/promises";
import path from "node:path";
import { applySpeciesPhotoReview, buildSpeciesPhotoCatalog, fillSpeciesPhotoGaps, type PhotoReview } from "../src/lib/species-photos";
import type { Biodiversity, ParkGuide, Photo } from "../src/lib/data/types";
import { applyParkPhotoCuration, matchWonderPhoto, type ParkPhotoCuration } from "../src/lib/photos";

const root = path.resolve(import.meta.dirname, "..");
const read = async <T,>(file: string): Promise<T> => JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
const parks = await read<{ slug: string; name: string }[]>("data/br/parks.generated.json");
const media = await read<Record<string, { photos: Photo[] }>>("data/br/park-media.generated.json");
const datasets = await Promise.all(parks.map(async (park) => ({
  ...park,
  guide: await read<ParkGuide>(`data/br/parks/${park.slug}/guide.json`),
  biodiversity: await read<Biodiversity>(`data/br/parks/${park.slug}/biodiversity.generated.json`),
})));
const review = await read<PhotoReview>("data/br/photo-curation.json");
const parkPhotos = await read<ParkPhotoCuration>("data/br/park-photo-curation.json").catch(() => undefined);
const profiles = await read<Record<string, { summary?: string; sources?: unknown[] }>>("public/geo/br/species-profiles.json");
const profileNames = new Set(Object.entries(profiles).filter(([, p]) => p.summary?.trim() && (p.sources?.length ?? 0) >= 2).map(([name]) => name.trim().toLowerCase()));
const coverage: { slug: string; name: string; gallery: number; wonders: number; wondersMissing: string[]; flagships: number; flagshipPhotosMissing: string[]; profilesMissing: string[]; weakPhotoReferences: number }[] = [];
const reviewedDatasets = datasets.map((data) => applySpeciesPhotoReview(data, review));
const catalog = buildSpeciesPhotoCatalog(reviewedDatasets);
const issues: { park: string; location: string; subject: string; issue: string; sourceUrl?: string }[] = [];
const summary = { parks: parks.length, selectedSpecies: 0, missingSpeciesRaw: 0, missingSpeciesDisplayed: 0,
  missingPlantsDisplayed: 0, missingThreatenedRaw: 0, missingThreatenedDisplayed: 0,
  missingFlagshipsRaw: 0, missingFlagshipsDisplayed: 0, filledSpeciesReferences: 0, removedSpeciesReferences: 0, reusedThreatened: 0, recoveredFlagships: 0 };
const perPark = [];
for (const data of datasets) {
  const enriched = fillSpeciesPhotoGaps(applySpeciesPhotoReview(data, review), catalog);
  const all = data.biodiversity.groups.flatMap((g) => g.species);
  const raw = all.filter((s) => !s.photo).length;
  const remaining = enriched.biodiversity.groups.flatMap((g) => g.species).filter((s) => !s.photo).length;
  const plantsMissing = enriched.biodiversity.groups.find((g) => g.id === "plantas")?.species.filter((s) => !s.photo).length ?? 0;
  const missingFlagships = (d: typeof data) => d.guide.flagships.filter((f) => !f.photo &&
    ![...d.biodiversity.groups.flatMap((g) => g.species), ...d.biodiversity.threatened].some((s) => s.photo && s.scientificName.toLowerCase() === f.scientificName.toLowerCase())).length;
  const flagshipRaw = missingFlagships(data), flagshipRemaining = missingFlagships(enriched);
  const threatenedRaw = data.biodiversity.threatened.filter((s) => !s.photo).length;
  const threatenedRemaining = enriched.biodiversity.threatened.filter((s) => !s.photo).length;
  summary.selectedSpecies += all.length;
  summary.missingSpeciesRaw += raw;
  summary.missingSpeciesDisplayed += remaining;
  summary.missingPlantsDisplayed += plantsMissing;
  summary.missingThreatenedRaw += threatenedRaw;
  summary.missingThreatenedDisplayed += threatenedRemaining;
  summary.reusedThreatened += threatenedRaw - threatenedRemaining;
  summary.missingFlagshipsRaw += flagshipRaw;
  summary.missingFlagshipsDisplayed += flagshipRemaining;
  data.biodiversity.groups.forEach((group, gi) => group.species.forEach((species, si) => {
    const displayed = enriched.biodiversity.groups[gi].species[si];
    if (!species.photo && displayed.photo) summary.filledSpeciesReferences++;
    if (species.photo && !displayed.photo) summary.removedSpeciesReferences++;
  }));
  summary.recoveredFlagships += flagshipRaw - flagshipRemaining;
  perPark.push({ slug: data.slug, name: data.name, missingSpecies: remaining, missingPlants: plantsMissing, missingThreatened: threatenedRemaining, missingFlagships: flagshipRemaining });

  function inspect(photo: Photo | null | undefined, location: string, subject: string, minimum: number) {
    const add = (issue: string) => issues.push({ park: data.slug, location, subject, issue, sourceUrl: photo?.sourceUrl });
    if (!photo) { add("sem_foto"); return; }
    if (!photo.width || !photo.height) add("dimensoes_ausentes");
    else if (photo.width < minimum || Math.min(photo.width, photo.height) < minimum / 2) add("resolucao_baixa_para_o_uso");
    if (/desconhecid|unknown/i.test(photo.author) || !photo.author.trim()) add("autoria_a_revisar");
    if (!photo.license || !photo.licenseUrl || !photo.sourceUrl || !photo.alt) add("metadados_incompletos");
    if (/licen[çc]a.*n[ãa]o confirmada/i.test(photo.license)) add("licenca_nao_confirmada");
    if (/\bNC\b|\bND\b/i.test(photo.license)) add("licenca_com_restricoes");
    if (photo.context && /não confirmad|pode ser outro/i.test(photo.context)) add("localizacao_a_revisar");
  }
  // Mesma galeria que o site mostra: gerada + curadoria (fotos acrescentadas, capa e rejeições).
  const gallery = applyParkPhotoCuration(data.slug, media[data.slug]?.photos ?? [], parkPhotos);
  if (!gallery.length) issues.push({ park: data.slug, location: "galeria", subject: data.name, issue: "sem_foto" });
  gallery.forEach((p, i) => inspect(p, `galeria[${i}]`, p.alt, 1280));
  enriched.guide.wonders.forEach((w, i) => inspect(w.photo ?? matchWonderPhoto(w.title, gallery), `maravilhas[${i}]`, w.title, 960));
  enriched.guide.flagships.forEach((f, i) => {
    const photo = f.photo ?? [...enriched.biodiversity.groups.flatMap((g) => g.species), ...enriched.biodiversity.threatened].find((s) => s.scientificName.toLowerCase() === f.scientificName.toLowerCase() && s.photo)?.photo;
    inspect(photo, `destaques[${i}]`, f.scientificName, 960);
  });
  enriched.biodiversity.groups.forEach((g) => g.species.forEach((s) => inspect(s.photo, g.id, s.scientificName, 960)));
  enriched.biodiversity.threatened.forEach((s) => inspect(s.photo, "ameacadas", s.scientificName, 960));
  // Todas as referências editoriais também entram no relatório, inclusive rascunhos.
  for (const filename of ["expedition.json", "lost-world.json"]) {
    let content: unknown;
    try { content = await read(`data/br/parks/${data.slug}/${filename}`); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") continue; throw e; }
    const walk = (value: unknown, location: string) => {
      if (Array.isArray(value)) return value.forEach((v, i) => walk(v, `${location}[${i}]`));
      if (!value || typeof value !== "object") return;
      if ("src" in value && "sourceUrl" in value) { inspect(value as Photo, location, (value as Photo).alt, 1280); return; }
      for (const [key, v] of Object.entries(value)) walk(v, `${location}.${key}`);
    };
    walk(content, filename);
  }
  coverage.push({ slug: data.slug, name: data.name, gallery: gallery.length,
    wonders: enriched.guide.wonders.length,
    wondersMissing: enriched.guide.wonders.filter(w => !w.photo && !matchWonderPhoto(w.title, gallery)).map(w => w.title),
    flagships: enriched.guide.flagships.length,
    flagshipPhotosMissing: issues.filter(i => i.park === data.slug && i.issue === "sem_foto" && i.location.startsWith("destaques[")).map(i => i.subject),
    profilesMissing: enriched.guide.flagships.filter(f => !profileNames.has(f.scientificName.trim().toLowerCase())).map(f => f.scientificName),
    weakPhotoReferences: issues.filter(i => i.park === data.slug && i.issue === "resolucao_baixa_para_o_uso").length,
  });
}
const counts = Object.fromEntries([...new Set(issues.map((i) => i.issue))].sort().map((issue) => [issue, issues.filter((i) => i.issue === issue).length]));
const report = { summary, counts, limitations: "Auditoria de metadados locais. Não comprova identificação visual, integridade HTTP, autoria ou localização. Reuso restrito ao nome científico idêntico na base existente; nunca transfere ocorrência ou alega que a foto foi feita no parque.", perPark, issues };
const output = path.join(root, "docs/audits/fotos-atual");
await fs.mkdir(output, { recursive: true });
await fs.writeFile(path.join(output, "auditoria.json"), JSON.stringify(report, null, 2) + "\n");
await fs.writeFile(path.join(output, "LEIA-ME.md"), `# Auditoria fotográfica\n\nGerada por \`npm run audit:photos\`. ${report.limitations}\n\n` +
  Object.entries(summary).map(([key, value]) => `- ${key}: ${value}`).join("\n") +
  `\n\nOs contadores Species referem-se às abas por grupo; Threatened refere-se à aba de ameaçadas. Pode haver sobreposição de espécies entre essas seleções. Raw é a base em disco; Displayed inclui o reuso por nome científico no carregamento do site.\n\n## Fila por parque\n\n| Parque | Abas por grupo: sem foto | Destas, plantas | Aba ameaçadas: sem foto | Destaques sem foto |\n| --- | ---: | ---: | ---: | ---: |\n` +
  perPark.filter((p) => p.missingSpecies || p.missingFlagships || p.missingThreatened).sort((a, b) => b.missingPlants - a.missingPlants || b.missingFlagships - a.missingFlagships).map((p) => `| ${p.name} | ${p.missingSpecies} | ${p.missingPlants} | ${p.missingThreatened} | ${p.missingFlagships} |`).join("\n") + "\n\nOs caminhos e as fontes de cada problema estão em auditoria.json. Ausência é contabilizada por referência, não por imagem única. Não trocar espécies por parentes próximos para esconder lacunas.\n");
console.log(JSON.stringify({ summary, counts, output }, null, 2));
// Cobertura editorial: todas as unidades, sem tratar quantidade de registros como riqueza biológica.
const totals = { parks: coverage.length, galleriesWithoutPhotos: coverage.filter(p => !p.gallery).length,
  galleriesBelowThree: coverage.filter(p => p.gallery < 3).length,
  wonders: coverage.reduce((n, p) => n + p.wonders, 0),
  wondersWithoutPhotos: coverage.reduce((n, p) => n + p.wondersMissing.length, 0),
  flagshipReferences: coverage.reduce((n, p) => n + p.flagships, 0),
  flagshipReferencesWithoutProfiles: coverage.reduce((n, p) => n + p.profilesMissing.length, 0),
  uniqueFlagshipsWithoutProfiles: new Set(coverage.flatMap(p => p.profilesMissing.map(n => n.toLowerCase()))).size };
const coverageDir = path.join(root, "docs/audits/cobertura-atual");
await fs.mkdir(coverageDir, { recursive: true });
await fs.writeFile(path.join(coverageDir, "cobertura.json"), JSON.stringify({ totals, parks: coverage }, null, 2) + "\n");
await fs.writeFile(path.join(coverageDir, "LEIA-ME.md"), `# Cobertura dos 77 parques\n\nGerado por \`npm run audit:photos\`. Todas as unidades continuam no atlas. Quantidade mede cobertura editorial, não qualidade visual nem biodiversidade real. Galerias incluem curadoria; maravilhas incluem o reaproveitamento efetivo da galeria. Perfis são os publicados em public/geo, com resumo e pelo menos duas fontes.\n\n` +
  Object.entries(totals).map(([k, v]) => `- ${k}: ${v}`).join("\n") +
  `\n\n## Fila por parque\n\nA ordem destaca primeiro ausência de capa, depois destaques sem foto, maravilhas sem foto e referências de baixa resolução. Menos de três fotos é um alvo de curadoria, não erro. Resolução baixa é indicação para inspeção; não comprova foto ruim.\n\n| Parque | Fotos na galeria | Maravilhas sem foto / total | Destaques sem foto | Destaques sem perfil | Fotos abaixo do limiar |\n| --- | ---: | ---: | ---: | ---: | ---: |\n` +
  [...coverage].sort((a, b) => Number(!b.gallery) - Number(!a.gallery) || b.flagshipPhotosMissing.length - a.flagshipPhotosMissing.length || b.wondersMissing.length - a.wondersMissing.length || b.weakPhotoReferences - a.weakPhotoReferences || a.name.localeCompare(b.name, "pt-BR"))
    .map(p => `| ${p.name} | ${p.gallery} | ${p.wondersMissing.length} / ${p.wonders} | ${p.flagshipPhotosMissing.length} | ${p.profilesMissing.length} | ${p.weakPhotoReferences} |`).join("\n") +
  "\n\nO JSON lista os nomes de maravilhas e espécies pendentes em cada parque. Sobreposições entre grupos e ameaçadas contam como referências; não somar para obter espécies únicas. Ausências de Mundo Perdido, dossiês e coordenadas não são falhas: esses blocos dependem de evidência específica. Não preencher com fatos ou imagens genéricos.\n");
console.log(JSON.stringify(totals, null, 2));
