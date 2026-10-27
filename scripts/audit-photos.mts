/** Auditoria reproduzível: separa falta de metadados de falha HTTP (não testa rede). */
import fs from "node:fs/promises";
import path from "node:path";
import { applySpeciesPhotoReview, buildSpeciesPhotoCatalog, fillSpeciesPhotoGaps, type PhotoReview } from "../src/lib/species-photos";
import type { Biodiversity, ParkGuide, Photo } from "../src/lib/data/types";

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
    if (/\bNC\b|\bND\b/i.test(photo.license)) add("licenca_com_restricoes");
    if (photo.context && /não confirmad|pode ser outro/i.test(photo.context)) add("localizacao_a_revisar");
  }
  const gallery = media[data.slug]?.photos ?? [];
  if (!gallery.length) issues.push({ park: data.slug, location: "galeria", subject: data.name, issue: "sem_foto" });
  gallery.forEach((p, i) => inspect(p, `galeria[${i}]`, p.alt, 1280));
  enriched.guide.wonders.forEach((w, i) => inspect(w.photo, `maravilhas[${i}]`, w.title, 960));
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
