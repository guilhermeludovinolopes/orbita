// Gera os mapas dos países europeus a partir da Eurostat (GISCO), que reúne os dados oficiais de cada país:
//   LAU 2023 (unidades administrativas locais = municípios, com o código nacional):
//     gisco-services.ec.europa.eu/distribution/v2/lau/geojson/LAU_RG_01M_2023_4326.geojson
//   NUTS 2024 (regiões; o código é hierárquico: FR101 fica em FR10, que fica em FR1):
//     gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_01M_2024_4326.geojson
// O 1º nível é uma camada NUTS (ou o 1º nível do geoBoundaries, onde as NUTS não seguem a divisão do país,
// como as voivodias da Polônia). O código ISO 3166-2 vem do 1º nível do geoBoundaries, por uma grade de pontos.
// Escócia, País de Gales e Irlanda do Norte: um "estado" só, com os councils como municípios.
//
//   public/geo/<pasta>/estados.json, condados-<estado>.json (onde há) e municipios-<estado>.json
//
// Uso: node scripts/gerar-europa.mjs <país> <lau.geojson> <nuts.geojson> <pasta com o ADM1 do geoBoundaries por ISO3>
import { forma, gravar, lerJson, pontoDentro, pontoInterno, unir } from "./geo-comum.mjs";

// estado: nível NUTS do 1º nível, ou "gb" (1º nível do geoBoundaries); condado: nível NUTS do meio, quando há
const PAISES = {
  DE: { nuts: "DE", iso3: "DEU", estado: 1, condado: 3 }, // estado (Land) → distrito (Kreis) → município
  FR: { nuts: "FR", iso3: "FRA", estado: 1, condado: 3, nomes: { FRY: "Outre-mer" } }, // região → departamento → comuna
  ES: {
    nuts: "ES", iso3: "ESP", estado: 2, condado: 3,
    iso: {
      ES11: "ES-GA", ES12: "ES-AS", ES13: "ES-CB", ES21: "ES-PV", ES22: "ES-NC", ES23: "ES-RI", ES24: "ES-AR", ES30: "ES-MD", ES41: "ES-CL",
      ES42: "ES-CM", ES43: "ES-EX", ES51: "ES-CT", ES52: "ES-VC", ES53: "ES-IB", ES61: "ES-AN", ES62: "ES-MC", ES63: "ES-CE", ES64: "ES-ML", ES70: "ES-CN",
    },
  }, // comunidade autônoma → província (ou ilha) → município
  BE: { nuts: "BE", iso3: "BEL", estado: 1, condado: 2, iso: { BE1: "BE-BRU", BE2: "BE-VLG", BE3: "BE-WAL" } }, // região → província → comuna
  // A LAU grega traz os nomes cortados em 16 letras: os 326 municípios (Kallikratis) vêm do geoBoundaries
  GR: {
    nuts: "EL", iso3: "GRC", estado: 2, condado: 3, municipiosGb: "GRC_ADM3",
    iso: {
      EL51: "GR-A", EL52: "GR-B", EL53: "GR-C", EL54: "GR-D", EL61: "GR-E", EL62: "GR-F", EL63: "GR-G", EL64: "GR-H", EL30: "GR-I",
      EL65: "GR-J", EL41: "GR-K", EL42: "GR-L", EL43: "GR-M",
    },
  }, // região → unidade regional → comunidade local
  NL: { nuts: "NL", iso3: "NLD", estado: 2 }, // província → município
  AT: { nuts: "AT", iso3: "AUT", estado: 2 }, // estado (Land) → município
  DK: { nuts: "DK", iso3: "DNK", estado: 2 }, // região → município
  CZ: { nuts: "CZ", iso3: "CZE", estado: 3 }, // região (kraj) → município
  SK: { nuts: "SK", iso3: "SVK", estado: 3 }, // região (kraj) → município
  HU: { nuts: "HU", iso3: "HUN", estado: 3, iso: { HU110: "HU-BU", HU120: "HU-PE" } }, // condado (megye) → município
  RO: { nuts: "RO", iso3: "ROU", estado: 3 }, // distrito (județ) → município
  BG: { nuts: "BG", iso3: "BGR", estado: 3 }, // província (oblast) → município
  HR: { nuts: "HR", iso3: "HRV", estado: 3 }, // condado (županija) → município
  SI: { nuts: "SI", iso3: "SVN", estado: 3 }, // região estatística → município
  SE: { nuts: "SE", iso3: "SWE", estado: 3 }, // condado (län) → município
  FI: { nuts: "FI", iso3: "FIN", estado: 3 }, // região (maakunta) → município
  NO: { nuts: "NO", iso3: "NOR", estado: 3, iso: { NO084: "NO-32", NO085: "NO-33", NO094: "NO-40", NO073: "NO-56" } }, // condados de 2024 // condado (fylke) → município
  IS: { nuts: "IS", iso3: "ISL", estado: 3 }, // região → município
  LT: { nuts: "LT", iso3: "LTU", estado: 3 }, // condado → município
  LV: { nuts: "LV", iso3: "LVA", estado: 3 }, // região → município
  MT: { nuts: "MT", iso3: "MLT", estado: 3 }, // ilha (Malta e Gozo) → conselho local
  AL: { nuts: "AL", iso3: "ALB", estado: 3 }, // condado (qark) → município
  MK: { nuts: "MK", iso3: "MKD", estado: 3 }, // região → município
  RS: { nuts: "RS", iso3: "SRB", estado: 3 }, // distrito → município ou cidade
  LI: { nuts: "LI", iso3: "LIE", estado: 0 }, // país → município
  // voivodia → município (gmina); o geoBoundaries traz os nomes em inglês
  PL: {
    nuts: "PL", iso3: "POL", estado: "gb",
    nomes: {
      "PL-DS": "Dolnośląskie", "PL-KP": "Kujawsko-pomorskie", "PL-LU": "Lubelskie", "PL-LB": "Lubuskie", "PL-LD": "Łódzkie",
      "PL-MA": "Małopolskie", "PL-MZ": "Mazowieckie", "PL-OP": "Opolskie", "PL-PK": "Podkarpackie", "PL-PD": "Podlaskie",
      "PL-PM": "Pomorskie", "PL-SL": "Śląskie", "PL-SK": "Świętokrzyskie", "PL-WN": "Warmińsko-mazurskie", "PL-WP": "Wielkopolskie",
      "PL-ZP": "Zachodniopomorskie",
    },
  },
  EE: { nuts: "EE", iso3: "EST", estado: "gb" }, // condado (maakond) → município
  CY: { nuts: "CY", iso3: "CYP", estado: "gb" }, // distrito → comunidade
  LU: { nuts: "LU", iso3: "LUX", estado: "gb" }, // cantão → comuna
  "GB-SCT": { nuts: "UK", nacao: "S", nome: "Scotland" }, // nação → council area
  "GB-WLS": { nuts: "UK", nacao: "W", nome: "Wales" }, // nação → principal area
  "GB-NIR": { nuts: "UK", nacao: "N", nome: "Northern Ireland" }, // nação → district
};

const [pais, arquivoLau, arquivoNuts, pastaIso] = process.argv.slice(2);
const cfg = PAISES[pais];
if (!cfg) throw new Error(`País sem configuração: ${pais}`);
const pasta = pais.toLowerCase();

// Ponto em polígono com caixa envolvente antes (a França tem 35 mil comunas)
const caixa = (g) => {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of g.type === "Polygon" ? [g.coordinates] : g.coordinates)
    for (const [x, y] of p[0]) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
  return [x0, y0, x1, y1];
};
const comCaixa = (fs) => fs.map((f) => ({ ...f, caixa: caixa(f.geometry) }));
const dentro = ([x, y], a) => x >= a.caixa[0] && x <= a.caixa[2] && y >= a.caixa[1] && y <= a.caixa[3] && pontoDentro([x, y], a.geometry);
const ondeCai = (f, areas) => {
  const p = pontoInterno(f.geometry);
  return areas.find((a) => dentro(p, a)) ?? areas.find((a) => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates).some((pol) => pol[0].some((v) => dentro(v, a))));
};

// Código ISO pelo 1º nível do geoBoundaries: uma grade de pontos dentro do estado vota
const areasIso = cfg.iso3 ? comCaixa(lerJson(`${pastaIso}/${cfg.iso3}.geojson`).features
  .map((f) => ({ ...f, properties: { ...f.properties, shapeISO: (f.properties.shapeISO ?? "").replace("_", "-") } }))) : [];
const isoUsados = new Set();
function isoDe(geometria, reserva) {
  const [x0, y0, x1, y1] = caixa(geometria);
  const votos = new Map();
  for (let i = 0.5; i < 12; i++) for (let j = 0.5; j < 12; j++) {
    const p = [x0 + ((x1 - x0) * i) / 12, y0 + ((y1 - y0) * j) / 12];
    if (!pontoDentro(p, geometria)) continue;
    const iso = areasIso.find((a) => dentro(p, a))?.properties.shapeISO;
    if (/^[A-Z]{2}-[A-Z0-9]+$/.test(iso ?? "")) votos.set(iso, (votos.get(iso) ?? 0) + 1);
  }
  const iso = [...votos].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!iso || isoUsados.has(iso)) return reserva;
  isoUsados.add(iso);
  return iso;
}

const lau = comCaixa(cfg.municipiosGb
  ? lerJson(`${pastaIso}/${cfg.municipiosGb}.geojson`).features.filter((f) => f.geometry)
    .map((f) => ({ ...f, properties: { GISCO_ID: `${cfg.nuts}_${f.properties.shapeID}`, LAU_NAME: f.properties.shapeName } }))
  : lerJson(arquivoLau).features.filter((f) => f.properties.CNTR_CODE === cfg.nuts && f.geometry
    && (!cfg.nacao || f.properties.LAU_ID.startsWith(cfg.nacao))));
const nuts = comCaixa(lerJson(arquivoNuts).features.filter((f) => f.properties.CNTR_CODE === cfg.nuts));
const nutsDoNivel = (n) => nuts.filter((f) => f.properties.LEVL_CODE === n);
const nomeNuts = (n) => n.properties.NAME_LATN.trim().replace(/ \([A-Z]{2}\)$/, ""); // "Limburg (NL)" → "Limburg"

// Cada município na sua NUTS3; os níveis de cima saem do prefixo do código
const nuts3 = cfg.nacao ? [] : nutsDoNivel(3);
const municipios = lau.map((f) => ({
  codigo: f.properties.GISCO_ID.slice(cfg.nuts.length + 1), // o LAU_ID vem cortado em alguns países; o GISCO_ID é único
  nome: f.properties.LAU_NAME,
  geometry: f.geometry,
  nuts3: cfg.nacao ? "" : (ondeCai(f, nuts3)?.properties.NUTS_ID ?? ""),
}));

// Estados: camada NUTS, 1º nível do geoBoundaries ou a nação inteira
let estados;
if (cfg.nacao) {
  estados = [{ codigo: pais, nome: cfg.nome, geometry: await unir(municipios.map((m) => m.geometry)), membros: municipios }];
} else if (cfg.estado === "gb") {
  const areas = areasIso;
  const porArea = new Map(areas.map((a) => [a, []]));
  for (const m of municipios) porArea.get(ondeCai(m, areas) ?? areas[0]).push(m);
  estados = [];
  let i = 0;
  for (const [a, membros] of porArea) {
    i++;
    if (!membros.length) continue;
    const iso = a.properties.shapeISO;
    const codigo = /^[A-Z]{2}-[A-Z0-9]+$/.test(iso) && !isoUsados.has(iso) ? iso : `${pais}-${String(i).padStart(2, "0")}`;
    isoUsados.add(codigo);
    estados.push({ codigo, nome: cfg.nomes?.[codigo] ?? a.properties.shapeName, geometry: await unir(membros.map((m) => m.geometry)), membros });
  }
} else {
  const nivel = nutsDoNivel(cfg.estado);
  estados = nivel.map((n) => ({
    // Tabela da configuração primeiro (onde o geoBoundaries não tem o ISO), depois a votação
    codigo: cfg.iso?.[n.properties.NUTS_ID] ?? isoDe(n.geometry, `${pais}-${n.properties.NUTS_ID}`),
    nome: cfg.nomes?.[n.properties.NUTS_ID] ?? nomeNuts(n),
    geometry: n.geometry,
    membros: municipios.filter((m) => cfg.estado === 0 || m.nuts3.startsWith(n.properties.NUTS_ID)),
  }));
}

let kb = 0, total = 0;
const semEstado = municipios.length - estados.reduce((s, e) => s + e.membros.length, 0);
const saida = [];
for (const e of estados) {
  if (!e.membros.length) continue; // NUTS sem municípios na LAU (regiões extrarregionais)
  if (cfg.condado) {
    const condados = nutsDoNivel(cfg.condado).filter((c) => e.membros.some((m) => m.nuts3.startsWith(c.properties.NUTS_ID)));
    kb += gravar(`public/geo/${pasta}/condados-${e.codigo}.json`, condados.map((c) =>
      forma(c.geometry, { codigo: c.properties.NUTS_ID, nome: nomeNuts(c), total: e.membros.filter((m) => m.nuts3.startsWith(c.properties.NUTS_ID)).length }, 3, 0.003)));
  }
  kb += gravar(`public/geo/${pasta}/municipios-${e.codigo}.json`, e.membros.map((m) =>
    forma(m.geometry, { codigo: m.codigo, nome: m.nome, ...(cfg.condado ? { condado: m.nuts3.slice(0, 2 + cfg.condado) } : {}) }, 4, 0.0005)));
  total += e.membros.length;
  saida.push(forma(e.geometry, { codigo: e.codigo, nome: e.nome, total: e.membros.length }, 3, 0.003));
}
kb += gravar(`public/geo/${pasta}/estados.json`, saida);
console.log(`${pais}: ${saida.length} estados, ${total} municípios (${semEstado} sem estado), ${kb.toFixed(0)} KB`);
console.log(saida.map((e) => `${e.properties.codigo} ${e.properties.nome} (${e.properties.total})`).join(" | "));
