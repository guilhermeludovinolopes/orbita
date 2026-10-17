// Gera public/geo/lagos.json e public/geo/rios.json a partir dos arquivos da Natural Earth
// (domínio público) ne_50m_lakes.geojson e ne_50m_rivers_lake_centerlines.geojson.
// Guarda só a geometria e o "scalerank" (importância: 0 = maior), com coordenadas arredondadas.
//
// Uso: node scripts/gerar-aguas.mjs <pasta com os dois .geojson>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const arredondar = (c) => (typeof c[0] === "number" ? c.map((n) => Math.round(n * 1e3) / 1e3) : c.map(arredondar));

function enxugar(arquivo, destino) {
  const origem = JSON.parse(readFileSync(join(process.argv[2], arquivo), "utf8"));
  const features = origem.features
    .filter((f) => f.geometry)
    .map((f) => ({
      type: "Feature",
      properties: { importancia: f.properties.scalerank ?? 9 },
      geometry: { type: f.geometry.type, coordinates: arredondar(f.geometry.coordinates) },
    }));
  const json = JSON.stringify({ type: "FeatureCollection", features });
  writeFileSync(destino, json);
  console.log(`${destino}: ${features.length} formas, ${(json.length / 1024).toFixed(0)} KB`);
}

mkdirSync("public/geo", { recursive: true });
enxugar("ne_50m_lakes.geojson", "public/geo/lagos.json");
enxugar("ne_50m_rivers_lake_centerlines.geojson", "public/geo/rios.json");
