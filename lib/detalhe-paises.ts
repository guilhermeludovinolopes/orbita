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
  IE: {
    totalMunicipios: 31,
    nomes: { estado: ["província", "províncias", "uma"], condado: ["condado", "condados", "um"], municipio: ["prefeitura", "prefeituras", "uma"] },
    ...arquivos("ie", true),
  },
};
