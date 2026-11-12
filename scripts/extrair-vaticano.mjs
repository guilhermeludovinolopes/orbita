// Gera public/geo/vaticano.json: o contorno do Vaticano é o "buraco" do comune de Roma no mapa da Itália (ISTAT).
// O contorno do mapa-múndi (world-atlas 50m) fica uns 2 km a oeste do lugar certo; este casa com Roma.
// Rodar de novo quando o mapa da Itália mudar.
//
// Uso: node scripts/extrair-vaticano.mjs
import { readFileSync, writeFileSync } from "node:fs";

const lazio = JSON.parse(readFileSync("public/geo/it/municipios-IT-62.json", "utf-8"));
const roma = lazio.features.find((f) => Object.values(f.properties).includes("Roma"));
const poligonos = roma.geometry.type === "Polygon" ? [roma.geometry.coordinates] : roma.geometry.coordinates;
const dentro = ([x, y], anel) => {
  let d = false;
  for (let a = 0, b = anel.length - 1; a < anel.length; b = a++) {
    const [xa, ya] = anel[a], [xb, yb] = anel[b];
    if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) d = !d;
  }
  return d;
};
const SAO_PEDRO = [12.4534, 41.9022];
const buraco = poligonos.flatMap((p) => p.slice(1)).find((anel) => dentro(SAO_PEDRO, anel));
if (!buraco) throw new Error("Não achei o buraco do Vaticano no comune de Roma");
writeFileSync("public/geo/vaticano.json", JSON.stringify({ type: "Polygon", coordinates: [buraco] }));
console.log(`public/geo/vaticano.json (${buraco.length} pontos)`);
