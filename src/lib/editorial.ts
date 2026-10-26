/**
 * Publicação editorial. Rascunhos de Expedição aparecem no `next dev` (com
 * aviso de prévia) e nunca no build de produção, a menos que a prévia seja
 * pedida explicitamente com RAIZ_PREVIEW_DRAFTS=1 (ex.: deploy de revisão).
 */
export const SHOW_DRAFTS =
  process.env.NODE_ENV !== "production" || process.env.RAIZ_PREVIEW_DRAFTS === "1";

/** Último segmento da URL da Expedição: /br/go/chapada-dos-veadeiros/expedicao. */
export const EXPEDITION_SEGMENT = "expedicao";
