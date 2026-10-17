// Gera os mapas do Brasil para o zoom do globo, a partir das malhas oficiais do IBGE
// (API de malhas v3, qualidade intermediária) e da lista de municípios do IBGE:
//   public/geo/br/estados.json         27 estados, com código ISO (BR-SP), nome e total de municípios
//   public/geo/br/municipios-SP.json   um arquivo por estado, com código IBGE e nome de cada município
//
// Uso: node scripts/gerar-brasil.mjs <malha-UF.json> <malha-municipio.json> <ibge-municipios.json>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const [arqEstados, arqMunicipios, arqLista] = process.argv.slice(2);
const ler = (arq) => JSON.parse(readFileSync(arq, "utf8"));

// Nome e estado de cada município, e sigla/nome de cada estado, vêm da lista do IBGE
const ufs = {};
const municipios = {};
for (const m of ler(arqLista)) {
  const uf = m.microrregiao?.mesorregiao?.UF ?? m["regiao-imediata"]["regiao-intermediaria"].UF;
  ufs[uf.id] = { sigla: uf.sigla, nome: uf.nome, total: (ufs[uf.id]?.total ?? 0) + 1 };
  municipios[m.id] = { nome: m.nome, uf: uf.sigla };
}

// 4 casas decimais (~10 m) bastam e deixam os arquivos bem mais leves
const arredondar = (c) => (typeof c[0] === "number" ? c.map((n) => Math.round(n * 1e4) / 1e4) : c.map(arredondar));
const forma = (f, propriedades) => ({
  type: "Feature",
  properties: propriedades,
  geometry: { type: f.geometry.type, coordinates: arredondar(f.geometry.coordinates) },
});
const gravar = (caminho, features) => {
  const json = JSON.stringify({ type: "FeatureCollection", features });
  writeFileSync(caminho, json);
  return json.length;
};

mkdirSync("public/geo/br", { recursive: true });

const estados = ler(arqEstados).features.map((f) => {
  const uf = ufs[Number(f.properties.codarea)];
  return forma(f, { codigo: `BR-${uf.sigla}`, nome: uf.nome, total: uf.total });
});
console.log(`estados.json: ${estados.length} estados, ${(gravar("public/geo/br/estados.json", estados) / 1024).toFixed(0)} KB`);

const porUf = {};
for (const f of ler(arqMunicipios).features) {
  const m = municipios[Number(f.properties.codarea)];
  (porUf[m.uf] ??= []).push(forma(f, { codigo: f.properties.codarea, nome: m.nome }));
}
let totalKb = 0;
for (const [uf, features] of Object.entries(porUf)) totalKb += gravar(`public/geo/br/municipios-${uf}.json`, features) / 1024;
const quantidade = Object.values(porUf).reduce((s, l) => s + l.length, 0);
console.log(`municipios-*.json: ${Object.keys(porUf).length} arquivos, ${quantidade} municípios, ${totalKb.toFixed(0)} KB no total`);
