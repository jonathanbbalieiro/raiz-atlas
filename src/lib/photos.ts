import type { Photo } from "@/lib/data/types";

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

/**
 * Curadoria de capas e galerias (data/<país>/park-photo-curation.json). Fica fora
 * do arquivo gerado por `npm run media`, que é reescrito a cada execução.
 */
export interface ParkPhotoCuration {
  reviewedAt: string;
  parks: Record<string, {
    /** sourceUrl da foto que abre o parque (curada ou já existente na galeria). */
    cover?: string;
    /** Fotos acrescentadas à galeria, cada uma com contexto do lugar. */
    photos?: (Photo & { context: string })[];
  }>;
  /** Fotos da galeria gerada retiradas por erro de lugar ou identificação. */
  rejected: { park: string; sourceUrl: string; reason: string }[];
}

export function applyParkPhotoCuration<T extends Photo>(parkSlug: string, generated: T[], curation?: ParkPhotoCuration): Photo[] {
  if (!curation) return rankParkPhotos(parkSlug, generated);
  const entry = curation.parks[parkSlug];
  const rejected = new Set(curation.rejected.filter((r) => r.park === parkSlug).map((r) => r.sourceUrl));
  // A versão curada de uma foto já existente substitui a gerada (legenda corrigida, por exemplo);
  // fotos novas entram depois das existentes. A capa só muda com `cover` explícito.
  const curated = new Map((entry?.photos ?? []).map((p) => [p.sourceUrl, p]));
  const photos = dedupePhotos<Photo>([
    ...generated.map((p) => curated.get(p.sourceUrl) ?? p),
    ...(entry?.photos ?? []),
  ]).filter((p) => !rejected.has(p.sourceUrl));
  return rankParkPhotos(parkSlug, photos, entry?.cover);
}

export function rankParkPhotos<T extends Photo>(parkSlug: string, photos: T[], cover?: string): T[] {
  // Resolução ou palavras no título não comprovam o lugar. Preserve a curadoria.
  const ordered = dedupePhotos(photos);
  const chosen = cover ?? COVER_BY_PARK[parkSlug];
  if (!chosen) return ordered;
  const i = ordered.findIndex((p) => p.sourceUrl.includes(chosen) || p.src.includes(chosen));
  if (i <= 0) return ordered;
  return [ordered[i], ...ordered.slice(0, i), ...ordered.slice(i + 1)];
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
  return /^(CC BY(?:-SA)?\s*[1-9](?:\.\d)?(?:\s+[A-Z]{2}(?:[-\s][A-Z]{2})?)?|CC0(?:\s*[1-9](?:\.\d)?)?|PUBLIC DOMAIN(?: MARK)?|PD|PDM|FAL|LAL|FREE ART LICEN[CS]E|LICENCE ART LIBRE)$/.test(license);
}
