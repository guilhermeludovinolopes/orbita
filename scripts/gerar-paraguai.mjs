// Gera os mapas do Paraguai a partir da Cartografia Censal 2022 do INE (ine.gov.py, "territorio.rar"
// em GeoJSON, SIRGAS 2000), com os códigos do INE:
//   public/geo/py/estados.json             departamentos e a capital (PY-11), com o total de distritos
//   public/geo/py/municipios-PY-11.json    distritos (INE 1101)
//
// Uso: node scripts/gerar-paraguai.mjs <pasta com "Departamentos Paraguay_2022.geojson" e "Distritos Paraguay_2022.geojson">
import { forma, gravar, lerJson } from "./geo-comum.mjs";

const [pasta] = process.argv.slice(2);

// ISO 3166-2:PY pelo código INE do departamento (Boquerón e Alto Paraguay têm a ordem trocada na ISO)
const ISO = {
  "00": "PY-ASU", "01": "PY-1", "02": "PY-2", "03": "PY-3", "04": "PY-4", "05": "PY-5", "06": "PY-6", "07": "PY-7", "08": "PY-8",
  "09": "PY-9", "10": "PY-10", "11": "PY-11", "12": "PY-12", "13": "PY-13", "14": "PY-14", "15": "PY-15", "16": "PY-19", "17": "PY-16",
};

// O INE escreve os nomes em maiúsculas: "SAN RAFAEL DEL PARANÁ" → "San Rafael del Paraná"
const MINUSCULAS = new Set(["de", "del", "la", "las", "los", "y", "el"]);
const nome = (texto) =>
  texto.trim().toLowerCase().split(/\s+/)
    .map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ")
    .replace(/\.([a-z])/g, (_, l) => `.${l.toUpperCase()}`) // R.I. 3 Corrales
    .replace(/\bO'([a-z])/g, (_, l) => `O'${l.toUpperCase()}`); // O'Leary (o Azote'y guarani fica como está)

const departamentos = lerJson(`${pasta}/Departamentos Paraguay_2022.geojson`).features;
const distritos = lerJson(`${pasta}/Distritos Paraguay_2022.geojson`).features;

let kb = 0;
const estados = [];
for (const d of departamentos) {
  const codigo = ISO[d.properties.DPTO];
  if (!codigo) throw new Error(`Sem código ISO para o departamento ${d.properties.DPTO_DESC}`);
  const doDepartamento = distritos.filter((x) => x.properties.DPTO === d.properties.DPTO);
  kb += gravar(`public/geo/py/municipios-${codigo}.json`, doDepartamento.map((x) =>
    forma(x.geometry, { codigo: x.properties.CLAVE, nome: nome(x.properties.DIST_DESC_) }, 3, 0.001)));
  estados.push(forma(d.geometry, { codigo, nome: nome(d.properties.DPTO_DESC), total: doDepartamento.length }, 3, 0.003));
}
kb += gravar("public/geo/py/estados.json", estados);
console.log(`Paraguai: ${estados.length} departamentos, ${distritos.length} distritos, ${kb.toFixed(0)} KB`);
console.log(estados.map((e) => `${e.properties.codigo} ${e.properties.nome} (${e.properties.total})`).join(" | "));
