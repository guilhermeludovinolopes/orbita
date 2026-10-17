// Países que já têm mapa por estados e municípios (gerados por scripts/gerar-<país>.mjs).
// Os outros países continuam só no nível do globo por enquanto.

export type DetalhePais = {
  totalMunicipios: number;
  nomeEstado: string; // como chamar o 1º nível no painel
  nomeMunicipio: string;
  estados: string; // arquivo com os estados
  municipios: (codigoEstado: string) => string; // arquivo com os municípios de um estado
};

export const DETALHE_PAISES: Record<string, DetalhePais> = {
  BR: {
    totalMunicipios: 5570,
    nomeEstado: "estado",
    nomeMunicipio: "município",
    estados: "/geo/br/estados.json",
    municipios: (codigo) => `/geo/br/municipios-${codigo.replace("BR-", "")}.json`,
  },
};
