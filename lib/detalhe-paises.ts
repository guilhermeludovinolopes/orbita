// Países que têm mapa por estados (1º nível), condados quando existem, e municípios.
// Os arquivos são gerados por scripts/gerar-<país>.mjs em public/geo/<pasta>/.
// Os outros países continuam só no nível do globo.

type Nome = [singular: string, plural: string, artigo: "um" | "uma"];

export type DetalhePais = {
  totalMunicipios: number; // total oficial de municípios (para o dourado do país)
  nomes: { estado: Nome; condado?: Nome; municipio: Nome };
  estados: string;
  condados?: (estado: string) => string; // só onde existe o nível intermediário
  semCondado?: string[]; // estados do país em que os municípios ficam direto no estado
  municipios: (estado: string) => string; // municípios de um estado (com "condado" quando houver)
};

// O estado tem o nível intermediário (condado, província, departamento...)?
export const temCondados = (det: DetalhePais, estado: string) => Boolean(det.condados) && !det.semCondado?.includes(estado);

const arquivos = (pasta: string, comCondados: boolean) => ({
  estados: `/geo/${pasta}/estados.json`,
  ...(comCondados ? { condados: (e: string) => `/geo/${pasta}/condados-${e}.json` } : {}),
  municipios: (e: string) => `/geo/${pasta}/municipios-${e}.json`,
});

export const DETALHE_PAISES: Record<string, DetalhePais> = {
  BR: {
    totalMunicipios: 5570,
    nomes: { estado: ["estado", "estados", "um"], municipio: ["município", "municípios", "um"] },
    estados: "/geo/br/estados.json",
    municipios: (codigo) => `/geo/br/municipios-${codigo.replace("BR-", "")}.json`,
  },
  US: {
    totalMunicipios: 19513, // cidades com governo próprio (sem as áreas só estatísticas)
    nomes: { estado: ["estado", "estados", "um"], condado: ["condado", "condados", "um"], municipio: ["cidade", "cidades", "uma"] },
    ...arquivos("us", true),
  },
  IT: {
    totalMunicipios: 7896,
    nomes: { estado: ["região", "regiões", "uma"], condado: ["província", "províncias", "uma"], municipio: ["comune", "comuni", "um"] },
    ...arquivos("it", true),
  },
  CH: {
    totalMunicipios: 2103, // as 2.110 oficiais menos 7 fusões posteriores ao mapa (2022)
    nomes: { estado: ["cantão", "cantões", "um"], condado: ["distrito", "distritos", "um"], municipio: ["comuna", "comunas", "uma"] },
    ...arquivos("ch", true),
  },
  PT: {
    totalMunicipios: 306, // 308 oficiais; 2 não vêm na base de mapas
    nomes: { estado: ["distrito", "distritos", "um"], municipio: ["concelho", "concelhos", "um"] },
    ...arquivos("pt", false),
  },
  "GB-ENG": {
    totalMunicipios: 264, // distritos, com Londres contando como 1
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("gb-eng", false),
  },
  AR: {
    totalMunicipios: 2093, // municípios, comunas e juntas com contorno no IGN (2.313 governos locais no INDEC 2022)
    nomes: { estado: ["província", "províncias", "uma"], condado: ["departamento", "departamentos", "um"], municipio: ["município", "municípios", "um"] },
    // Cidade Autônoma, partidos de Buenos Aires, e Mendoza, San Juan e La Rioja: o departamento é o próprio município
    semCondado: ["AR-C", "AR-B", "AR-M", "AR-J", "AR-F"],
    ...arquivos("ar", true),
  },
  CL: {
    totalMunicipios: 345, // as 346 comunas oficiais menos a Antártica (no globo ela é a Antártida)
    nomes: { estado: ["região", "regiões", "uma"], condado: ["província", "províncias", "uma"], municipio: ["comuna", "comunas", "uma"] },
    ...arquivos("cl", true),
  },
  PY: {
    totalMunicipios: 263,
    nomes: { estado: ["departamento", "departamentos", "um"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("py", false),
  },
  BO: {
    totalMunicipios: 339,
    nomes: { estado: ["departamento", "departamentos", "um"], condado: ["província", "províncias", "uma"], municipio: ["município", "municípios", "um"] },
    ...arquivos("bo", true),
  },
  PE: {
    totalMunicipios: 1873, // distritos da base do IGN (1.891 hoje no INEI; os criados depois não vêm no mapa)
    nomes: { estado: ["departamento", "departamentos", "um"], condado: ["província", "províncias", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("pe", true),
  },
  EC: {
    totalMunicipios: 221,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["cantão", "cantões", "um"] },
    ...arquivos("ec", false),
  },
  CO: {
    totalMunicipios: 1122, // municípios e áreas não municipalizadas do DANE
    nomes: { estado: ["departamento", "departamentos", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("co", false),
  },
  VE: {
    totalMunicipios: 335,
    nomes: { estado: ["estado", "estados", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("ve", false),
  },
  SR: {
    totalMunicipios: 62,
    nomes: { estado: ["distrito", "distritos", "um"], municipio: ["ressort", "ressorts", "um"] },
    ...arquivos("sr", false),
  },
  MX: {
    totalMunicipios: 2457, // municípios do Marco Geoestadístico 2020 do INEGI (os criados depois não vêm no mapa)
    nomes: { estado: ["estado", "estados", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("mx", false),
  },
  GT: {
    totalMunicipios: 342,
    nomes: { estado: ["departamento", "departamentos", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("gt", false),
  },
  HN: {
    totalMunicipios: 298,
    nomes: { estado: ["departamento", "departamentos", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("hn", false),
  },
  SV: {
    totalMunicipios: 262, // distritos: os municípios antigos, agrupados em 44 municípios desde 2024
    nomes: { estado: ["departamento", "departamentos", "um"], condado: ["município", "municípios", "um"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("sv", true),
  },
  NI: {
    totalMunicipios: 153,
    nomes: { estado: ["departamento", "departamentos", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("ni", false),
  },
  CR: {
    totalMunicipios: 81, // cantões da base do INEC (84 hoje; os 3 mais novos não vêm no mapa)
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["cantão", "cantões", "um"] },
    ...arquivos("cr", false),
  },
  PA: {
    totalMunicipios: 76,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("pa", false),
  },
  CU: {
    totalMunicipios: 168,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["município", "municípios", "um"] },
    ...arquivos("cu", false),
  },
  DO: {
    totalMunicipios: 155,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["município", "municípios", "um"] },
    ...arquivos("do", false),
  },
  HT: {
    totalMunicipios: 140,
    nomes: { estado: ["departamento", "departamentos", "um"], municipio: ["comuna", "comunas", "uma"] },
    ...arquivos("ht", false),
  },
  JM: {
    totalMunicipios: 131, // áreas de desenvolvimento da Social Development Commission
    nomes: { estado: ["paróquia", "paróquias", "uma"], municipio: ["comunidade", "comunidades", "uma"] },
    ...arquivos("jm", false),
  },
  CA: {
    totalMunicipios: 5161, // subdivisões censitárias de 2021: municípios, reservas indígenas e territórios não organizados
    nomes: { estado: ["província", "províncias", "uma"], condado: ["divisão censitária", "divisões censitárias", "uma"], municipio: ["município", "municípios", "um"] },
    ...arquivos("ca", true),
  },
  JP: {
    totalMunicipios: 1741,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["município", "municípios", "um"] },
    ...arquivos("jp", false),
  },
  KR: {
    totalMunicipios: 228,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["si, gun ou gu", "sis, guns e gus", "um"] },
    ...arquivos("kr", false),
  },
  IN: {
    totalMunicipios: 6822,
    nomes: { estado: ["estado", "estados", "um"], condado: ["distrito", "distritos", "um"], municipio: ["subdistrito (tehsil)", "subdistritos", "um"] },
    ...arquivos("in", true),
  },
  IL: {
    totalMunicipios: 15,
    nomes: { estado: ["distrito", "distritos", "um"], municipio: ["subdistrito", "subdistritos", "um"] },
    ...arquivos("il", false),
  },
  JO: {
    totalMunicipios: 52,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("jo", false),
  },
  TJ: {
    totalMunicipios: 59,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("tj", false),
  },
  TM: {
    totalMunicipios: 47, // 12 distritos vêm sem nome no geoBoundaries e ficaram de fora
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("tm", false),
  },
  SG: {
    totalMunicipios: 55,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["área de planejamento", "áreas de planejamento", "uma"] },
    ...arquivos("sg", false),
  },
  BN: {
    totalMunicipios: 38,
    nomes: { estado: ["distrito", "distritos", "um"], municipio: ["mukim", "mukims", "um"] },
    ...arquivos("bn", false),
  },
  SA: {
    totalMunicipios: 147,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["governadoria", "governadorias", "uma"] },
    ...arquivos("sa", false),
  },
  AZ: {
    totalMunicipios: 79,
    nomes: { estado: ["parte", "partes", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("az", false),
  },
  GE: {
    totalMunicipios: 68,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["município", "municípios", "um"] },
    ...arquivos("ge", false),
  },
  KW: {
    totalMunicipios: 137,
    nomes: { estado: ["governadoria", "governadorias", "uma"], municipio: ["área", "áreas", "uma"] },
    ...arquivos("kw", false),
  },
  AF: {
    totalMunicipios: 401,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("af", false),
  },
  AM: {
    totalMunicipios: 39,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("am", false),
  },
  BD: {
    totalMunicipios: 544,
    nomes: { estado: ["divisão", "divisões", "uma"], condado: ["distrito", "distritos", "um"], municipio: ["upazila", "upazilas", "uma"] },
    ...arquivos("bd", true),
  },
  BT: {
    totalMunicipios: 205,
    nomes: { estado: ["distrito", "distritos", "um"], municipio: ["gewog", "gewogs", "um"] },
    ...arquivos("bt", false),
  },
  KH: {
    totalMunicipios: 197,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("kh", false),
  },
  QA: {
    totalMunicipios: 90,
    nomes: { estado: ["município", "municípios", "um"], municipio: ["zona", "zonas", "uma"] },
    ...arquivos("qa", false),
  },
  KZ: {
    totalMunicipios: 218,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("kz", false),
  },
  CN: {
    totalMunicipios: 360,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["prefeitura", "prefeituras", "uma"] },
    ...arquivos("cn", false),
  },
  KP: {
    totalMunicipios: 179,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["condado ou cidade", "condados e cidades", "um"] },
    ...arquivos("kp", false),
  },
  PH: {
    totalMunicipios: 1642,
    nomes: { estado: ["região", "regiões", "uma"], condado: ["província", "províncias", "uma"], municipio: ["município ou cidade", "municípios e cidades", "um"] },
    ...arquivos("ph", true),
  },
  YE: {
    totalMunicipios: 335,
    nomes: { estado: ["governadoria", "governadorias", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("ye", false),
  },
  ID: {
    totalMunicipios: 522,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["regência ou cidade", "regências e cidades", "uma"] },
    ...arquivos("id", false),
  },
  IR: {
    totalMunicipios: 429,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["condado", "condados", "um"] },
    ...arquivos("ir", false),
  },
  IQ: {
    totalMunicipios: 101,
    nomes: { estado: ["governadoria", "governadorias", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("iq", false),
  },
  LA: {
    totalMunicipios: 148,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("la", false),
  },
  LB: {
    totalMunicipios: 26,
    nomes: { estado: ["governadoria", "governadorias", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("lb", false),
  },
  MY: {
    totalMunicipios: 144,
    nomes: { estado: ["estado", "estados", "um"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("my", false),
  },
  MV: {
    totalMunicipios: 1556,
    nomes: { estado: ["atol", "atóis", "um"], municipio: ["ilha", "ilhas", "uma"] },
    ...arquivos("mv", false),
  },
  MN: {
    totalMunicipios: 339,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["sum", "suns", "um"] },
    ...arquivos("mn", false),
  },
  MM: {
    totalMunicipios: 330,
    nomes: { estado: ["estado ou região", "estados e regiões", "um"], condado: ["distrito", "distritos", "um"], municipio: ["township", "townships", "um"] },
    ...arquivos("mm", true),
  },
  NP: {
    totalMunicipios: 775,
    nomes: { estado: ["província", "províncias", "uma"], condado: ["distrito", "distritos", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("np", true),
  },
  OM: {
    totalMunicipios: 49,
    nomes: { estado: ["governadoria", "governadorias", "uma"], municipio: ["wilayat", "wilayats", "um"] },
    ...arquivos("om", false),
  },
  PS: {
    totalMunicipios: 16,
    nomes: { estado: ["território", "territórios", "um"], municipio: ["governadoria", "governadorias", "uma"] },
    ...arquivos("ps", false),
  },
  PK: {
    totalMunicipios: 577,
    nomes: { estado: ["província", "províncias", "uma"], condado: ["distrito", "distritos", "um"], municipio: ["tehsil", "tehsils", "um"] },
    ...arquivos("pk", true),
  },
  KG: {
    totalMunicipios: 46,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("kg", false),
  },
  SY: {
    totalMunicipios: 272,
    nomes: { estado: ["governadoria", "governadorias", "uma"], condado: ["distrito", "distritos", "um"], municipio: ["subdistrito", "subdistritos", "um"] },
    ...arquivos("sy", true),
  },
  LK: {
    totalMunicipios: 339,
    nomes: { estado: ["província", "províncias", "uma"], condado: ["distrito", "distritos", "um"], municipio: ["divisão", "divisões", "uma"] },
    ...arquivos("lk", true),
  },
  TH: {
    totalMunicipios: 928,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("th", false),
  },
  TL: {
    totalMunicipios: 65,
    nomes: { estado: ["município", "municípios", "um"], municipio: ["posto administrativo", "postos administrativos", "um"] },
    ...arquivos("tl", false),
  },
  TR: {
    totalMunicipios: 973,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("tr", false),
  },
  UZ: {
    totalMunicipios: 199,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("uz", false),
  },
  VN: {
    totalMunicipios: 708,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("vn", false),
  },
  DE: {
    totalMunicipios: 10990,
    nomes: { estado: ["estado", "estados", "um"], condado: ["distrito", "distritos", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("de", true),
  },
  FR: {
    totalMunicipios: 34956,
    nomes: { estado: ["região", "regiões", "uma"], condado: ["departamento", "departamentos", "um"], municipio: ["comuna", "comunas", "uma"] },
    ...arquivos("fr", true),
  },
  ES: {
    totalMunicipios: 8131,
    nomes: { estado: ["região", "regiões", "uma"], condado: ["província", "províncias", "uma"], municipio: ["município", "municípios", "um"] },
    ...arquivos("es", true),
  },
  BE: {
    totalMunicipios: 581,
    nomes: { estado: ["região", "regiões", "uma"], condado: ["província", "províncias", "uma"], municipio: ["comuna", "comunas", "uma"] },
    ...arquivos("be", true),
  },
  GR: {
    totalMunicipios: 326, // municípios do programa Kallikratis (geoBoundaries)
    nomes: { estado: ["região", "regiões", "uma"], condado: ["unidade regional", "unidades regionais", "uma"], municipio: ["município", "municípios", "um"] },
    ...arquivos("gr", true),
  },
  NL: {
    totalMunicipios: 344,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["município", "municípios", "um"] },
    ...arquivos("nl", false),
  },
  AT: {
    totalMunicipios: 2093,
    nomes: { estado: ["estado", "estados", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("at", false),
  },
  DK: {
    totalMunicipios: 99,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["município", "municípios", "um"] },
    ...arquivos("dk", false),
  },
  CZ: {
    totalMunicipios: 6258,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["município", "municípios", "um"] },
    ...arquivos("cz", false),
  },
  SK: {
    totalMunicipios: 2927,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["município", "municípios", "um"] },
    ...arquivos("sk", false),
  },
  HU: {
    totalMunicipios: 3155,
    nomes: { estado: ["condado", "condados", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("hu", false),
  },
  RO: {
    totalMunicipios: 3181,
    nomes: { estado: ["distrito", "distritos", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("ro", false),
  },
  BG: {
    totalMunicipios: 265,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["município", "municípios", "um"] },
    ...arquivos("bg", false),
  },
  HR: {
    totalMunicipios: 556,
    nomes: { estado: ["condado", "condados", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("hr", false),
  },
  SI: {
    totalMunicipios: 212,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["município", "municípios", "um"] },
    ...arquivos("si", false),
  },
  SE: {
    totalMunicipios: 290,
    nomes: { estado: ["condado", "condados", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("se", false),
  },
  FI: {
    totalMunicipios: 309,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["município", "municípios", "um"] },
    ...arquivos("fi", false),
  },
  NO: {
    totalMunicipios: 356,
    nomes: { estado: ["condado", "condados", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("no", false),
  },
  IS: {
    totalMunicipios: 64,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["município", "municípios", "um"] },
    ...arquivos("is", false),
  },
  LT: {
    totalMunicipios: 60,
    nomes: { estado: ["condado", "condados", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("lt", false),
  },
  LV: {
    totalMunicipios: 43,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["município", "municípios", "um"] },
    ...arquivos("lv", false),
  },
  MT: {
    totalMunicipios: 68,
    nomes: { estado: ["ilha", "ilhas", "uma"], municipio: ["conselho local", "conselhos locais", "um"] },
    ...arquivos("mt", false),
  },
  AL: {
    totalMunicipios: 61,
    nomes: { estado: ["condado", "condados", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("al", false),
  },
  MK: {
    totalMunicipios: 80,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["município", "municípios", "um"] },
    ...arquivos("mk", false),
  },
  RS: {
    totalMunicipios: 169,
    nomes: { estado: ["distrito", "distritos", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("rs", false),
  },
  LI: {
    totalMunicipios: 11,
    nomes: { estado: ["país", "países", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("li", false),
  },
  PL: {
    totalMunicipios: 2477,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["município", "municípios", "um"] },
    ...arquivos("pl", false),
  },
  EE: {
    totalMunicipios: 79,
    nomes: { estado: ["condado", "condados", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("ee", false),
  },
  CY: {
    totalMunicipios: 615,
    nomes: { estado: ["distrito", "distritos", "um"], municipio: ["comunidade", "comunidades", "uma"] },
    ...arquivos("cy", false),
  },
  LU: {
    totalMunicipios: 102,
    nomes: { estado: ["cantão", "cantões", "um"], municipio: ["comuna", "comunas", "uma"] },
    ...arquivos("lu", false),
  },
  "GB-SCT": {
    totalMunicipios: 32,
    nomes: { estado: ["nação", "nações", "uma"], municipio: ["council area", "council areas", "uma"] },
    ...arquivos("gb-sct", false),
  },
  "GB-WLS": {
    totalMunicipios: 22,
    nomes: { estado: ["nação", "nações", "uma"], municipio: ["principal area", "principal areas", "uma"] },
    ...arquivos("gb-wls", false),
  },
  "GB-NIR": {
    totalMunicipios: 11,
    nomes: { estado: ["nação", "nações", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("gb-nir", false),
  },
  UA: {
    totalMunicipios: 1769,
    nomes: { estado: ["região", "regiões", "uma"], condado: ["raion", "raions", "um"], municipio: ["comunidade", "comunidades", "uma"] },
    ...arquivos("ua", true),
  },
  BY: {
    totalMunicipios: 119,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("by", false),
  },
  RU: {
    totalMunicipios: 2329,
    nomes: { estado: ["sujeito federal", "sujeitos federais", "um"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("ru", false),
  },
  BA: {
    totalMunicipios: 142,
    nomes: { estado: ["entidade", "entidades", "uma"], condado: ["cantão ou região", "cantões e regiões", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("ba", true),
  },
  ME: {
    totalMunicipios: 23,
    nomes: { estado: ["país", "países", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("me", false),
  },
  MD: {
    totalMunicipios: 37,
    nomes: { estado: ["país", "países", "um"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("md", false),
  },
  AD: {
    totalMunicipios: 7,
    nomes: { estado: ["país", "países", "um"], municipio: ["paróquia", "paróquias", "uma"] },
    ...arquivos("ad", false),
  },
  SM: {
    totalMunicipios: 9,
    nomes: { estado: ["país", "países", "um"], municipio: ["castello", "castelli", "um"] },
    ...arquivos("sm", false),
  },
  ZA: {
    totalMunicipios: 213,
    nomes: { estado: ["província", "províncias", "uma"], condado: ["distrito", "distritos", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("za", true),
  },
  AO: {
    totalMunicipios: 161,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["município", "municípios", "um"] },
    ...arquivos("ao", false),
  },
  DZ: {
    totalMunicipios: 1541,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["comuna", "comunas", "uma"] },
    ...arquivos("dz", false),
  },
  BJ: {
    totalMunicipios: 77,
    nomes: { estado: ["departamento", "departamentos", "um"], municipio: ["comuna", "comunas", "uma"] },
    ...arquivos("bj", false),
  },
  BW: {
    totalMunicipios: 28,
    nomes: { estado: ["distrito", "distritos", "um"], municipio: ["subdistrito", "subdistritos", "um"] },
    ...arquivos("bw", false),
  },
  BF: {
    totalMunicipios: 351,
    nomes: { estado: ["região", "regiões", "uma"], condado: ["província", "províncias", "uma"], municipio: ["comuna", "comunas", "uma"] },
    ...arquivos("bf", true),
  },
  BI: {
    totalMunicipios: 119,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["comuna", "comunas", "uma"] },
    ...arquivos("bi", false),
  },
  CV: {
    totalMunicipios: 32,
    nomes: { estado: ["município", "municípios", "um"], municipio: ["freguesia", "freguesias", "uma"] },
    ...arquivos("cv", false),
  },
  CM: {
    totalMunicipios: 360,
    nomes: { estado: ["região", "regiões", "uma"], condado: ["departamento", "departamentos", "um"], municipio: ["arrondissement", "arrondissements", "um"] },
    ...arquivos("cm", true),
  },
  TD: {
    totalMunicipios: 70,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["departamento", "departamentos", "um"] },
    ...arquivos("td", false),
  },
  KM: {
    totalMunicipios: 17,
    nomes: { estado: ["ilha", "ilhas", "uma"], municipio: ["prefeitura", "prefeituras", "uma"] },
    ...arquivos("km", false),
  },
  CG: {
    totalMunicipios: 89,
    nomes: { estado: ["departamento", "departamentos", "um"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("cg", false),
  },
  CI: {
    totalMunicipios: 510,
    nomes: { estado: ["região", "regiões", "uma"], condado: ["departamento", "departamentos", "um"], municipio: ["subprefeitura", "subprefeituras", "uma"] },
    ...arquivos("ci", true),
  },
  DJ: {
    totalMunicipios: 20,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("dj", false),
  },
  EG: {
    totalMunicipios: 365,
    nomes: { estado: ["governadoria", "governadorias", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("eg", false),
  },
  ER: {
    totalMunicipios: 58,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["subzona", "subzonas", "uma"] },
    ...arquivos("er", false),
  },
  ET: {
    totalMunicipios: 1082,
    nomes: { estado: ["região", "regiões", "uma"], condado: ["zona", "zonas", "uma"], municipio: ["woreda", "woredas", "um"] },
    ...arquivos("et", true),
  },
  GA: {
    totalMunicipios: 48,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["departamento", "departamentos", "um"] },
    ...arquivos("ga", false),
  },
  GM: {
    totalMunicipios: 49,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("gm", false),
  },
  GH: {
    totalMunicipios: 260,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("gh", false),
  },
  GN: {
    totalMunicipios: 34,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["prefeitura", "prefeituras", "uma"] },
    ...arquivos("gn", false),
  },
  GQ: {
    totalMunicipios: 32,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("gq", false),
  },
  GW: {
    totalMunicipios: 39,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["setor", "setores", "um"] },
    ...arquivos("gw", false),
  },
  LS: {
    totalMunicipios: 78,
    nomes: { estado: ["distrito", "distritos", "um"], municipio: ["conselho comunitário", "conselhos comunitários", "um"] },
    ...arquivos("ls", false),
  },
  LR: {
    totalMunicipios: 136,
    nomes: { estado: ["condado", "condados", "um"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("lr", false),
  },
  LY: {
    totalMunicipios: 22,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("ly", false),
  },
  MG: {
    totalMunicipios: 1579,
    nomes: { estado: ["província", "províncias", "uma"], condado: ["região", "regiões", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("mg", true),
  },
  MW: {
    totalMunicipios: 32,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("mw", false),
  },
  ML: {
    totalMunicipios: 701,
    nomes: { estado: ["região", "regiões", "uma"], condado: ["círculo", "círculos", "um"], municipio: ["comuna", "comunas", "uma"] },
    ...arquivos("ml", true),
  },
  MA: {
    totalMunicipios: 1507,
    nomes: { estado: ["região", "regiões", "uma"], condado: ["província", "províncias", "uma"], municipio: ["comuna", "comunas", "uma"] },
    ...arquivos("ma", true),
  },
  MR: {
    totalMunicipios: 63,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["departamento", "departamentos", "um"] },
    ...arquivos("mr", false),
  },
  MZ: {
    totalMunicipios: 159,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("mz", false),
  },
  NA: {
    totalMunicipios: 107,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["círculo eleitoral", "círculos eleitorais", "um"] },
    ...arquivos("na", false),
  },
  NE: {
    totalMunicipios: 266,
    nomes: { estado: ["região", "regiões", "uma"], condado: ["departamento", "departamentos", "um"], municipio: ["comuna", "comunas", "uma"] },
    ...arquivos("ne", true),
  },
  NG: {
    totalMunicipios: 774,
    nomes: { estado: ["estado", "estados", "um"], municipio: ["área de governo local", "áreas de governo local", "uma"] },
    ...arquivos("ng", false),
  },
  KE: {
    totalMunicipios: 290,
    nomes: { estado: ["condado", "condados", "um"], municipio: ["subcondado", "subcondados", "um"] },
    ...arquivos("ke", false),
  },
  CF: {
    totalMunicipios: 72,
    nomes: { estado: ["prefeitura", "prefeituras", "uma"], municipio: ["subprefeitura", "subprefeituras", "uma"] },
    ...arquivos("cf", false),
  },
  CD: {
    totalMunicipios: 189,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["território", "territórios", "um"] },
    ...arquivos("cd", false),
  },
  RW: {
    totalMunicipios: 416,
    nomes: { estado: ["província", "províncias", "uma"], condado: ["distrito", "distritos", "um"], municipio: ["setor", "setores", "um"] },
    ...arquivos("rw", true),
  },
  ST: {
    totalMunicipios: 7,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("st", false),
  },
  SC: {
    totalMunicipios: 8,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("sc", false),
  },
  SN: {
    totalMunicipios: 46,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["departamento", "departamentos", "um"] },
    ...arquivos("sn", false),
  },
  SL: {
    totalMunicipios: 167,
    nomes: { estado: ["província", "províncias", "uma"], condado: ["distrito", "distritos", "um"], municipio: ["chefatura", "chefaturas", "uma"] },
    ...arquivos("sl", true),
  },
  SO: {
    totalMunicipios: 74,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("so", false),
  },
  SZ: {
    totalMunicipios: 55,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["inkhundla", "tinkhundla", "um"] },
    ...arquivos("sz", false),
  },
  SD: {
    totalMunicipios: 189,
    nomes: { estado: ["estado", "estados", "um"], municipio: ["localidade", "localidades", "uma"] },
    ...arquivos("sd", false),
  },
  SS: {
    totalMunicipios: 79,
    nomes: { estado: ["estado", "estados", "um"], municipio: ["condado", "condados", "um"] },
    ...arquivos("ss", false),
  },
  TZ: {
    totalMunicipios: 170,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("tz", false),
  },
  TG: {
    totalMunicipios: 40,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["prefeitura", "prefeituras", "uma"] },
    ...arquivos("tg", false),
  },
  TN: {
    totalMunicipios: 264,
    nomes: { estado: ["governadoria", "governadorias", "uma"], municipio: ["delegação", "delegações", "uma"] },
    ...arquivos("tn", false),
  },
  UG: {
    totalMunicipios: 135,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("ug", false),
  },
  ZM: {
    totalMunicipios: 116,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("zm", false),
  },
  ZW: {
    totalMunicipios: 91,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("zw", false),
  },
  MU: {
    totalMunicipios: 12,
    nomes: { estado: ["país", "países", "um"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("mu", false),
  },
  AU: {
    totalMunicipios: 547,
    nomes: { estado: ["estado", "estados", "um"], municipio: ["área de governo local", "áreas de governo local", "uma"] },
    ...arquivos("au", false),
  },
  NZ: {
    totalMunicipios: 88,
    nomes: { estado: ["região", "regiões", "uma"], municipio: ["autoridade territorial", "autoridades territoriais", "uma"] },
    ...arquivos("nz", false),
  },
  PG: {
    totalMunicipios: 87,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("pg", false),
  },
  FJ: {
    totalMunicipios: 15,
    nomes: { estado: ["divisão", "divisões", "uma"], municipio: ["província", "províncias", "uma"] },
    ...arquivos("fj", false),
  },
  SB: {
    totalMunicipios: 50,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["distrito eleitoral", "distritos eleitorais", "um"] },
    ...arquivos("sb", false),
  },
  VU: {
    totalMunicipios: 66,
    nomes: { estado: ["província", "províncias", "uma"], municipio: ["conselho de área", "conselhos de área", "um"] },
    ...arquivos("vu", false),
  },
  TO: {
    totalMunicipios: 23,
    nomes: { estado: ["divisão", "divisões", "uma"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("to", false),
  },
  KI: {
    totalMunicipios: 36,
    nomes: { estado: ["grupo de ilhas", "grupos de ilhas", "um"], municipio: ["ilha", "ilhas", "uma"] },
    ...arquivos("ki", false),
  },
  FM: {
    totalMunicipios: 75,
    nomes: { estado: ["estado", "estados", "um"], municipio: ["município", "municípios", "um"] },
    ...arquivos("fm", false),
  },
  MH: {
    totalMunicipios: 152,
    nomes: { estado: ["atol", "atóis", "um"], municipio: ["ilha", "ilhas", "uma"] },
    ...arquivos("mh", false),
  },
  WS: {
    totalMunicipios: 43,
    nomes: { estado: ["distrito", "distritos", "um"], municipio: ["distrito eleitoral", "distritos eleitorais", "um"] },
    ...arquivos("ws", false),
  },
  TV: {
    totalMunicipios: 30,
    nomes: { estado: ["ilha", "ilhas", "uma"], municipio: ["aldeia", "aldeias", "uma"] },
    ...arquivos("tv", false),
  },
  PW: {
    totalMunicipios: 16,
    nomes: { estado: ["país", "países", "um"], municipio: ["estado", "estados", "um"] },
    ...arquivos("pw", false),
  },
  NR: {
    totalMunicipios: 14,
    nomes: { estado: ["país", "países", "um"], municipio: ["distrito", "distritos", "um"] },
    ...arquivos("nr", false),
  },
  IE: {
    totalMunicipios: 31,
    nomes: { estado: ["província", "províncias", "uma"], condado: ["condado", "condados", "um"], municipio: ["prefeitura", "prefeituras", "uma"] },
    ...arquivos("ie", true),
  },
};
