/**
 * Loader de imagens do site. As fotos vêm do Wikimedia Commons e do iNaturalist,
 * que já servem miniaturas em larguras padrão pela própria CDN; então o navegador
 * pede direto a largura certa e o site não paga (nem depende de) otimização de
 * imagem do host. Nunca pede mais que o arquivo escolhido nos dados: o `src`
 * guarda a maior largura disponível para aquela foto.
 */

/** Larguras que o Wikimedia aceita para miniaturas (outras recebem 400/429). */
const WIKIMEDIA_STEPS = [250, 330, 500, 960, 1280, 1920, 3840];

/** Tamanhos nomeados do iNaturalist e a largura aproximada de cada um. */
const INAT_SIZES: [string, number][] = [
  ["small", 240],
  ["medium", 500],
  ["large", 1024],
];

export function supportsImageResizing(src: string): boolean {
  return /^https:\/\/(?:upload|thumb)\.wikimedia\.org\/wikipedia\/commons\/thumb\/.+\/\d+px-[^/]+$/.test(src) ||
    /^https:\/\/(?:inaturalist-open-data\.s3\.amazonaws\.com|static\.inaturalist\.org)\/photos\/\d+\/(?:small|medium|large)\.[a-z]+$/i.test(src);
}

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  const wiki = src.match(/^(https:\/\/(?:upload|thumb)\.wikimedia\.org\/wikipedia\/commons\/thumb\/.+\/)(\d+)px-([^/]+)$/);
  if (wiki) {
    const own = Number(wiki[2]);
    const step = WIKIMEDIA_STEPS.find((s) => s >= width) ?? WIKIMEDIA_STEPS.at(-1)!;
    return `${wiki[1]}${Math.min(step, own)}px-${wiki[3]}`;
  }

  const inat = src.match(/^(https:\/\/(?:inaturalist-open-data\.s3\.amazonaws\.com|static\.inaturalist\.org)\/photos\/\d+\/)(small|medium|large|original)(\.[a-z]+)$/i);
  if (inat) {
    const own = inat[2].toLowerCase();
    if (own === "original") return src;
    const wanted = INAT_SIZES.find(([, w]) => w >= width)?.[0] ?? "large";
    const order = INAT_SIZES.map(([n]) => n);
    const pick = order.indexOf(wanted) <= order.indexOf(own) ? wanted : own;
    return `${inat[1]}${pick}${inat[3]}`;
  }

  // Arquivo original sem miniatura (pequeno demais para ser reduzido) ou outro host: usa como está.
  return src;
}
