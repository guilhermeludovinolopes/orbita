// Gera os mapas dos países cujos limites oficiais vêm pelo COD-AB da ONU (OCHA), que republica os dados
// do órgão nacional com os códigos dele. Baixados do espelho FieldMaps (data.fieldmaps.io/cod.json,
// campo o_geojson: <iso3>_adm1.geojson, <iso3>_adm2.geojson...). O P-code é o código nacional com o
// prefixo do país (PE030101 → ubigeo 030101 do INEI).
//
//   public/geo/<pasta>/estados.json                1º nível (código ISO 3166-2), com o total de municípios
//   public/geo/<pasta>/condados-<estado>.json      nível intermediário, só onde existe (províncias do Peru)
//   public/geo/<pasta>/municipios-<estado>.json    municípios, com o condado quando houver
//
// Uso: node scripts/gerar-cod-ab.mjs <sigla do país em PAISES> <pasta com os <iso3>_admN.geojson> [ADM1 do geoBoundaries, para o ISO]
import { areaDaForma, areaDoPonto, forma, gravar, lerJson, normalizar, pontoDentro, pontoInterno } from "./geo-comum.mjs";

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
  // Suriname (base da ONU a partir do GADM, sem fonte nacional aberta): distrito → ressort
  SR: {
    iso3: "sur", pasta: "sr", nivelMunicipio: 2, comCondados: false, idioma: "NL",
    iso: { "01": "SR-BR", "02": "SR-CM", "03": "SR-CR", "04": "SR-MA", "05": "SR-NI", "06": "SR-PR", "07": "SR-PM", "08": "SR-SA", "09": "SR-SI", "10": "SR-WA" },
  },
  // México (INEGI): estado → município
  MX: {
    iso3: "mex", pasta: "mx", nivelMunicipio: 2, comCondados: false,
    iso: Object.fromEntries("AGU BCN BCS CAM COA COL CHP CHH CMX DUR GUA GRO HID JAL MEX MIC MOR NAY NLE OAX PUE QUE ROO SLP SIN SON TAB TAM TLA VER YUC ZAC"
      .split(" ").map((c, i) => [String(i + 1).padStart(2, "0"), `MX-${c}`])),
    nomes: { "09": "Ciudad de México" }, // a base ainda usa "Distrito Federal"
  },
  // Guatemala (CONRED, códigos do INE): departamento → município
  GT: {
    iso3: "gtm", pasta: "gt", nivelMunicipio: 2, comCondados: false,
    iso: Object.fromEntries(Array.from({ length: 22 }, (_, i) => { const n = String(i + 1).padStart(2, "0"); return [n, `GT-${n}`]; })),
  },
  // Honduras (SINIT, 2010): departamento → município
  HN: {
    iso3: "hnd", pasta: "hn", nivelMunicipio: 2, comCondados: false,
    isoPorNome: {
      atlantida: ["HN-AT", "Atlántida"], colon: ["HN-CL", "Colón"], comayagua: ["HN-CM"], copan: ["HN-CP", "Copán"], cortes: ["HN-CR", "Cortés"],
      choluteca: ["HN-CH"], elparaiso: ["HN-EP", "El Paraíso"], franciscomorazan: ["HN-FM", "Francisco Morazán"], graciasadios: ["HN-GD"],
      intibuca: ["HN-IN", "Intibucá"], islasdelabahia: ["HN-IB", "Islas de la Bahía"], lapaz: ["HN-LP"], lempira: ["HN-LE"], ocotepeque: ["HN-OC"],
      olancho: ["HN-OL"], santabarbara: ["HN-SB", "Santa Bárbara"], valle: ["HN-VA"], yoro: ["HN-YO"],
    },
  },
  // El Salvador (reforma de 2024): departamento → município (44) → distrito (os 262 municípios antigos)
  SV: {
    iso3: "slv", pasta: "sv", nivelCondado: 2, nivelMunicipio: 3, comCondados: true, excluir: /^SV\d{2}(999|998|899)/, // lagos e a represa Cerrón Grande
    isoPorNome: {
      ahuachapan: ["SV-AH"], cabanas: ["SV-CA"], chalatenango: ["SV-CH"], cuscatlan: ["SV-CU"], lalibertad: ["SV-LI"], lapaz: ["SV-PA"],
      launion: ["SV-UN"], morazan: ["SV-MO"], sanmiguel: ["SV-SM"], sansalvador: ["SV-SS"], sanvicente: ["SV-SV"], santaana: ["SV-SA"],
      sonsonate: ["SV-SO"], usulutan: ["SV-US"],
    },
  },
  // Nicarágua (base da ONU, derivada do GADM): departamento → município
  NI: {
    iso3: "nic", pasta: "ni", nivelMunicipio: 2, comCondados: false,
    isoPorNome: {
      boaco: ["NI-BO"], carazo: ["NI-CA"], chinandega: ["NI-CI"], chontales: ["NI-CO"], esteli: ["NI-ES"], granada: ["NI-GR"], jinotega: ["NI-JI"],
      leon: ["NI-LE"], madriz: ["NI-MD"], managua: ["NI-MN"], masaya: ["NI-MS"], matagalpa: ["NI-MT"], nuevasegovia: ["NI-NS"], rivas: ["NI-RI"],
      riosanjuan: ["NI-SJ"], regionautonomacostacaribenorte: ["NI-AN"], regionautonomadelacostacaribesur: ["NI-AS"],
    },
  },
  // Costa Rica (INEC): província → cantão
  CR: {
    iso3: "cri", pasta: "cr", nivelMunicipio: 2, comCondados: false,
    isoPorNome: {
      sanjose: ["CR-SJ", "San José"], alajuela: ["CR-A"], cartago: ["CR-C"], heredia: ["CR-H"], guanacaste: ["CR-G"], puntarenas: ["CR-P"], limon: ["CR-L", "Limón"],
    },
  },
  // Panamá (base da ONU, derivada do GADM): província ou comarca → distrito
  PA: {
    iso3: "pan", pasta: "pa", nivelMunicipio: 2, comCondados: false,
    isoPorNome: {
      bocasdeltoro: ["PA-1"], cocle: ["PA-2"], colon: ["PA-3"], chiriqui: ["PA-4"], darien: ["PA-5"], herrera: ["PA-6"], lossantos: ["PA-7"],
      panama: ["PA-8"], veraguas: ["PA-9"], panamaoeste: ["PA-10"], embera: ["PA-EM"], kunayala: ["PA-KY", "Guna Yala"], ngobebugle: ["PA-NB"],
    },
  },
  // Cuba (base da ONU, derivada do GADM): província → município
  CU: {
    iso3: "cub", pasta: "cu", nivelMunicipio: 2, comCondados: false,
    isoPorNome: {
      pinardelrio: ["CU-01"], lahabana: ["CU-03"], matanzas: ["CU-04"], villaclara: ["CU-05"], cienfuegos: ["CU-06"], sanctispiritus: ["CU-07"],
      ciegodeavila: ["CU-08"], camaguey: ["CU-09"], lastunas: ["CU-10"], holguin: ["CU-11"], granma: ["CU-12"], santiagodecuba: ["CU-13"],
      guantanamo: ["CU-14"], artemisa: ["CU-15"], mayabeque: ["CU-16"], isladelajuventud: ["CU-99"],
    },
  },
  // República Dominicana (ONE): província → município (as regiões, o 1º nível da base, ficam de fora)
  DO: {
    iso3: "dom", pasta: "do", nivelEstado: 2, nivelMunicipio: 3, comCondados: false, limpar: /^(Provincia|Municipio) /,
    isoPorNome: Object.fromEntries([
      "distritonacional", "azua", "baoruco", "barahona", "dajabon", "duarte", "eliaspina", "elseibo", "espaillat", "independencia", "laaltagracia",
      "laromana", "lavega", "mariatrinidadsanchez", "montecristi", "pedernales", "peravia", "puertoplata", "hermanasmirabal", "samana",
      "sancristobal", "sanjuan", "sanpedrodemacoris", "sanchezramirez", "santiago", "santiagorodriguez", "valverde", "monsenornouel",
      "monteplata", "hatomayor", "sanjosedeocoa", "santodomingo",
    ].map((n, i) => [n, [`DO-${String(i + 1).padStart(2, "0")}`]])),
  },
  // Haiti (CNIGS): departamento → comuna
  HT: {
    iso3: "hti", pasta: "ht", nivelMunicipio: 2, comCondados: false, idioma: "FR",
    isoPorNome: {
      artibonite: ["HT-AR"], centre: ["HT-CE"], grandeanse: ["HT-GA", "Grand'Anse"], nippes: ["HT-NI"], nord: ["HT-ND"], nordest: ["HT-NE"],
      nordouest: ["HT-NO"], ouest: ["HT-OU"], sud: ["HT-SD"], sudest: ["HT-SE"],
    },
  },
  // Jamaica (Social Development Commission): paróquia → comunidade (áreas de desenvolvimento da SDC)
  JM: {
    iso3: "jam", pasta: "jm", nivelMunicipio: 2, comCondados: false, idioma: "EN",
    isoPorNome: Object.fromEntries([
      "kingston", "saintandrew", "saintthomas", "portland", "saintmary", "saintann", "trelawny", "saintjames", "hanover", "westmoreland",
      "saintelizabeth", "manchester", "clarendon", "saintcatherine",
    ].map((n, i) => [n, [`JM-${String(i + 1).padStart(2, "0")}`]])),
  },
  // Ásia. Sem tabela ISO: o código do 1º nível vem do geoBoundaries (3º argumento)
  AF: { iso3: "afg", pasta: "af", nivelMunicipio: 2, comCondados: false, idioma: "EN" }, // província → distrito
  AM: { iso3: "arm", pasta: "am", nivelMunicipio: 2, comCondados: false, idioma: "EN" }, // província (marz) → distrito
  BD: { iso3: "bgd", pasta: "bd", nivelMunicipio: 3, comCondados: true, idioma: "EN" }, // divisão → distrito → upazila
  BT: { iso3: "btn", pasta: "bt", nivelMunicipio: 2, comCondados: false, idioma: "EN" }, // dzongkhag → gewog
  KH: { iso3: "khm", pasta: "kh", nivelMunicipio: 2, comCondados: false, idioma: "EN" }, // província → distrito
  QA: { iso3: "qat", pasta: "qa", nivelMunicipio: 2, comCondados: false, idioma: "EN", limpar: / Municipality$/ }, // município → zona
  KZ: { iso3: "kaz", pasta: "kz", nivelMunicipio: 2, comCondados: false, idioma: "EN", limpar: / (Region|District)$/ }, // região → distrito
  // China (sem Taiwan, que no globo é outra área): província → prefeitura
  CN: {
    iso3: "chn", pasta: "cn", nivelMunicipio: 2, comCondados: false, idioma: "EN", excluir: /^CN071/,
    iso: Object.fromEntries(Object.entries({
      11: "BJ", 12: "TJ", 13: "HE", 14: "SX", 15: "NM", 21: "LN", 22: "JL", 23: "HL", 31: "SH", 32: "JS", 33: "ZJ", 34: "AH", 35: "FJ", 36: "JX",
      37: "SD", 41: "HA", 42: "HB", 43: "HN", 44: "GD", 45: "GX", 46: "HI", 50: "CQ", 51: "SC", 52: "GZ", 53: "YN", 54: "XZ", 61: "SN", 62: "GS",
      63: "QH", 64: "NX", 65: "XJ", 81: "HK", 82: "MO",
    }).map(([n, c]) => [`0${n}`, `CN-${c}`])),
    limpar: / ([Pp]rovince|Autonomous Region|Municipality|Special Administrative Region)$/,
  },
  KP: { iso3: "prk", pasta: "kp", nivelMunicipio: 2, comCondados: false, idioma: "EN" }, // província → condado ou cidade
  PH: { iso3: "phl", pasta: "ph", nivelMunicipio: 3, comCondados: true, idioma: "EN" }, // região → província → município ou cidade
  YE: { iso3: "yem", pasta: "ye", nivelMunicipio: 2, comCondados: false, idioma: "EN" }, // governadoria → distrito
  ID: { iso3: "idn", pasta: "id", nivelMunicipio: 2, comCondados: false, idioma: "EN" }, // província → regência ou cidade
  IR: { iso3: "irn", pasta: "ir", nivelMunicipio: 2, comCondados: false, idioma: "EN" }, // província → condado (shahrestan)
  IQ: { iso3: "irq", pasta: "iq", nivelMunicipio: 2, comCondados: false, idioma: "EN" }, // governadoria → distrito
  LA: { iso3: "lao", pasta: "la", nivelMunicipio: 2, comCondados: false, idioma: "EN" }, // província → distrito
  LB: { iso3: "lbn", pasta: "lb", nivelMunicipio: 2, comCondados: false, idioma: "EN", excluir: /^Conflict/ }, // governadoria → distrito
  MY: { iso3: "mys", pasta: "my", nivelMunicipio: 2, comCondados: false, idioma: "EN" }, // estado → distrito
  MV: { iso3: "mdv", pasta: "mv", nivelMunicipio: 2, comCondados: false, idioma: "EN" }, // atol → ilha
  MN: { iso3: "mng", pasta: "mn", nivelMunicipio: 2, comCondados: false, idioma: "EN" }, // província (aimag) → sum
  MM: { iso3: "mmr", pasta: "mm", nivelMunicipio: 3, comCondados: true, idioma: "EN" }, // estado ou região → distrito → township
  NP: { iso3: "npl", pasta: "np", nivelMunicipio: 3, comCondados: true, idioma: "EN" }, // província → distrito → município (palika)
  OM: { iso3: "omn", pasta: "om", nivelMunicipio: 2, comCondados: false, idioma: "EN" }, // governadoria → wilayat
  PS: { iso3: "pse", pasta: "ps", nivelMunicipio: 2, comCondados: false, idioma: "EN" }, // Cisjordânia e Gaza → governadoria
  PK: { iso3: "pak", pasta: "pk", nivelMunicipio: 3, comCondados: true, idioma: "EN" }, // província → distrito → tehsil
  KG: { iso3: "kgz", pasta: "kg", nivelMunicipio: 2, comCondados: false, idioma: "EN" }, // região → distrito
  SY: { iso3: "syr", pasta: "sy", nivelMunicipio: 3, comCondados: true, idioma: "EN" }, // governadoria → distrito → subdistrito
  LK: { iso3: "lka", pasta: "lk", nivelMunicipio: 3, comCondados: true, idioma: "EN" }, // província → distrito → divisão
  TH: { iso3: "tha", pasta: "th", nivelMunicipio: 2, comCondados: false, idioma: "EN" }, // província → distrito (amphoe)
  TL: { iso3: "tls", pasta: "tl", nivelMunicipio: 2, comCondados: false, idioma: "EN" }, // município → posto administrativo
  TR: { iso3: "tur", pasta: "tr", nivelMunicipio: 2, comCondados: false, idioma: "TR", titulo: "tr" }, // província → distrito
  UZ: { iso3: "uzb", pasta: "uz", nivelMunicipio: 2, comCondados: false, idioma: "EN" }, // região → distrito
  // Vietnã (base de 2023, antes da fusão de 2025 em 34 províncias): província → distrito
  VN: {
    iso3: "vnm", pasta: "vn", nivelMunicipio: 2, comCondados: false, idioma: "VI",
    limpar: /^(Tỉnh|Thành phố|TP\.|Huyện|Quận|Thị xã) /,
  },
  // Europa
  UA: { iso3: "ukr", pasta: "ua", nivelMunicipio: 3, comCondados: true, idioma: "EN" }, // oblast → raion → hromada
  BY: { iso3: "blr", pasta: "by", nivelMunicipio: 2, comCondados: false, idioma: "EN" }, // oblast → raion
};

const [pais, origem, mapaIso] = process.argv.slice(2);
const cfg = PAISES[pais];
if (!cfg) throw new Error(`País sem configuração: ${pais}`);

// Sem tabela ISO na configuração: o código vem do 1º nível do geoBoundaries (campo shapeISO). Uma grade de
// pontos dentro do estado vota em qual área do geoBoundaries ele está (um ponto só erra nos estados recortados).
// Se não achar, fica o código nacional com o prefixo do país.
const areasIso = (mapaIso ? lerJson(mapaIso).features : [])
  .map((f) => ({ ...f, properties: { shapeISO: (f.properties.shapeISO ?? "").replace("_", "-") } })) // "AF_KAN" → "AF-KAN"
  .filter((f) => /^[A-Z]{2}-[A-Z0-9]+$/.test(f.properties.shapeISO));
const isoUsados = new Set();
function isoDoMapa(estado, num) {
  const vertices = (estado.geometry.type === "Polygon" ? [estado.geometry.coordinates] : estado.geometry.coordinates).flatMap((p) => p[0]);
  let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const [x, y] of vertices) [x0, x1, y0, y1] = [Math.min(x0, x), Math.max(x1, x), Math.min(y0, y), Math.max(y1, y)];
  const votos = new Map();
  for (let i = 0.5; i < 12; i++) for (let j = 0.5; j < 12; j++) {
    const ponto = [x0 + ((x1 - x0) * i) / 12, y0 + ((y1 - y0) * j) / 12];
    if (!pontoDentro(ponto, estado.geometry)) continue;
    const iso = areaDoPonto(ponto, areasIso)?.properties.shapeISO;
    if (iso) votos.set(iso, (votos.get(iso) ?? 0) + 1);
  }
  const iso = [...votos].sort((a, b) => b[1] - a[1])[0]?.[0]
    ?? areaDaForma(estado.geometry, areasIso, [pontoInterno(estado.geometry)])?.properties.shapeISO;
  if (!iso || isoUsados.has(iso)) return `${pais}-${num}`;
  isoUsados.add(iso);
  return iso;
}

const ler = (nivel) => lerJson(`${origem}/${cfg.iso3}_adm${nivel}.geojson`).features;
const codigo = (f, nivel) => f.properties[`ADM${nivel}_PCODE`].replace(/^[A-Z]+/, ""); // sem o prefixo do país (PE, KAZ...)
// Nomes todos em maiúsculas (Turquia): "KASTAMONU" → "Kastamonu", com as regras de maiúsculas da língua
const emTitulo = (t) => t.toLocaleLowerCase(cfg.titulo).replace(/(^|[\s(-])(\p{L})/gu, (_, a, l) => a + l.toLocaleUpperCase(cfg.titulo));
const nome = (f, nivel) => {
  const n = f.properties[`ADM${nivel}_${cfg.idioma ?? "ES"}`];
  return cfg.titulo ? emTitulo(n) : n;
};

const nivelEstado = cfg.nivelEstado ?? 1;
const nivelCondado = cfg.nivelCondado ?? 2;
const limpo = (texto) => (cfg.limpar ? texto.replace(cfg.limpar, "") : texto);
const fora = (f, nivel) => cfg.excluir?.test(f.properties[`ADM${nivel}_PCODE`]);
const pcodeEstado = (f) => f.properties[`ADM${nivelEstado}_PCODE`];

const estados = ler(nivelEstado).filter((e) => !fora(e, nivelEstado));
const condados = cfg.comCondados ? ler(nivelCondado).filter((c) => !fora(c, nivelCondado)) : [];
const municipios = ler(cfg.nivelMunicipio).filter((m) => !fora(m, cfg.nivelMunicipio));

let kb = 0;
const saida = [];
for (const e of estados) {
  const num = codigo(e, nivelEstado);
  const nomeBase = limpo(nome(e, nivelEstado));
  // O código ISO vem pelo código nacional ou, onde a numeração não segue a ISO, pelo nome
  const [iso, nomeCorrigido] = cfg.isoPorNome ? (cfg.isoPorNome[normalizar(nomeBase)] ?? [])
    : cfg.iso ? [cfg.iso[num], cfg.nomes?.[num]]
    : [isoDoMapa(e, num), cfg.nomes?.[num]];
  if (!iso) throw new Error(`Sem código ISO para ${nomeBase} (${num})`);
  const doEstado = municipios.filter((m) => pcodeEstado(m) === pcodeEstado(e));

  if (cfg.comCondados) {
    const porCondado = new Map();
    for (const m of doEstado) porCondado.set(codigo(m, nivelCondado), (porCondado.get(codigo(m, nivelCondado)) ?? 0) + 1);
    kb += gravar(`public/geo/${cfg.pasta}/condados-${iso}.json`, condados
      .filter((c) => pcodeEstado(c) === pcodeEstado(e))
      .map((c) => forma(c.geometry, { codigo: codigo(c, nivelCondado), nome: limpo(nome(c, nivelCondado)), total: porCondado.get(codigo(c, nivelCondado)) ?? 0 }, 3, 0.003)));
  }
  kb += gravar(`public/geo/${cfg.pasta}/municipios-${iso}.json`, doEstado.map((m) =>
    forma(m.geometry, {
      codigo: codigo(m, cfg.nivelMunicipio),
      nome: limpo(nome(m, cfg.nivelMunicipio)),
      ...(cfg.comCondados ? { condado: codigo(m, nivelCondado) } : {}),
    }, 3, 0.001)));
  saida.push(forma(e.geometry, { codigo: iso, nome: nomeCorrigido ?? nomeBase, total: doEstado.length }, 3, 0.004));
}
kb += gravar(`public/geo/${cfg.pasta}/estados.json`, saida);
console.log(`${pais}: ${saida.length} estados, ${condados.length} condados, ${municipios.length} municípios, ${kb.toFixed(0)} KB`);
console.log(saida.map((e) => `${e.properties.codigo} ${e.properties.nome} (${e.properties.total})`).join(" | "));
