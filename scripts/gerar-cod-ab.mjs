// Gera os mapas dos países cujos limites oficiais vêm pelo COD-AB da ONU (OCHA), que republica os dados
// do órgão nacional com os códigos dele. Baixados do espelho FieldMaps (data.fieldmaps.io/cod.json,
// campo o_geojson: <iso3>_adm1.geojson, <iso3>_adm2.geojson...). O P-code é o código nacional com o
// prefixo do país (PE030101 → ubigeo 030101 do INEI).
//
//   public/geo/<pasta>/estados.json                1º nível (código ISO 3166-2), com o total de municípios
//   public/geo/<pasta>/condados-<estado>.json      nível intermediário, só onde existe (províncias do Peru)
//   public/geo/<pasta>/municipios-<estado>.json    municípios, com o condado quando houver
//
// Uso: node scripts/gerar-cod-ab.mjs <PE|EC|CO|VE> <pasta com os <iso3>_admN.geojson>
import { forma, gravar, lerJson } from "./geo-comum.mjs";

const PAISES = {
  // Peru (IGN/INEI): departamento → província → distrito
  PE: {
    iso3: "per", pasta: "pe", nivelMunicipio: 3, comCondados: true,
    iso: {
      "01": "PE-AMA", "02": "PE-ANC", "03": "PE-APU", "04": "PE-ARE", "05": "PE-AYA", "06": "PE-CAJ", "07": "PE-CAL", "08": "PE-CUS",
      "09": "PE-HUV", "10": "PE-HUC", "11": "PE-ICA", "12": "PE-JUN", "13": "PE-LAL", "14": "PE-LAM", "15": "PE-LIM", "16": "PE-LOR",
      "17": "PE-MDD", "18": "PE-MOQ", "19": "PE-PAS", "20": "PE-PIU", "21": "PE-PUN", "22": "PE-SAM", "23": "PE-TAC", "24": "PE-TUM", "25": "PE-UCA",
    },
    // A base vem sem acentos em alguns nomes de departamento
    nomes: { "03": "Apurímac", "10": "Huánuco", "12": "Junín", "22": "San Martín", "17": "Madre de Dios" },
  },
  // Equador (INEC): província → cantão
  EC: {
    iso3: "ecu", pasta: "ec", nivelMunicipio: 2, comCondados: false,
    iso: {
      "01": "EC-A", "02": "EC-B", "03": "EC-F", "04": "EC-C", "05": "EC-X", "06": "EC-H", "07": "EC-O", "08": "EC-E", "09": "EC-G", "10": "EC-I",
      "11": "EC-L", "12": "EC-R", "13": "EC-M", "14": "EC-S", "15": "EC-N", "16": "EC-Y", "17": "EC-P", "18": "EC-T", "19": "EC-Z", "20": "EC-W",
      "21": "EC-U", "22": "EC-D", "23": "EC-SD", "24": "EC-SE",
    },
  },
  // Colômbia (DANE): departamento → município (inclui as áreas não municipalizadas da Amazônia)
  CO: {
    iso3: "col", pasta: "co", nivelMunicipio: 2, comCondados: false,
    iso: {
      "05": "CO-ANT", "08": "CO-ATL", "11": "CO-DC", "13": "CO-BOL", "15": "CO-BOY", "17": "CO-CAL", "18": "CO-CAQ", "19": "CO-CAU", "20": "CO-CES",
      "23": "CO-COR", "25": "CO-CUN", "27": "CO-CHO", "41": "CO-HUI", "44": "CO-LAG", "47": "CO-MAG", "50": "CO-MET", "52": "CO-NAR", "54": "CO-NSA",
      "63": "CO-QUI", "66": "CO-RIS", "68": "CO-SAN", "70": "CO-SUC", "73": "CO-TOL", "76": "CO-VAC", "81": "CO-ARA", "85": "CO-CAS", "86": "CO-PUT",
      "88": "CO-SAP", "91": "CO-AMA", "94": "CO-GUA", "95": "CO-GUV", "97": "CO-VAU", "99": "CO-VID",
    },
    nomes: { "63": "Quindío" },
  },
  // Venezuela (INE): estado → município
  VE: {
    iso3: "ven", pasta: "ve", nivelMunicipio: 2, comCondados: false,
    iso: {
      "01": "VE-A", "02": "VE-Z", "03": "VE-B", "04": "VE-C", "05": "VE-D", "06": "VE-E", "07": "VE-F", "08": "VE-G", "09": "VE-H", "10": "VE-Y",
      "11": "VE-I", "12": "VE-J", "13": "VE-K", "14": "VE-L", "15": "VE-M", "16": "VE-N", "17": "VE-O", "18": "VE-P", "19": "VE-R", "20": "VE-S",
      "21": "VE-T", "22": "VE-U", "23": "VE-V", "24": "VE-X",
    },
  },
};

const [pais, origem] = process.argv.slice(2);
const cfg = PAISES[pais];
if (!cfg) throw new Error(`País sem configuração: ${pais}`);

const ler = (nivel) => lerJson(`${origem}/${cfg.iso3}_adm${nivel}.geojson`).features;
const codigo = (f, nivel) => f.properties[`ADM${nivel}_PCODE`].slice(2); // sem o prefixo do país
const nome = (f, nivel) => f.properties[`ADM${nivel}_ES`];

const estados = ler(1);
const condados = cfg.comCondados ? ler(2) : [];
const municipios = ler(cfg.nivelMunicipio);

let kb = 0;
const saida = [];
for (const e of estados) {
  const num = codigo(e, 1);
  const iso = cfg.iso[num];
  if (!iso) throw new Error(`Sem código ISO para ${nome(e, 1)} (${num})`);
  const doEstado = municipios.filter((m) => m.properties.ADM1_PCODE === e.properties.ADM1_PCODE);

  if (cfg.comCondados) {
    const porCondado = new Map();
    for (const m of doEstado) porCondado.set(codigo(m, 2), (porCondado.get(codigo(m, 2)) ?? 0) + 1);
    kb += gravar(`public/geo/${cfg.pasta}/condados-${iso}.json`, condados
      .filter((c) => c.properties.ADM1_PCODE === e.properties.ADM1_PCODE)
      .map((c) => forma(c.geometry, { codigo: codigo(c, 2), nome: nome(c, 2), total: porCondado.get(codigo(c, 2)) ?? 0 }, 3, 0.003)));
  }
  kb += gravar(`public/geo/${cfg.pasta}/municipios-${iso}.json`, doEstado.map((m) =>
    forma(m.geometry, {
      codigo: codigo(m, cfg.nivelMunicipio),
      nome: nome(m, cfg.nivelMunicipio),
      ...(cfg.comCondados ? { condado: codigo(m, 2) } : {}),
    }, 3, 0.001)));
  saida.push(forma(e.geometry, { codigo: iso, nome: cfg.nomes?.[num] ?? nome(e, 1), total: doEstado.length }, 3, 0.004));
}
kb += gravar(`public/geo/${cfg.pasta}/estados.json`, saida);
console.log(`${pais}: ${saida.length} estados, ${condados.length} condados, ${municipios.length} municípios, ${kb.toFixed(0)} KB`);
console.log(saida.map((e) => `${e.properties.codigo} ${e.properties.nome} (${e.properties.total})`).join(" | "));
