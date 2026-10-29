/** Complementos da página da espécie, lidos sob demanda de public/geo/<país>/. */
export interface SpeciesIndex {
  parks: Record<string, { name: string; uf: string }>;
  /** Nome científico em minúsculas → parques do atlas onde aparece (só quando são dois ou mais). */
  species: Record<string, string[]>;
}

/** Perfil editorial (data/<país>/species-profiles.json); cada bloco é opcional. */
export interface SpeciesProfile {
  summary?: string;
  habits?: string;
  history?: string;
  curiosities?: string[];
  sources: { institution: string; title: string; url: string }[];
}

const cache = new Map<string, Promise<unknown>>();
function load<T>(url: string): Promise<T | null> {
  if (!cache.has(url)) cache.set(url, fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  return cache.get(url) as Promise<T | null>;
}

export const loadSpeciesIndex = (country: string) => load<SpeciesIndex>(`/geo/${country}/species-parks.json`);
export const loadSpeciesProfiles = (country: string) => load<Record<string, SpeciesProfile>>(`/geo/${country}/species-profiles.json`);
