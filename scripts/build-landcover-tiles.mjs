/**
 * Gera os ladrilhos de cobertura vegetal da visão do país em tons de verde (estilo mapa de
 * trilhas): baixa a classificação MODIS IGBP da NASA (GIBS, domínio público) e recolore cada
 * classe com a paleta do Raiz. Saída: public/tiles/landcover/{z}/{x}/{y}.png (zoom 0 a 7, só Brasil).
 * Uso: node scripts/build-landcover-tiles.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "tiles", "landcover");
const SRC = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual/default/2024-01-01/GoogleMapsCompatible_Level8";
const BBOX = [-74.5, -34.5, -27.5, 5.8]; // Brasil (zoom 6 e 7)
const WIDE = [-82, -56, -34, 13]; // América do Sul (zoom 0 a 5), para a visão do continente
const MAXZ = 7;

/** Classes IGBP (cor original do GIBS) → paleta verde do Raiz; null = transparente. */
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
const PALETTE = new Map([
  ["33,138,33", hex("#a6d89a")],
  ["49,204,49", hex("#abda9f")],
  ["152,204,49", hex("#b2dda5")],
  ["150,250,150", hex("#b4dea7")],
  ["141,186,141", hex("#b0dca4")],
  ["186,141,141", hex("#e6f2dc")],
  ["245,222,179", hex("#f0f6ea")],
  ["218,235,157", hex("#bfe3b0")],
  ["255,213,0", hex("#c9e7b9")],
  ["240,185,103", hex("#d6edc6")],
  ["71,131,181", hex("#b2e0c2")],
  ["250,239,115", hex("#ddf0cd")],
  ["255,0,0", hex("#e3e7dc")],
  ["153,147,86", hex("#cfe9bf")],
  ["255,255,255", hex("#ffffff")],
  ["191,191,189", hex("#f1f5ec")],
]);

const lon2x = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
const lat2y = (lat, z) => Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url);
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    await sleep(1500 * (i + 1));
  }
  throw new Error("falha: " + url);
}

let n = 0;
for (let z = 0; z <= MAXZ; z++) {
  const box = z <= 5 ? WIDE : BBOX;
  const [x0, x1] = [lon2x(box[0], z), lon2x(box[2], z)];
  const [y0, y1] = [lat2y(box[3], z), lat2y(box[1], z)];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      if (fs.existsSync(path.join(OUT, String(z), String(x), `${y}.png`))) continue;
      const png = PNG.sync.read(await get(`${SRC}/${z}/${y}/${x}.png`));
      for (let i = 0; i < png.data.length; i += 4) {
        const key = `${png.data[i]},${png.data[i + 1]},${png.data[i + 2]}`;
        const c = png.data[i + 3] === 0 ? null : PALETTE.get(key);
        if (c) png.data.set(c, i);
        else png.data[i + 3] = 0; // água, sem dado ou classe desconhecida
      }
      const dir = path.join(OUT, String(z), String(x));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${y}.png`), PNG.sync.write(png));
      n++;
    }
  }
  console.log(`zoom ${z}: ${n} ladrilhos até agora`);
}
