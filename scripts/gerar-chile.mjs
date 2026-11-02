// Gera os mapas do Chile a partir da División Político Administrativa da SUBDERE (2018), com os
// códigos únicos territoriais (CUT) do INE, servida pelo IDE do Ministério de Obras Públicas:
//   rest-sit.mop.gob.cl/arcgis/rest/services/INTEROP/SERVICIO_DPA/MapServer (camadas 1, 2 e 3)
// baixada em lotes e convertida para GeoJSON (regiones.json, provincias.json, comunas.json).
//
//   public/geo/cl/estados.json             regiões (CL-RM), com o total de comunas
//   public/geo/cl/condados-CL-RM.json      províncias de uma região (CUT 131), com o total de comunas
//   public/geo/cl/municipios-CL-RM.json    comunas (CUT 13101), com a província
//
// O Território Chileno Antártico (ao sul de 60° S) fica de fora: no globo ele é a Antártida.
//
// Uso: node scripts/gerar-chile.mjs <pasta com regiones.json, provincias.json e comunas.json>
import { forma, gravar, lerJson } from "./geo-comum.mjs";

const [pasta] = process.argv.slice(2);

// ISO 3166-2:CL pelo código CUT da região
const ISO = {
  "01": "CL-TA", "02": "CL-AN", "03": "CL-AT", "04": "CL-CO", "05": "CL-VS", "06": "CL-LI", "07": "CL-ML", "08": "CL-BI",
  "09": "CL-AR", "10": "CL-LL", "11": "CL-AI", "12": "CL-MA", "13": "CL-RM", "14": "CL-LR", "15": "CL-AP", "16": "CL-NB",
};

// Tira as partes ao sul de 60° S; a área que ficar vazia sai do mapa
const LIMITE_ANTARTICO = -60;
const semAntartida = (g) => {
  const partes = g.coordinates.filter((p) => p[0].some(([, y]) => y > LIMITE_ANTARTICO));
  return partes.length ? { type: "MultiPolygon", coordinates: partes } : null;
};
const ler = (nome) =>
  lerJson(`${pasta}/${nome}.json`).features
    .map((f) => ({ ...f, geometry: semAntartida(f.geometry) }))
    .filter((f) => f.geometry);
// Os fiordes do sul têm milhares de ilhotas: cada nível só guarda as ilhas acima de uma área mínima (em graus²)
const areaAnel = (r) => Math.abs(r.reduce((s, [x1, y1], i) => { const [x2, y2] = r[(i + 1) % r.length]; return s + x1 * y2 - x2 * y1; }, 0)) / 2;
const semIlhotas = (g, minimo) => {
  const partes = g.coordinates.filter((p) => areaAnel(p[0]) >= minimo);
  const maior = g.coordinates.reduce((a, b) => (areaAnel(b[0]) > areaAnel(a[0]) ? b : a));
  return { type: "MultiPolygon", coordinates: partes.length ? partes : [maior] };
};
const cut = (n, digitos) => String(n).padStart(digitos, "0");

const regioes = ler("regiones");
const provincias = ler("provincias");
const comunas = ler("comunas");

let kb = 0;
const estados = [];
for (const r of regioes) {
  const reg = cut(r.properties.CUT_REG, 2);
  const codigo = ISO[reg];
  if (!codigo) throw new Error(`Sem código ISO para a região ${r.properties.REGION}`);
  const daRegiao = comunas.filter((c) => cut(c.properties.CUT_REG, 2) === reg);
  const porProvincia = new Map();
  for (const c of daRegiao) porProvincia.set(cut(c.properties.CUT_PROV, 3), (porProvincia.get(cut(c.properties.CUT_PROV, 3)) ?? 0) + 1);

  kb += gravar(`public/geo/cl/condados-${codigo}.json`, provincias
    .filter((p) => cut(p.properties.CUT_REG, 2) === reg)
    .map((p) => forma(semIlhotas(p.geometry, 0.0005), { codigo: cut(p.properties.CUT_PROV, 3), nome: p.properties.PROVINCIA, total: porProvincia.get(cut(p.properties.CUT_PROV, 3)) ?? 0 }, 3, 0.003)));
  kb += gravar(`public/geo/cl/municipios-${codigo}.json`, daRegiao.map((c) =>
    forma(semIlhotas(c.geometry, 0.0001), { codigo: cut(c.properties.CUT_COM, 5), nome: c.properties.COMUNA, condado: cut(c.properties.CUT_PROV, 3) }, 3, 0.001)));
  estados.push(forma(semIlhotas(r.geometry, 0.002), { codigo, nome: r.properties.REGION, total: daRegiao.length }, 3, 0.004));
}
kb += gravar("public/geo/cl/estados.json", estados);
console.log(`Chile: ${estados.length} regiões, ${provincias.length} províncias, ${comunas.length} comunas, ${kb.toFixed(0)} KB`);
console.log(estados.map((e) => `${e.properties.codigo} ${e.properties.nome} (${e.properties.total})`).join(" | "));
