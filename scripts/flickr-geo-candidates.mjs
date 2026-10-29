/**
 * Candidatas de foto por busca GEOGRÁFICA no Flickr: fotos com licença CC (sem ND) cuja coordenada
 * cai dentro do polígono do parque. Não grava nos dados; a escolha é editorial (docs/CURADORIA_FOTOGRAFICA.md).
 *
 *   node --env-file=.env.local scripts/flickr-geo-candidates.mjs <parque...> --out .geo-cache/flickr-geo
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const out = path.resolve(ROOT, args[args.indexOf("--out") + 1] ?? ".geo-cache/flickr-geo");
const slugs = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--out");
const MIN = Number(process.env.MIN_WIDTH ?? 1600);
const KEY = process.env.FLICKR_API_KEY;
if (!KEY) throw new Error("FLICKR_API_KEY ausente (use --env-file=.env.local)");
const LICENSES = { 1: ["CC BY-NC-SA 2.0", "https://creativecommons.org/licenses/by-nc-sa/2.0/"], 2: ["CC BY-NC 2.0", "https://creativecommons.org/licenses/by-nc/2.0/"],
  4: ["CC BY 2.0", "https://creativecommons.org/licenses/by/2.0/"], 5: ["CC BY-SA 2.0", "https://creativecommons.org/licenses/by-sa/2.0/"],
  9: ["CC0", "https://creativecommons.org/publicdomain/zero/1.0/"], 10: ["Domínio público", "https://creativecommons.org/publicdomain/mark/1.0/"] };
const inside = (pt, polys) => polys.some((poly) => { let c = false; for (const ring of poly) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c; } return c; });
const parks = JSON.parse(fs.readFileSync(path.join(ROOT, "data/br/parks.generated.json"), "utf8"));
const list = Array.isArray(parks) ? parks : parks.parks;
fs.mkdirSync(out, { recursive: true });
for (const slug of slugs) {
  const meta = list.find((p) => p.slug === slug);
  const geo = JSON.parse(fs.readFileSync(path.join(ROOT, `public/geo/br/parks/${slug}.json`), "utf8"));
  const geoms = (geo.features ?? [geo]).map((f) => f.geometry ?? f);
  const polys = geoms.flatMap((g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates));
  const found = new Map();
  for (let page = 1; page <= 3; page++) {
    const url = `https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=${KEY}&format=json&nojsoncallback=1&bbox=${meta.bbox.join(",")}&license=${Object.keys(LICENSES).join(",")}&has_geo=1&per_page=250&page=${page}&media=photos&sort=interestingness-desc&extras=geo,license,owner_name,url_l,url_k,url_h,url_o,tags,description,o_dims`;
    const j = await (await fetch(url)).json();
    for (const p of j.photos?.photo ?? []) {
      const pt = [Number(p.longitude), Number(p.latitude)];
      if (!inside(pt, polys)) continue;
      const src = p.url_k ?? p.url_h ?? p.url_l; const width = Number(p.width_k ?? p.width_h ?? p.width_l ?? 0), height = Number(p.height_k ?? p.height_h ?? p.height_l ?? 0);
      if (!src || width < MIN) continue;
      found.set(p.id, { id: p.id, title: p.title, owner: p.ownername, ownerId: p.owner, license: LICENSES[p.license], src, width, height, tags: p.tags, description: p.description?._content?.slice(0, 200), point: pt, accuracy: p.accuracy, sourceUrl: `https://www.flickr.com/photos/${p.owner}/${p.id}` });
    }
    if (page >= (j.photos?.pages ?? 1)) break;
  }
  fs.writeFileSync(path.join(out, `${slug}.json`), JSON.stringify([...found.values()], null, 1));
  console.log(slug, found.size);
}
