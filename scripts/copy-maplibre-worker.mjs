/**
 * Copia os arquivos do worker do MapLibre (v6, módulos ESM) para public/maplibre. O empacotador do
 * Next não resolve o worker sozinho; o MapView aponta para esta cópia com setWorkerUrl.
 * Roda antes do build e do dev (scripts "predev" e "prebuild").
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const from = path.join(ROOT, "node_modules", "maplibre-gl", "dist");
const to = path.join(ROOT, "public", "maplibre");
fs.mkdirSync(to, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) fs.copyFileSync(path.join(from, f), path.join(to, f));
console.log("worker do MapLibre copiado para public/maplibre");
