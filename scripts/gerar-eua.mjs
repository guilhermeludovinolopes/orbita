// Gera os mapas dos EUA a partir dos arquivos cartográficos do Census Bureau (domínio público):
//   cb_2024_us_state_20m, cb_2024_us_county_5m e cb_2024_us_place_500k
// e do gazetteer 2024 de cidades (para o ponto interno e o tipo de cada cidade).
//
//   public/geo/us/estados.json             estados (US-CA), com o total de cidades
//   public/geo/us/condados-US-CA.json      condados de um estado (FIPS 06037), com o total de cidades
//   public/geo/us/municipios-US-CA.json    cidades oficiais de um estado (GEOID 0644000), com o condado
//
// Só entram as cidades com governo próprio; as áreas só estatísticas (CDP) ficam de fora.
//
// Uso: node scripts/gerar-eua.mjs <pasta dos mapas> <arquivo 2024_Gaz_place_national.txt>
import { readFileSync } from "node:fs";
import { areaDaForma, forma, gravar, lerShapefile } from "./geo-comum.mjs";

const [pasta, gazetteer] = process.argv.slice(2);
const SEM_DETALHE = new Set(["PR", "AS", "GU", "MP", "VI"]); // territórios: aparecem como países no globo

// Gazetteer: tipo (FUNCSTAT: S = só estatística) e ponto interno de cada cidade
const linhas = readFileSync(gazetteer, "latin1").split(/\r?\n/).map((l) => l.split("\t").map((c) => c.trim()));
const cab = linhas[0];
const col = (nome) => cab.indexOf(nome);
const gaz = new Map(
  linhas.slice(1).filter((l) => l.length > 3).map((l) => [l[col("GEOID")], { tipo: l[col("FUNCSTAT")], ponto: [Number(l[col("INTPTLONG")]), Number(l[col("INTPTLAT")])] }]),
);

const estados = (await lerShapefile(`${pasta}/us-estados/cb_2024_us_state_20m`)).filter((f) => !SEM_DETALHE.has(f.properties.STUSPS));
const condados = await lerShapefile(`${pasta}/us-condados/cb_2024_us_county_5m`);
const cidades = (await lerShapefile(`${pasta}/us-cidades/cb_2024_us_place_500k`)).filter((f) => gaz.get(f.properties.GEOID)?.tipo !== "S");

let kb = 0, semCondado = 0, totalCidades = 0;
const saidaEstados = [];
for (const e of estados) {
  const uf = e.properties.STUSPS;
  const codigoEstado = `US-${uf}`;
  const condadosDoEstado = condados.filter((c) => c.properties.STUSPS === uf);
  const cidadesDoEstado = cidades.filter((c) => c.properties.STUSPS === uf);

  const porCondado = new Map();
  const municipios = cidadesDoEstado.map((c) => {
    const ponto = gaz.get(c.properties.GEOID)?.ponto;
    const condado = areaDaForma(c.geometry, condadosDoEstado, ponto ? [ponto] : [])?.properties.GEOID ?? "";
    if (!condado) semCondado++;
    porCondado.set(condado, (porCondado.get(condado) ?? 0) + 1);
    return forma(c.geometry, { codigo: c.properties.GEOID, nome: c.properties.NAME, condado }, 3, 0.0015);
  });
  totalCidades += municipios.length;

  kb += gravar(`public/geo/us/condados-${codigoEstado}.json`, condadosDoEstado.map((c) =>
    forma(c.geometry, { codigo: c.properties.GEOID, nome: c.properties.NAMELSAD, total: porCondado.get(c.properties.GEOID) ?? 0 }, 3, 0.004)));
  kb += gravar(`public/geo/us/municipios-${codigoEstado}.json`, municipios);
  saidaEstados.push(forma(e.geometry, { codigo: codigoEstado, nome: e.properties.NAME, total: municipios.length }));
}
kb += gravar("public/geo/us/estados.json", saidaEstados);
console.log(`EUA: ${saidaEstados.length} estados, ${condados.length} condados, ${totalCidades} cidades (${semCondado} sem condado), ${kb.toFixed(0)} KB`);
