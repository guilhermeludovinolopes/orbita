// Gera os mapas da Inglaterra a partir do ONS (Open Government Licence v3.0):
// Regions December 2023 (BGC) e Local Authority Districts December 2024 (BGC).
//   public/geo/gb-eng/estados.json               as 9 regiões (E12000007 = London)
//   public/geo/gb-eng/municipios-E12000007.json  distritos de uma região (LAD24CD)
//
// Decisão do Guilherme: Londres é um lugar só (os 33 distritos juntos), então a região
// London tem um único "município", com o mesmo código e forma da região.
//
// Uso: node scripts/gerar-inglaterra.mjs <eng-regioes.geojson> <uk-distritos.geojson>
import { areaDaForma, forma, gravar, lerJson } from "./geo-comum.mjs";

const [arqRegioes, arqDistritos] = process.argv.slice(2);
const LONDRES = "E12000007";
const regioes = lerJson(arqRegioes).features;
const distritos = lerJson(arqDistritos).features.filter((d) => d.properties.LAD24CD.startsWith("E"));

const porRegiao = new Map(regioes.map((r) => [r.properties.RGN23CD, []]));
for (const d of distritos) {
  const regiao = areaDaForma(d.geometry, regioes, [[d.properties.LONG, d.properties.LAT]])?.properties.RGN23CD;
  if (regiao && regiao !== LONDRES) porRegiao.get(regiao).push(forma(d.geometry, { codigo: d.properties.LAD24CD, nome: d.properties.LAD24NM }, 4, 0.0008));
}
const londres = regioes.find((r) => r.properties.RGN23CD === LONDRES);
porRegiao.set(LONDRES, [forma(londres.geometry, { codigo: LONDRES, nome: "London" }, 4, 0.0008)]);

let kb = 0;
const estados = regioes.map((r) => {
  const lista = porRegiao.get(r.properties.RGN23CD);
  kb += gravar(`public/geo/gb-eng/municipios-${r.properties.RGN23CD}.json`, lista);
  return forma(r.geometry, { codigo: r.properties.RGN23CD, nome: r.properties.RGN23NM, total: lista.length }, 4, 0.0015);
});
kb += gravar("public/geo/gb-eng/estados.json", estados);
console.log(`Inglaterra: ${estados.length} regiões, ${estados.reduce((s, e) => s + e.properties.total, 0)} distritos (Londres como 1), ${kb.toFixed(0)} KB`);
