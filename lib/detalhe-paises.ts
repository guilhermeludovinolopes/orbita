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
  IE: {
    totalMunicipios: 31,
    nomes: { estado: ["província", "províncias", "uma"], condado: ["condado", "condados", "um"], municipio: ["prefeitura", "prefeituras", "uma"] },
    ...arquivos("ie", true),
  },
};
