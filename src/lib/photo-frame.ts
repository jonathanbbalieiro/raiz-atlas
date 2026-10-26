import type { Photo } from "@/lib/data/types";

/**
 * Enquadramento de fotos de espécies em cartões de proporção fixa. A cabeça do
 * animal costuma estar no terço de cima, então o recorte sobe conforme a foto é
 * mais vertical; fotos largas ficam centralizadas.
 */
export function speciesObjectPosition(photo?: Pick<Photo, "width" | "height"> | null): string {
  const w = photo?.width ?? 0;
  const h = photo?.height ?? 0;
  const ratio = w > 0 && h > 0 ? w / h : 1.33;
  if (ratio < 0.75) return "50% 10%";
  if (ratio < 1) return "50% 18%";
  if (ratio < 1.3) return "50% 28%";
  return "50% 38%";
}
