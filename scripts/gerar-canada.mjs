// Gera os mapas do Canadá a partir dos arquivos cartográficos de limites do Censo 2021 da Statistics Canada
// (projeção Lambert da StatCan, EPSG:3347, convertida aqui para latitude/longitude):
//   lpr_000a21a_e (províncias e territórios), lcd_000a21a_e (divisões censitárias), lcsd000a21a_e (subdivisões)
//
//   public/geo/ca/estados.json             províncias e territórios (CA-QC), com o total de subdivisões
//   public/geo/ca/condados-CA-QC.json      divisões censitárias: condados, MRCs, distritos regionais (CDUID 2466)
//   public/geo/ca/municipios-CA-QC.json    subdivisões censitárias: municípios, reservas e territórios não organizados (CSDUID 2466023)
//
// A StatCan barra download automático: os 3 .zip são baixados à mão de
// www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/
//
// Uso: node scripts/gerar-canada.mjs <pasta com as 3 pastas descompactadas>
import proj4 from "proj4";
import { forma, gravar, lerShapefile } from "./geo-comum.mjs";

const [pasta] = process.argv.slice(2);

const ISO = {
  10: "CA-NL", 11: "CA-PE", 12: "CA-NS", 13: "CA-NB", 24: "CA-QC", 35: "CA-ON", 46: "CA-MB",
  47: "CA-SK", 48: "CA-AB", 59: "CA-BC", 60: "CA-YT", 61: "CA-NT", 62: "CA-NU",
};

const lambert = proj4(
  "+proj=lcc +lat_0=63.390675 +lon_0=-91.8666666666667 +lat_1=49 +lat_2=77 +x_0=6200000 +y_0=3000000 +datum=NAD83 +units=m +no_defs",
  "EPSG:4326",
);
const paraGraus = (c) => (typeof c[0] === "number" ? lambert.forward(c) : c.map(paraGraus));

// O Ártico tem milhares de ilhotas: cada nível só guarda as ilhas acima de uma área mínima (em graus²)
const areaAnel = (r) => Math.abs(r.reduce((s, [x1, y1], i) => { const [x2, y2] = r[(i + 1) % r.length]; return s + x1 * y2 - x2 * y1; }, 0)) / 2;
const semIlhotas = (g, minimo) => {
  const partes = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  const grandes = partes.filter((p) => areaAnel(p[0]) >= minimo);
  const maior = partes.reduce((a, b) => (areaAnel(b[0]) > areaAnel(a[0]) ? b : a));
  return { type: "MultiPolygon", coordinates: grandes.length ? grandes : [maior] };
};

// Os .dbf da StatCan vêm em Latin-1
const ler = async (nome) =>
  (await lerShapefile(`${pasta}/${nome}/${nome}`, "latin1"))
    .map((f) => ({ ...f, geometry: { ...f.geometry, coordinates: paraGraus(f.geometry.coordinates) } }));

const provincias = await ler("lpr_000a21a_e");
const divisoes = await ler("lcd_000a21a_e");
const subdivisoes = await ler("lcsd000a21a_e");

let kb = 0;
const estados = [];
for (const p of provincias) {
  const codigo = ISO[p.properties.PRUID];
  if (!codigo) throw new Error(`Sem código ISO para ${p.properties.PRENAME}`);
  const daProvincia = subdivisoes.filter((s) => s.properties.PRUID === p.properties.PRUID);
  const porDivisao = new Map();
  for (const s of daProvincia) porDivisao.set(s.properties.CSDUID.slice(0, 4), (porDivisao.get(s.properties.CSDUID.slice(0, 4)) ?? 0) + 1);

  kb += gravar(`public/geo/ca/condados-${codigo}.json`, divisoes
    .filter((d) => d.properties.PRUID === p.properties.PRUID)
    .map((d) => forma(semIlhotas(d.geometry, 0.002), { codigo: d.properties.CDUID, nome: d.properties.CDNAME, total: porDivisao.get(d.properties.CDUID) ?? 0 }, 3, 0.004)));
  kb += gravar(`public/geo/ca/municipios-${codigo}.json`, daProvincia.map((s) =>
    forma(semIlhotas(s.geometry, 0.0002), { codigo: s.properties.CSDUID, nome: s.properties.CSDNAME, condado: s.properties.CSDUID.slice(0, 4) }, 3, 0.0015)));
  // Nome oficial na língua da província: só o Quebec usa o francês
  const nome = codigo === "CA-QC" ? p.properties.PRFNAME : p.properties.PRENAME;
  estados.push(forma(semIlhotas(p.geometry, 0.01), { codigo, nome, total: daProvincia.length }, 3, 0.006));
}
kb += gravar("public/geo/ca/estados.json", estados);
console.log(`Canadá: ${estados.length} províncias e territórios, ${divisoes.length} divisões, ${subdivisoes.length} subdivisões, ${kb.toFixed(0)} KB`);
console.log(estados.map((e) => `${e.properties.codigo} ${e.properties.nome} (${e.properties.total})`).join(" | "));
