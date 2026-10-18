// Gera os mapas da Irlanda a partir dos limites oficiais da Tailte Éireann (antiga OSi, CC BY 4.0):
// províncias e condados (generalizados 20 m) e prefeituras (local authorities, 2026), e da
// tabela ISO 3166-2:IE para os códigos de província e condado.
//   public/geo/ie/estados.json              as 4 províncias (IE-L)
//   public/geo/ie/condados-IE-L.json        condados de uma província (IE-D), com o total de prefeituras
//   public/geo/ie/municipios-IE-L.json      prefeituras (BDY_ID 265011 = Dublin City), com o condado
//
// Uso: node scripts/gerar-irlanda.mjs <ie-provincias.geojson> <ie-condados.geojson> <pasta ie-prefeituras> <iso-3166-2-ie.txt>
import { readdirSync, readFileSync } from "node:fs";
import { areaDaForma, codigosIso, forma, gravar, lerJson, normalizar, pontoInterno } from "./geo-comum.mjs";

const [arqProvincias, arqCondados, pastaPrefeituras, isoWiki] = process.argv.slice(2);
const iso = codigosIso(readFileSync(isoWiki, "utf8"), "IE");
const codigoIso = (nome) => {
  const c = iso[normalizar(nome)];
  if (!c) throw new Error(`Sem código ISO para ${nome}`);
  return c;
};
// "DUBLIN CITY COUNCIL" -> "Dublin City"; "DUN LAOGHAIRE-RATHDOWN COUNTY COUNCIL" -> "Dun Laoghaire-Rathdown County"
const nomeDaPrefeitura = (t) =>
  t.replace(/ COUNCIL$/, "").toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, s, l) => s + l.toUpperCase()).replace(/ And /g, " and ");
const titulo = (t) => t.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, s, l) => s + l.toUpperCase());

const provincias = lerJson(arqProvincias).features;
const condados = lerJson(arqCondados).features;

// As prefeituras vêm em milhares de pedaços: junta por código numa forma de várias partes
const partes = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
const prefeituras = new Map();
for (const arq of readdirSync(pastaPrefeituras)) {
  for (const f of lerJson(`${pastaPrefeituras}/${arq}`).features) {
    if (!f.geometry) continue;
    const p = prefeituras.get(f.properties.BDY_ID) ?? { nome: nomeDaPrefeitura(f.properties.ENG_NAME_VALUE), coords: [] };
    p.coords.push(...partes(f.geometry));
    prefeituras.set(f.properties.BDY_ID, p);
  }
}

const porProvincia = new Map(provincias.map((p) => [codigoIso(p.properties.PROVINCE), { provincia: p, condados: [], prefeituras: [] }]));
const condadoDe = new Map(); // código do condado -> código da província
for (const c of condados) {
  const prov = codigoIso(c.properties.PROVINCE);
  condadoDe.set(codigoIso(c.properties.COUNTY), prov);
}

const totalPorCondado = new Map();
for (const [codigo, p] of prefeituras) {
  // Ordena as partes pela maior, para o ponto de referência cair na parte principal
  const geometria = { type: "MultiPolygon", coordinates: p.coords.sort((a, b) => b[0].length - a[0].length) };
  const condado = areaDaForma(geometria, condados, [pontoInterno(geometria)]);
  if (!condado) throw new Error(`Prefeitura sem condado: ${p.nome}`);
  const codigoCondado = codigoIso(condado.properties.COUNTY);
  totalPorCondado.set(codigoCondado, (totalPorCondado.get(codigoCondado) ?? 0) + 1);
  porProvincia.get(condadoDe.get(codigoCondado)).prefeituras.push(forma(geometria, { codigo: String(codigo), nome: p.nome, condado: codigoCondado }, 4, 0.0008));
}
for (const c of condados) {
  const codigo = codigoIso(c.properties.COUNTY);
  porProvincia.get(condadoDe.get(codigo)).condados.push(forma(c.geometry, { codigo, nome: `County ${titulo(c.properties.COUNTY)}`, total: totalPorCondado.get(codigo) ?? 0 }, 4, 0.0015));
}

let kb = 0;
const estados = [];
for (const [codigo, { provincia, condados: lista, prefeituras: pref }] of porProvincia) {
  kb += gravar(`public/geo/ie/condados-${codigo}.json`, lista);
  kb += gravar(`public/geo/ie/municipios-${codigo}.json`, pref);
  estados.push(forma(provincia.geometry, { codigo, nome: titulo(provincia.properties.PROVINCE), total: pref.length }, 4, 0.002));
}
kb += gravar("public/geo/ie/estados.json", estados);
console.log(`Irlanda: ${estados.length} províncias, ${condados.length} condados, ${prefeituras.size} prefeituras, ${kb.toFixed(0)} KB`);
console.log(estados.map((e) => `${e.properties.codigo} ${e.properties.nome} (${e.properties.total})`).join(" | "));
