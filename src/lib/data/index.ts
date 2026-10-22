import { JsonRepository } from "./json-repository";
import type { PlaceRepository } from "./repository";

/** Ponto único de troca da fonte de dados (JSON hoje, banco amanhã). */
export const repo: PlaceRepository = new JsonRepository();

export * from "./types";
export type { PlaceRepository } from "./repository";
