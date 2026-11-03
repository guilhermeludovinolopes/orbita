// Gera os mapas dos países sem base da ONU (COD-AB) a partir do geoBoundaries (gbOpen, licenças abertas):
// www.geoboundaries.org/api/current/gbOpen/<ISO3>/<ADMn>/ → gjDownloadURL, gravado como <ISO3>_<ADMn>.geojson.
// O geoBoundaries não liga um nível ao outro, então cada área entra no estado (ou condado) onde cai
// um ponto interno dela. Os códigos são o shapeISO do 1º nível (ISO 3166-2) e o shapeID do geoBoundaries
// nos outros níveis (não são os códigos nacionais).
//
//   public/geo/<pasta>/estados.json, condados-<estado>.json (com 3 níveis) e municipios-<estado>.json
//
// Uso: node scripts/gerar-geoboundaries.mjs <sigla do país em PAISES> <pasta com os <ISO3>_<ADMn>.geojson>
import { areaDaForma, forma, gravar, lerJson, paraLeste, pontoInterno } from "./geo-comum.mjs";

const PAISES = {
  KR: { iso3: "KOR", pasta: "kr", niveis: ["ADM1", "ADM2"] }, // província ou cidade metropolitana → si/gun/gu
  IN: { iso3: "IND", pasta: "in", niveis: ["ADM1", "ADM2", "ADM3"] }, // estado → distrito → subdistrito (tehsil)
  IL: { iso3: "ISR", pasta: "il", niveis: ["ADM1", "ADM2"] }, // distrito → subdistrito
  JO: { iso3: "JOR", pasta: "jo", niveis: ["ADM1", "ADM2"] }, // província → distrito
  TJ: { iso3: "TJK", pasta: "tj", niveis: ["ADM1", "ADM2"] }, // região → distrito
  TM: { iso3: "TKM", pasta: "tm", niveis: ["ADM1", "ADM2"] }, // província → distrito
  SG: { iso3: "SGP", pasta: "sg", niveis: ["ADM1", "ADM2"], titulo: true }, // região → área de planejamento
  BN: { iso3: "BRN", pasta: "bn", niveis: ["ADM1", "ADM2"] }, // distrito → mukim
  SA: { iso3: "SAU", pasta: "sa", niveis: ["ADM1", "ADM2"] }, // província → governadoria
  AZ: { iso3: "AZE", pasta: "az", niveis: ["ADM1", "ADM2"] }, // Azerbaijão e Naquichevão → distrito (rayon)
  GE: { iso3: "GEO", pasta: "ge", niveis: ["ADM1", "ADM2"] }, // região → município
  KW: { iso3: "KWT", pasta: "kw", niveis: ["ADM1", "ADM2"] }, // governadoria → área
  // sujeito federal → distrito (raion) ou cidade; o Ártico pesa: simplifica 4× mais e tira as ilhotas
  RU: { iso3: "RUS", pasta: "ru", niveis: ["ADM1", "ADM2"], simplificar: 4, ilhotas: 0.01 },
  BA: { iso3: "BIH", pasta: "ba", niveis: ["ADM1", "ADM2", "ADM3"] }, // entidade → cantão ou região → município
  // Países sem 1º nível acima do município: o país inteiro é o "estado"
  ME: { iso3: "MNE", pasta: "me", niveis: ["ADM0", "ADM1"] }, // município
  MD: { iso3: "MDA", pasta: "md", niveis: ["ADM0", "ADM1"] }, // distrito (raion) ou município
  AD: { iso3: "AND", pasta: "ad", niveis: ["ADM0", "ADM1"] }, // paróquia
  SM: { iso3: "SMR", pasta: "sm", niveis: ["ADM0", "ADM1"] }, // castello
  MU: { iso3: "MUS", pasta: "mu", niveis: ["ADM0", "ADM1"] }, // distrito
  // Oceania
  AU: { iso3: "AUS", pasta: "au", niveis: ["ADM1", "ADM2"] }, // estado ou território → área de governo local (ABS)
  NZ: { iso3: "NZL", pasta: "nz", niveis: ["ADM1", "ADM2"], leste: true, limpar: / Region$/ }, // região → autoridade territorial (Stats NZ)
  WS: { iso3: "WSM", pasta: "ws", niveis: ["ADM1", "ADM2"] }, // distrito → distrito eleitoral
  TV: { iso3: "TUV", pasta: "tv", niveis: ["ADM1", "ADM2"] }, // ilha → aldeia
  PW: { iso3: "PLW", pasta: "pw", niveis: ["ADM0", "ADM1"] }, // estado
  NR: { iso3: "NRU", pasta: "nr", niveis: ["ADM0", "ADM1"] }, // distrito
};

const [pais, origem] = process.argv.slice(2);
const cfg = PAISES[pais];
if (!cfg) throw new Error(`País sem configuração: ${pais}`);

// Nomes todos em maiúsculas (Singapura): "CENTRAL REGION" → "Central Region"
const emTitulo = (t) => t.toLowerCase().replace(/(^|[\s(-])(\p{L})/gu, (_, a, l) => a + l.toUpperCase());
// Ilhotas abaixo de uma área mínima (graus²) saem, onde a configuração pede
const areaAnel = (r) => Math.abs(r.reduce((t, [x1, y1], i) => { const [x2, y2] = r[(i + 1) % r.length]; return t + x1 * y2 - x2 * y1; }, 0)) / 2;
const semIlhotas = (g) => {
  if (!cfg.ilhotas) return g;
  const partes = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  const grandes = partes.filter((p) => areaAnel(p[0]) >= cfg.ilhotas);
  return { type: "MultiPolygon", coordinates: grandes.length ? grandes : [partes.reduce((a, b) => (areaAnel(b[0]) > areaAnel(a[0]) ? b : a))] };
};
const fator = cfg.simplificar ?? 1;
const ler = (nivel) => lerJson(`${origem}/${cfg.iso3}_${nivel}.geojson`).features
  .filter((f) => f.geometry && f.properties.shapeName) // sem nome não dá para achar nem marcar (12 distritos do Turcomenistão)
  .map((f) => (cfg.leste ? { ...f, geometry: paraLeste(f.geometry) } : f))
  .map((f) => (cfg.titulo ? { ...f, properties: { ...f.properties, shapeName: emTitulo(f.properties.shapeName) } } : f))
  .map((f) => (cfg.limpar ? { ...f, properties: { ...f.properties, shapeName: f.properties.shapeName.replace(cfg.limpar, "") } } : f));
const [nivelEstado, ...resto] = cfg.niveis;
const comCondados = resto.length === 2;
const estados = ler(nivelEstado);
const condados = comCondados ? ler(resto[0]) : [];
const municipios = ler(resto.at(-1));

// Cada área no seu "pai": o estado (ou condado) onde cai um ponto interno dela
const dentroDe = (filhos, pais) => {
  const mapa = new Map(pais.map((p) => [p, []]));
  let soltos = 0;
  for (const f of filhos) {
    const pai = areaDaForma(f.geometry, pais, [pontoInterno(f.geometry)]);
    if (pai) mapa.get(pai).push(f);
    else soltos++;
  }
  return [mapa, soltos];
};

const isoUsados = new Set();
const codigoEstado = (e, i) => {
  const iso = e.properties.shapeISO;
  const valido = /^[A-Z]{2}-[A-Z0-9]+$/.test(iso ?? "") && !isoUsados.has(iso);
  if (valido) isoUsados.add(iso);
  return valido ? iso : `${pais}-${String(i + 1).padStart(2, "0")}`;
};

const [porEstado, semEstado] = dentroDe(comCondados ? condados : municipios, estados);
const [porCondado, semCondado] = comCondados ? dentroDe(municipios, condados) : [new Map(), 0];

let kb = 0, total = 0;
const saida = [];
estados.forEach((e, i) => {
  const codigo = codigoEstado(e, i);
  let doEstado;
  if (comCondados) {
    const seus = porEstado.get(e);
    doEstado = seus.flatMap((c) => porCondado.get(c).map((m) => ({ m, condado: c.properties.shapeID })));
    kb += gravar(`public/geo/${cfg.pasta}/condados-${codigo}.json`, seus.map((c) =>
      forma(semIlhotas(c.geometry), { codigo: c.properties.shapeID, nome: c.properties.shapeName, total: porCondado.get(c).length }, 3, 0.003 * fator)));
  } else doEstado = porEstado.get(e).map((m) => ({ m }));
  // Estado sem nenhuma área dentro (cidades-capitais como Dushanbe): ele mesmo é o único município
  if (!doEstado.length && !comCondados) doEstado = [{ m: e }];
  kb += gravar(`public/geo/${cfg.pasta}/municipios-${codigo}.json`, doEstado.map(({ m, condado }) =>
    forma(semIlhotas(m.geometry), { codigo: m.properties.shapeID, nome: m.properties.shapeName, ...(condado ? { condado } : {}) }, 3, 0.001 * fator)));
  total += doEstado.length;
  saida.push(forma(semIlhotas(e.geometry), { codigo, nome: e.properties.shapeName, total: doEstado.length }, 3, 0.004 * fator));
});
kb += gravar(`public/geo/${cfg.pasta}/estados.json`, saida);
console.log(`${pais}: ${saida.length} estados, ${condados.length} condados, ${total} municípios (${semEstado + semCondado} fora de qualquer área), ${kb.toFixed(0)} KB`);
console.log(saida.map((e) => `${e.properties.codigo} ${e.properties.nome} (${e.properties.total})`).join(" | "));
