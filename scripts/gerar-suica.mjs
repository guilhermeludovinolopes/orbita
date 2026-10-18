// Gera os mapas da Suíça a partir do geoBoundaries (formas da swisstopo, 2022) e do registro
// oficial de comunas do BFS (códigos atuais):
//   public/geo/ch/estados.json            cantões (CH-GR), com o total de comunas
//   public/geo/ch/condados-CH-GR.json     distritos / regiões (código BFS 1849), montados juntando as comunas
//   public/geo/ch/municipios-CH-GR.json   comunas (código BFS 3851), com o distrito
//
// As formas são de 2022: comunas que se fundiram depois e não acham o nome no registro atual
// ficam de fora, assim como os lagos e as comunas de Liechtenstein que vêm na mesma base.
//
// Uso: node scripts/gerar-suica.mjs <che-adm1.geojson> <che-adm3.geojson> <bfs-comunas.csv>
import { readFileSync } from "node:fs";
import { areaDaForma, forma, gravar, lerJson, normalizar, pontoInterno, unir } from "./geo-comum.mjs";

const [arqCantoes, arqComunas, arqBfs] = process.argv.slice(2);
const cantoes = lerJson(arqCantoes).features;
const comunas = lerJson(arqComunas).features;

// Registro BFS: nível 1 = cantão, 2 = distrito, 3 = comuna; "Parent" aponta para o nível de cima
const linhas = readFileSync(arqBfs, "utf8").trim().split(/\r?\n/);
const cab = linhas[0].split(",");
const registro = linhas.slice(1).map((l) => Object.fromEntries(l.split(",").map((v, i) => [cab[i], v])));
// O HistoricalCode se repete entre níveis (10315 é um distrito e também uma comuna):
// o pai de um registro é sempre procurado no nível imediatamente acima
const porNivel = new Map(registro.map((r) => [`${r.Level}|${r.HistoricalCode}`, r]));
const pai = (r) => porNivel.get(`${Number(r.Level) - 1}|${r.Parent}`);
const siglaDoCantao = (r) => (r.Level === "1" ? r.ShortName : siglaDoCantao(pai(r)));
const comunasBfs = new Map(); // nome normalizado (sem o sufixo "(AG)") + cantão -> comuna
const porNome = new Map(); // nome normalizado -> comunas com esse nome no país inteiro
for (const r of registro.filter((r) => r.Level === "3")) {
  const nome = normalizar(r.Name.replace(/\s*\([A-Z]{2}\)$/, ""));
  comunasBfs.set(`${nome}|${siglaDoCantao(r)}`, r);
  porNome.set(nome, [...(porNome.get(nome) ?? []), r]);
}
const naoAchadas = [];

const porCantao = new Map(cantoes.map((c) => [c.properties.shapeISO, { cantao: c, comunas: [] }]));
let semCodigo = 0;
for (const c of comunas) {
  const nome = normalizar(c.properties.shapeName.replace(/\s*\([A-Z]{2}\)$/, ""));
  let cantao = areaDaForma(c.geometry, cantoes, [pontoInterno(c.geometry)])?.properties.shapeISO;
  // Nome único no país: confia no registro, mesmo se a forma encostar no cantão vizinho
  const unica = porNome.get(nome)?.length === 1 ? porNome.get(nome)[0] : null;
  if (unica) cantao = `CH-${siglaDoCantao(unica)}`;
  if (!cantao) continue;
  const bfs = unica ?? comunasBfs.get(`${nome}|${cantao.replace("CH-", "")}`);
  if (!bfs) { semCodigo++; naoAchadas.push(c.properties.shapeName); }
  porCantao.get(cantao).comunas.push({ forma: c, bfs, distrito: bfs ? pai(bfs) : null });
}

let kb = 0;
const estados = [];
const partes = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
for (const [codigo, { cantao, comunas: lista }] of porCantao) {
  // Uma comuna pode vir em vários pedaços na base: junta tudo pelo código BFS.
  // Sem código = lago, comuna de Liechtenstein ou comuna já fundida: fica fora do mapa.
  const porCodigo = new Map();
  for (const item of lista.filter((i) => i.bfs)) {
    const c = porCodigo.get(item.bfs.BfsCode) ?? { bfs: item.bfs, distrito: item.distrito, coords: [] };
    c.coords.push(...partes(item.forma.geometry));
    porCodigo.set(item.bfs.BfsCode, c);
  }
  const comunasDoCantao = [...porCodigo.values()].map((c) => ({ ...c, geometria: { type: "MultiPolygon", coordinates: c.coords } }));

  const distritos = new Map();
  for (const c of comunasDoCantao) {
    const d = distritos.get(c.distrito.BfsCode) ?? { nome: c.distrito.Name, geometrias: [], total: 0 };
    d.geometrias.push(c.geometria);
    d.total++;
    distritos.set(c.distrito.BfsCode, d);
  }
  const condados = [];
  for (const [codigoDistrito, d] of distritos) {
    condados.push(forma(await unir(d.geometrias), { codigo: codigoDistrito, nome: d.nome, total: d.total }, 4, 0.001));
  }
  kb += gravar(`public/geo/ch/condados-${codigo}.json`, condados);
  kb += gravar(`public/geo/ch/municipios-${codigo}.json`, comunasDoCantao.map((c) =>
    forma(c.geometria, { codigo: c.bfs.BfsCode, nome: c.bfs.Name, condado: c.distrito.BfsCode }, 4, 0.0005)));
  estados.push(forma(cantao.geometry, { codigo, nome: cantao.properties.shapeName, total: comunasDoCantao.length }, 4, 0.001));
}kb += gravar("public/geo/ch/estados.json", estados);
console.log("Exemplos sem código:", naoAchadas.slice(0, 30).join(" | "));
console.log(`Suíça: ${estados.length} cantões, ${comunas.length} comunas (${semCodigo} sem código no registro atual), ${kb.toFixed(0)} KB`);
