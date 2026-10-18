// Gera os mapas de Portugal a partir do geoBoundaries (distritos da DGT e concelhos) e dos
// códigos DICO do INE, consultados por nome em json.geoapi.pt:
//   public/geo/pt/estados.json            distritos e regiões autónomas (PT-11), com o total de concelhos
//   public/geo/pt/municipios-PT-11.json   concelhos (DICO 1106)
//
// Portugal não tem o nível de condado: o zoom vai do distrito direto ao concelho.
//
// Uso: node scripts/gerar-portugal.mjs <prt-adm1.geojson> <prt-adm2.geojson> <arquivo de cache dos códigos>
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { areaDaForma, forma, gravar, lerJson, pontoInterno } from "./geo-comum.mjs";

const [arqDistritos, arqConcelhos, arqCache] = process.argv.slice(2);
// O geoBoundaries de Portugal tem os acentos em UTF-8 lido como Latin-1 ("RegiÃ£o")
const consertar = (t) => (/Ã|Â/.test(t) ? Buffer.from(t, "latin1").toString("utf8") : t);

// Erros de digitação dos nomes na base (ela vem da Wikipédia)
const NOMES_CERTOS = {
  "Alijezur": "Aljezur", "Ferriera do Alentejo": "Ferreira do Alentejo", "Setubul": "Setúbal", "Barriero": "Barreiro",
  "Alcanenena": "Alcanena", "Server do Vouga": "Sever do Vouga", "Povoa de Lanhosa": "Póvoa de Lanhoso",
};
// Distritos vêm em maiúsculas: "VIANA DO CASTELO" -> "Viana do Castelo"
const PEQUENAS = new Set(["do", "da", "de", "dos", "das"]);
const titulo = (t) => (t === t.toUpperCase() ? t.toLowerCase().split(" ").map((p, i) => (i && PEQUENAS.has(p) ? p : p[0].toUpperCase() + p.slice(1))).join(" ") : t);

const distritos = lerJson(arqDistritos).features.map((f) => ({ ...f, properties: { ...f.properties, shapeName: titulo(consertar(f.properties.shapeName)) } }));
const concelhos = lerJson(arqConcelhos).features.map((f) => {
  const nome = consertar(f.properties.shapeName);
  return { ...f, properties: { ...f.properties, shapeName: NOMES_CERTOS[nome] ?? nome } };
});

// Código DICO e nome oficial (com acentos) de cada concelho, guardados num cache para não consultar de novo
const cache = existsSync(arqCache) ? JSON.parse(readFileSync(arqCache, "utf8")) : {};
async function dico(nome) {
  if (!(nome in cache) || typeof cache[nome] === "string") {
    const r = await fetch(`https://json.geoapi.pt/municipio/${encodeURIComponent(nome)}`);
    const dados = r.ok ? await r.json() : {};
    cache[nome] = dados.codigoine ? { codigo: dados.codigoine, nome: dados.nome } : null;
  }
  return cache[nome];
}

// DICO começa pelo código do distrito; nas ilhas, 3x = Madeira e 4x = Açores
const distritoDoDico = (codigo) => {
  const d = Number(codigo.slice(0, 2));
  return d <= 18 ? `PT-${codigo.slice(0, 2)}` : d < 40 ? "PT-30" : "PT-20";
};

const porDistrito = new Map(distritos.map((d) => [d.properties.shapeISO, []]));
const semCodigo = [];
for (const c of concelhos) {
  const oficial = await dico(c.properties.shapeName);
  const codigo = oficial?.codigo;
  if (!codigo) {
    semCodigo.push(c.properties.shapeName);
    continue;
  }
  const distrito = distritoDoDico(codigo);
  // Confere com a forma: se o DICO não bater com nenhum distrito, usa a posição
  const destino = porDistrito.has(distrito) ? distrito : areaDaForma(c.geometry, distritos, [pontoInterno(c.geometry)])?.properties.shapeISO;
  // Um concelho em mais de uma forma (ilhas, enclaves) vira uma forma só, com várias partes
  const lista = porDistrito.get(destino);
  const nova = forma(c.geometry, { codigo, nome: oficial.nome }, 4, 0.0008);
  const existente = lista?.find((f) => f.properties.codigo === codigo);
  if (existente) {
    const partes = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
    existente.geometry = { type: "MultiPolygon", coordinates: [...partes(existente.geometry), ...partes(nova.geometry)] };
  } else lista?.push(nova);
}
writeFileSync(arqCache, JSON.stringify(cache, null, 1));

let kb = 0;
const estados = distritos.map((d) => {
  const lista = porDistrito.get(d.properties.shapeISO);
  kb += gravar(`public/geo/pt/municipios-${d.properties.shapeISO}.json`, lista);
  return forma(d.geometry, { codigo: d.properties.shapeISO, nome: d.properties.shapeName, total: lista.length }, 4, 0.002);
});
kb += gravar("public/geo/pt/estados.json", estados);
const total = estados.reduce((s, e) => s + e.properties.total, 0);
console.log(`Portugal: ${estados.length} distritos, ${total} concelhos com código, sem código: ${semCodigo.join(", ") || "nenhum"}, ${kb.toFixed(0)} KB`);
