import type { Photo } from "@/lib/data/types";

export function photoArea(photo?: Pick<Photo, "width" | "height"> | null) {
  return Math.max(0, (photo?.width ?? 0) * (photo?.height ?? 0));
}

export function photoRatio(photo?: Pick<Photo, "width" | "height"> | null) {
  const w = photo?.width ?? 0;
  const h = photo?.height ?? 0;
  return w > 0 && h > 0 ? w / h : 4 / 3;
}

export function photoOrientation(photo?: Pick<Photo, "width" | "height"> | null) {
  const ratio = photoRatio(photo);
  if (ratio >= 1.6) return "wide";
  if (ratio >= 1.05) return "landscape";
  if (ratio >= 0.8) return "square";
  if (ratio >= 0.62) return "portrait";
  return "tall";
}

function ratioScore(ratio: number) {
  const target = 1.35;
  return Math.max(0, 1 - Math.abs(ratio - target) / 1.35);
}

export function photoQualityScore(photo: Photo) {
  const area = photoArea(photo);
  const ratio = photoRatio(photo);
  const areaScore = Math.min(area / (1600 * 1200), 1.5);
  const extBonus = /\.(?:jpe?g|png|webp)$/i.test(photo.src) ? 0.12 : 0;
  const commonsBonus = /wikimedia|upload\.wikimedia/i.test(photo.src) ? 0.08 : 0;
  return ratioScore(ratio) * 2.2 + areaScore + extBonus + commonsBonus;
}

export function sortPhotosByQuality<T extends Photo>(photos: T[]) {
  return [...photos].sort((a, b) => photoQualityScore(b) - photoQualityScore(a));
}

export type PhotoFrameMode = "hero" | "gallery" | "card" | "square" | "lightbox";

export function photoObjectPosition(photo: Pick<Photo, "width" | "height">, mode: PhotoFrameMode = "card") {
  const orientation = photoOrientation(photo);
  if (mode === "lightbox") return "center center";
  if (mode === "square") {
    if (orientation === "portrait" || orientation === "tall") return "center 24%";
    return "center center";
  }
  if (mode === "hero") {
    if (orientation === "tall") return "center 22%";
    if (orientation === "portrait") return "center 26%";
    if (orientation === "wide") return "center 42%";
    return "center center";
  }
  if (orientation === "tall") return "center 22%";
  if (orientation === "portrait") return "center 28%";
  if (orientation === "wide") return "center 44%";
  return "center center";
}

export function photoFrameAspect(photo: Pick<Photo, "width" | "height">, mode: Exclude<PhotoFrameMode, "square" | "lightbox"> = "card") {
  const orientation = photoOrientation(photo);
  if (mode === "hero") {
    if (orientation === "portrait" || orientation === "tall") return "3 / 4";
    if (orientation === "wide") return "16 / 10";
    return "4 / 3";
  }
  if (mode === "gallery") {
    if (orientation === "portrait" || orientation === "tall") return "4 / 5";
    if (orientation === "wide") return "16 / 10";
    return "4 / 3";
  }
  if (orientation === "portrait" || orientation === "tall") return "4 / 5";
  return "4 / 3";
}

/** Curadoria explícita: uma capa representativa do território tem prioridade sobre
 * métricas automáticas de resolução ou fotografias de espécies em outro local. */
const COVER_BY_PARK: Record<string, string> = {
  "guaricana": "Parque_Nacional_Guaricana_-_Luiz_Alves_(02).jpg",
  "restinga-de-jurubatiba": "Vegeta%C3%A7%C3%A3o_de_restinga_e_lagoa_-_Jurubatiba.jpg",
  "virua": "Parque_Nacional_do_Viru%C3%A1,_Roraima_(2).jpg",
};

export function rankParkPhotos<T extends Photo>(parkSlug: string, photos: T[]): T[] {
  const ordered = dedupePhotos([...photos]).sort((a, b) => parkCoverScore(b) - parkCoverScore(a));
  const chosen = COVER_BY_PARK[parkSlug];
  if (!chosen) return ordered;
  const i = ordered.findIndex((p) => p.sourceUrl.includes(chosen) || p.src.includes(chosen));
  if (i <= 0) return ordered;
  return [ordered[i], ...ordered.slice(0, i), ...ordered.slice(i + 1)];
}


function includesAny(text: string, words: string[]) {
  const low = text.toLowerCase();
  return words.some((w) => low.includes(w));
}

const LANDSCAPE_HINTS = [
  'parque nacional', 'paisagem', 'vista', 'panorama', 'montanha', 'serra', 'chapada', 'cachoeira', 'rio', 'lago', 'lagoa',
  'duna', 'floresta', 'restinga', 'campo', 'cerrado', 'caverna', 'gruta', 'trilha', 'costão', 'falésia', 'praia', 'arquipélago'
];
const AMBIGUOUS_HINTS = [
  'localização exata da fotografia', 'não confirmada', 'pode ser outro', 'retrato ilustrativo', 'fotografia da espécie', 'local da fotografia pode ser outro'
];
const SPECIES_HINTS = [
  'retrato', 'espécie', 'ave', 'mamífero', 'réptil', 'anfíbio', 'peixe', 'planta', 'árvore', 'flor', 'folha'
];

export function isIllustrativeSpeciesPhoto(photo: Photo) {
  const text = [photo.alt, photo.context, photo.sourceUrl].filter(Boolean).join(' · ');
  return includesAny(text, AMBIGUOUS_HINTS) || includesAny(text, SPECIES_HINTS);
}

export function isLandscapePhoto(photo: Photo) {
  const text = [photo.alt, photo.context, photo.sourceUrl].filter(Boolean).join(' · ');
  return includesAny(text, LANDSCAPE_HINTS) && !includesAny(text, ['retrato ilustrativo', 'fotografia da espécie']);
}

export function parkCoverScore(photo: Photo) {
  let score = photoQualityScore(photo);
  if (isLandscapePhoto(photo)) score += 2.4;
  if (isIllustrativeSpeciesPhoto(photo)) score -= 1.4;
  if ((photo.context || '').toLowerCase().includes('não confirmada')) score -= 0.5;
  return score;
}

export function dedupePhotos<T extends Photo>(photos: T[]) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const photo of photos) {
    const key = photo.sourceUrl || photo.src;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(photo);
  }
  return out;
}


/** Regras conservadoras para publicação aberta (inclusive com monetização futura).
 * Licenças NC, ND, GFDL e indeterminadas exigem avaliação individual antes de uso público.
 * A publicação de fotografias livres mantém os créditos já associados a cada obra.
 */
export function photoIsPubliclyReusable(photo: Photo): boolean {
  const license = photo.license.trim().toUpperCase().replace(/\s+/g, " ");
  if (!license || /(^|[-\s])(NC|ND)(?=[-\s]|$)/.test(license) || /GFDL|FAIR USE|ALL RIGHTS RESERVED/.test(license)) {
    return false;
  }
  return /^(CC BY(?:-SA)?\s*[1-9](?:\.\d)?(?:\s+[A-Z]{2}(?:[-\s][A-Z]{2})?)?|CC0(?:\s*[1-9](?:\.\d)?)?|PUBLIC DOMAIN(?: MARK)?|PD|PDM|FAL|LAL|FREE ART LICEN[CS]E|LICENCE ART LIBRE)/.test(license);
}
