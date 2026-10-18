// Gera os mapas da Itália a partir dos limites administrativos generalizados do ISTAT (2025, CC BY),
// (projeção UTM 32N, convertida aqui para latitude/longitude), e da tabela ISO 3166-2:IT:
//   public/geo/it/estados.json            regiões (IT-25), com o total de comuni
//   public/geo/it/condados-IT-25.json     províncias / cidades metropolitanas (código ISTAT 215)
//   public/geo/it/municipios-IT-25.json   comuni (código ISTAT 015146), com a província
//
// Uso: node scripts/gerar-italia.mjs <pasta it-limiti> <arquivo iso-3166-2-it.txt>
import { readFileSync } from "node:fs";
import proj4 from "proj4";
import { codigosIso, forma, gravar, lerShapefile, normalizar } from "./geo-comum.mjs";

const [pasta, isoWiki] = process.argv.slice(2);
const iso = codigosIso(readFileSync(isoWiki, "utf8"), "IT");
// A Wikipédia usa a grafia local em algumas regiões; o ISTAT usa a forma com barra
const APELIDOS = { "valledaostavalleedaoste": "valledaosta", "trentinoaltoadigesudtirol": "trentinoaltoadige" };

// Os arquivos "_WGS84" do ISTAT têm datum WGS84 mas vêm projetados em UTM 32N (metros)
const utm32 = proj4("+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs", "EPSG:4326");
const paraGraus = (c) => (typeof c[0] === "number" ? utm32.forward(c) : c.map(paraGraus));
const ler = async (nome) =>
  (await lerShapefile(`${pasta}/${nome}/${nome}_WGS84`)).map((f) => ({ ...f, geometry: { ...f.geometry, coordinates: paraGraus(f.geometry.coordinates) } }));

const regioes = await ler("Reg01012025_g");
const provincias = await ler("ProvCM01012025_g");
const comuni = await ler("Com01012025_g");

let kb = 0;
const estados = [];
for (const r of regioes) {
  const chave = normalizar(r.properties.DEN_REG);
  const codigo = iso[APELIDOS[chave] ?? chave] ?? iso[chave.split("vallee")[0]];
  if (!codigo) throw new Error(`Sem código ISO para a região ${r.properties.DEN_REG}`);
  const daRegiao = comuni.filter((c) => c.properties.COD_REG === r.properties.COD_REG);
  const porProvincia = new Map();
  for (const c of daRegiao) porProvincia.set(c.properties.COD_UTS, (porProvincia.get(c.properties.COD_UTS) ?? 0) + 1);

  kb += gravar(`public/geo/it/condados-${codigo}.json`, provincias
    .filter((p) => p.properties.COD_REG === r.properties.COD_REG)
    .map((p) => forma(p.geometry, { codigo: String(p.properties.COD_UTS), nome: p.properties.DEN_UTS, total: porProvincia.get(p.properties.COD_UTS) ?? 0 }, 4, 0.002)));
  kb += gravar(`public/geo/it/municipios-${codigo}.json`, daRegiao.map((c) =>
    forma(c.geometry, { codigo: c.properties.PRO_COM_T, nome: c.properties.COMUNE, condado: String(c.properties.COD_UTS) }, 3, 0.001)));
  estados.push(forma(r.geometry, { codigo, nome: r.properties.DEN_REG, total: daRegiao.length }, 4, 0.003));
}
kb += gravar("public/geo/it/estados.json", estados);
console.log(`Itália: ${estados.length} regiões, ${provincias.length} províncias, ${comuni.length} comuni, ${kb.toFixed(0)} KB`);
console.log(estados.map((e) => `${e.properties.codigo} ${e.properties.nome}`).join(" | "));
