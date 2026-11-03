// Gera os mapas da Bolívia a partir dos limites administrativos do Ministerio de Desarrollo Rural y Tierras
// (versão v02, válida desde 2024-09-16), publicados na HDX (cod-ab-bol, "bol_admin_boundaries.geojson.zip").
// Os P-codes são os códigos do INE da Bolívia com "BO" na frente.
//
//   public/geo/bo/estados.json             departamentos (BO-L), com o total de municípios
//   public/geo/bo/condados-BO-L.json       províncias de um departamento (INE 0201), com o total de municípios
//   public/geo/bo/municipios-BO-L.json     municípios (INE 020101), com a província
//
// Uso: node scripts/gerar-bolivia.mjs <pasta com bol_admin1.geojson, bol_admin2.geojson e bol_admin3.geojson>
import { forma, gravar, lerJson } from "./geo-comum.mjs";

const [pasta] = process.argv.slice(2);

// ISO 3166-2:BO pelo código INE do departamento
const ISO = { "01": "BO-H", "02": "BO-L", "03": "BO-C", "04": "BO-O", "05": "BO-P", "06": "BO-T", "07": "BO-S", "08": "BO-B", "09": "BO-N" };
const ine = (pcode) => pcode.replace(/^BO/, "");

const ler = (nivel) => lerJson(`${pasta}/bol_admin${nivel}.geojson`).features;
const departamentos = ler(1);
const provincias = ler(2);
const municipios = ler(3);

let kb = 0;
const estados = [];
for (const d of departamentos) {
  const dep = ine(d.properties.adm1_pcode);
  const codigo = ISO[dep];
  if (!codigo) throw new Error(`Sem código ISO para o departamento ${d.properties.adm1_name}`);
  const doDepartamento = municipios.filter((m) => m.properties.adm1_pcode === d.properties.adm1_pcode);
  const porProvincia = new Map();
  for (const m of doDepartamento) porProvincia.set(ine(m.properties.adm2_pcode), (porProvincia.get(ine(m.properties.adm2_pcode)) ?? 0) + 1);

  kb += gravar(`public/geo/bo/condados-${codigo}.json`, provincias
    .filter((p) => p.properties.adm1_pcode === d.properties.adm1_pcode)
    .map((p) => forma(p.geometry, { codigo: ine(p.properties.adm2_pcode), nome: p.properties.adm2_name, total: porProvincia.get(ine(p.properties.adm2_pcode)) ?? 0 }, 3, 0.003)));
  kb += gravar(`public/geo/bo/municipios-${codigo}.json`, doDepartamento.map((m) =>
    forma(m.geometry, { codigo: ine(m.properties.adm3_pcode), nome: m.properties.adm3_name, condado: ine(m.properties.adm2_pcode) }, 3, 0.001)));
  estados.push(forma(d.geometry, { codigo, nome: d.properties.adm1_name, total: doDepartamento.length }, 3, 0.004));
}
kb += gravar("public/geo/bo/estados.json", estados);
console.log(`Bolívia: ${estados.length} departamentos, ${provincias.length} províncias, ${municipios.length} municípios, ${kb.toFixed(0)} KB`);
console.log(estados.map((e) => `${e.properties.codigo} ${e.properties.nome} (${e.properties.total})`).join(" | "));
