// O MapLibre processa o mapa num "worker" separado, que o bundler do Next não empacota.
// Copiamos os arquivos dele para public/ antes do dev e do build (ver package.json).
import { cpSync, mkdirSync } from "node:fs";

const origem = "node_modules/maplibre-gl/dist";
const destino = "public/maplibre";

mkdirSync(destino, { recursive: true });
for (const arquivo of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  cpSync(`${origem}/${arquivo}`, `${destino}/${arquivo}`);
}
