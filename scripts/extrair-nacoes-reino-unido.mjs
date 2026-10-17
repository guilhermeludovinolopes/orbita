// Extrai Inglaterra, Escócia, País de Gales e Irlanda do Norte do arquivo
// ne_50m_admin_0_map_units.geojson da Natural Earth (domínio público) e grava
// só essas 4 formas em public/geo/reino-unido.json.
//
// Uso: node scripts/extrair-nacoes-reino-unido.mjs <caminho do ne_50m_admin_0_map_units.geojson>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const NACOES = {
  ENG: { codigo: "GB-ENG", nome: "Inglaterra" },
  SCT: { codigo: "GB-SCT", nome: "Escócia" },
  WLS: { codigo: "GB-WLS", nome: "País de Gales" },
  NIR: { codigo: "GB-NIR", nome: "Irlanda do Norte" },
};

// Coordenadas com 4 casas decimais (~10 m) bastam para o globo e deixam o arquivo leve
const arredondar = (c) => (typeof c[0] === "number" ? c.map((n) => Math.round(n * 1e4) / 1e4) : c.map(arredondar));

const origem = JSON.parse(readFileSync(process.argv[2], "utf8"));
const features = origem.features
  .filter((f) => f.properties.ADM0_A3 === "GBR" && NACOES[f.properties.GU_A3])
  .map((f) => ({
    type: "Feature",
    properties: NACOES[f.properties.GU_A3],
    geometry: { type: f.geometry.type, coordinates: arredondar(f.geometry.coordinates) },
  }));

if (features.length !== 4) throw new Error(`Esperava 4 nações, achei ${features.length}`);

mkdirSync("public/geo", { recursive: true });
writeFileSync("public/geo/reino-unido.json", JSON.stringify({ type: "FeatureCollection", features }));
console.log("Nações:", features.map((f) => f.properties.nome).join(", "));
