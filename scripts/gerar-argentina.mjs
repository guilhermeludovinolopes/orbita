// Gera os mapas da Argentina a partir das camadas do Instituto Geográfico Nacional (IGN, serviço WFS
// wms.ign.gob.ar), com os códigos do INDEC:
//   ign:provincia, ign:departamento, ign:municipio (contornos) e ign:gobiernoslocales_2022 (pontos)
// baixadas em GeoJSON (outputFormat=application/json, srsName=EPSG:4326).
//
//   public/geo/ar/estados.json             províncias (AR-X), com o total de municípios
//   public/geo/ar/condados-AR-X.json       departamentos de uma província (INDEC 14014), com o total
//   public/geo/ar/municipios-AR-X.json     municípios, comunas e juntas (INDEC 140105), com o departamento
//
// Onde o departamento é o próprio município (partidos de Buenos Aires; Mendoza, San Juan e La Rioja)
// não há nível de departamento, e a Cidade Autônoma de Buenos Aires é um município só (sem as comunas).
// A Antártida Argentina e as Ilhas do Atlântico Sul ficam de fora: no globo elas são outras áreas.
//
// Uso: node scripts/gerar-argentina.mjs <pasta com provincia.json, departamento.json, municipio.json e gobiernoslocales_2022.json>
import { areaDaForma, forma, gravar, lerJson, normalizar, pontoDentro, pontoInterno, unir } from "./geo-comum.mjs";

const [pasta] = process.argv.slice(2);
const ler = (nome) => lerJson(`${pasta}/${nome}.json`).features;

// ISO 3166-2:AR pelo código INDEC da província
const ISO = {
  "02": "AR-C", "06": "AR-B", "10": "AR-K", "14": "AR-X", "18": "AR-W", "22": "AR-H", "26": "AR-U", "30": "AR-E",
  "34": "AR-P", "38": "AR-Y", "42": "AR-L", "46": "AR-F", "50": "AR-M", "54": "AR-N", "58": "AR-Q", "62": "AR-R",
  "66": "AR-A", "70": "AR-J", "74": "AR-D", "78": "AR-Z", "82": "AR-S", "86": "AR-G", "90": "AR-T", "94": "AR-V",
};
const CABA = "02";
const SEM_DEPARTAMENTO = new Set([CABA, "06", "46", "50", "70"]); // o departamento é o próprio município
const FORA = new Set(["94021", "94028"]); // Ilhas do Atlántico Sul e Antártida Argentina
const MUNICIPIO_CABA = "020000";

const provincias = ler("provincia");
const departamentos = ler("departamento").filter((d) => !FORA.has(d.properties.in1));
const pontos = ler("gobiernoslocales_2022");
const pontoDoCodigo = new Map(pontos.map((p) => [p.properties.in1, p.geometry.coordinates[0]]));

// Contornos sem código (ou com o código de outro lugar): o código vem do ponto do mesmo nome lá dentro
const codigoValido = (c) => /^\d{6}$/.test(String(c).trim());
const nomesPorCodigo = new Map();
for (const f of ler("municipio")) {
  const c = f.properties.in1;
  if (codigoValido(c)) nomesPorCodigo.set(c, new Set([...(nomesPorCodigo.get(c) ?? []), normalizar(f.properties.nam)]));
}
const corrigidos = [], descartados = [];
const porCodigo = new Map();
for (const f of ler("municipio")) {
  let codigo = String(f.properties.in1).trim();
  if (codigo.startsWith(CABA)) continue; // as comunas da Cidade Autônoma
  if (!codigoValido(codigo) || nomesPorCodigo.get(codigo).size > 1) {
    const nome = normalizar(f.properties.nam);
    // O ponto às vezes cai fora do contorno (Salto Encantado): vale o do mesmo nome cujo código nenhum contorno usa
    const ponto = pontos.find((p) => normalizar(p.properties.nam) === nome && pontoDentro(p.geometry.coordinates[0], f.geometry))
      ?? pontos.find((p) => normalizar(p.properties.nam) === nome && !nomesPorCodigo.has(p.properties.in1));
    if (!ponto) { descartados.push(f.properties.nam); continue; }
    if (ponto.properties.in1 !== codigo) corrigidos.push(`${f.properties.nam} ${codigo || "(sem código)"} → ${ponto.properties.in1}`);
    codigo = ponto.properties.in1;
  }
  // O mesmo município em dois pedaços (Machagai): junta as partes
  const anterior = porCodigo.get(codigo);
  const partes = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
  porCodigo.set(codigo, anterior
    ? { ...anterior, geometry: { type: "MultiPolygon", coordinates: [...partes(anterior.geometry), ...partes(f.geometry)] } }
    : { nome: f.properties.nam, geometry: f.geometry });
}

let kb = 0, totalPais = 0, semDepartamento = 0;
const estados = [];
for (const p of provincias) {
  const prov = p.properties.in1;
  const codigo = ISO[prov];
  if (!codigo) throw new Error(`Sem código ISO para a província ${p.properties.nam}`);
  const deps = departamentos.filter((d) => d.properties.in1.startsWith(prov));
  // Terra do Fogo: o contorno da província sem a Antártida e as ilhas do Atlântico Sul
  const contorno = prov === "94" ? await unir(deps.map((d) => d.geometry)) : p.geometry;

  let municipios = prov === CABA
    ? [{ codigo: MUNICIPIO_CABA, nome: "Ciudad Autónoma de Buenos Aires", geometry: contorno }]
    : [...porCodigo].filter(([c]) => c.startsWith(prov)).map(([c, m]) => ({ codigo: c, ...m }));

  if (SEM_DEPARTAMENTO.has(prov)) {
    kb += gravar(`public/geo/ar/municipios-${codigo}.json`, municipios.map((m) => forma(m.geometry, { codigo: m.codigo, nome: m.nome }, 3, 0.001)));
  } else {
    const porDepartamento = new Map();
    municipios = municipios.map((m) => {
      // O ponto oficial do governo local decide o departamento; o centro da forma erra nos municípios em forma de U
      const preferidos = [pontoDoCodigo.get(m.codigo), pontoInterno(m.geometry)].filter(Boolean);
      const departamento = areaDaForma(m.geometry, deps, preferidos)?.properties.in1 ?? "";
      if (!departamento) semDepartamento++;
      porDepartamento.set(departamento, (porDepartamento.get(departamento) ?? 0) + 1);
      return { ...m, departamento };
    });
    kb += gravar(`public/geo/ar/condados-${codigo}.json`, deps.map((d) =>
      forma(d.geometry, { codigo: d.properties.in1, nome: d.properties.nam, total: porDepartamento.get(d.properties.in1) ?? 0 }, 3, 0.003)));
    kb += gravar(`public/geo/ar/municipios-${codigo}.json`, municipios.map((m) =>
      forma(m.geometry, { codigo: m.codigo, nome: m.nome, condado: m.departamento }, 3, 0.001)));
  }
  totalPais += municipios.length;
  estados.push(forma(contorno, { codigo, nome: p.properties.nam, total: municipios.length }, 3, 0.004));
}
kb += gravar("public/geo/ar/estados.json", estados);

console.log(`Argentina: ${estados.length} províncias, ${departamentos.length} departamentos, ${totalPais} municípios (${semDepartamento} sem departamento), ${kb.toFixed(0)} KB`);
console.log(`Códigos corrigidos pelo ponto do IGN: ${corrigidos.join("; ") || "nenhum"}`);
console.log(`Contornos sem município correspondente (fora): ${descartados.join(", ") || "nenhum"}`);
console.log(estados.map((e) => `${e.properties.codigo} ${e.properties.nome} (${e.properties.total})`).join(" | "));
