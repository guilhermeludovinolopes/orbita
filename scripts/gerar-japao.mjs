// Gera os mapas do Japão a partir dos limites administrativos oficiais do Ministério da Terra (MLIT,
// Dados Numéricos Nacionais N03, 1º/1/2025: nlftp.mlit.go.jp/ksj/gml/data/N03/N03-2025/N03-20250101_GML.zip),
// com os códigos de município do governo (JIS X 0402, 5 dígitos), e dos nomes em romaji do Correio japonês
// (KEN_ALL_ROME.CSV: www.post.japanpost.jp/service/search/zipcode/download/roman-zip.html).
//
//   public/geo/jp/estados.json             províncias (JP-13), com o total de municípios
//   public/geo/jp/municipios-JP-13.json    municípios (13113): cidades, vilas, aldeias e os 23 distritos de Tóquio
//
// As cidades com distritos (政令指定都市, como Yokohama) entram como um município só, com os distritos juntos.
//
// Uso: node scripts/gerar-japao.mjs <pasta com N03-20250101.shp e N03-20250101_prefecture.shp> <KEN_ALL_ROME.CSV>
import { readFileSync } from "node:fs";
import { forma, gravar, lerShapefile } from "./geo-comum.mjs";

const [pasta, romaji] = process.argv.slice(2);
const CURILAS = new Set(["01695", "01696", "01697", "01698", "01699", "01700"]);
// Onde o Correio não tem o romaji pelo mesmo nome (ilhas de Tóquio, Sue), ou usa outra grafia (Gumma)
const ROMAJI_FIXO = { "13381": "Miyake-mura", "13401": "Hachijo-machi", "40344": "Sue-machi" };
const PROVINCIA_FIXA = { "群馬県": "Gunma" };

// Romaji do Correio: "KAMIKITA GUN YOKOHAMA MACHI" → "Yokohama-machi"; "AKITA SHI" → "Akita"; "SHIBUYA KU" → "Shibuya"
const titulo = (t) => t.toLowerCase().replace(/\b[a-z]/g, (l) => l.toUpperCase());
function nomeRomaji(texto) {
  const semGun = texto.replace(/^.* GUN /, "");
  const m = semGun.match(/^(.*) (SHI|KU|MACHI|CHO|MURA|SON|TO|FU|KEN)$/);
  if (!m) return titulo(semGun);
  const [, base, tipo] = m;
  return ["MACHI", "CHO", "MURA", "SON"].includes(tipo) ? `${titulo(base)}-${tipo.toLowerCase()}` : titulo(base);
}
const linhas = new TextDecoder("shift_jis").decode(readFileSync(romaji)).split(/\r?\n/)
  .map((l) => l.split(",").map((c) => c.replace(/^"|"$/g, "")));
const romajiPorNome = new Map(); // "東京都|渋谷区" → "SHIBUYA KU"
const romajiProvincia = new Map(); // "東京都" → "TOKYO TO"
for (const [, prov, cidade, , provR, cidadeR] of linhas) {
  if (!cidadeR) continue;
  romajiPorNome.set(`${prov}|${cidade}`, cidadeR);
  romajiProvincia.set(prov, provR);
}

// Municípios: junta as partes (ilhas) de cada código e os distritos das cidades designadas
const partes = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
const municipios = new Map();
for (const f of await lerShapefile(`${pasta}/N03-20250101`)) {
  const p = f.properties;
  // Fora: áreas ainda sem município definido (código terminado em 000) e as 6 aldeias das Curilas do Sul,
  // que no globo são da Rússia
  if (!p.N03_007 || !p.N03_004 || !f.geometry || p.N03_007.endsWith("000") || CURILAS.has(p.N03_007)) continue;
  const designada = Boolean(p.N03_005);
  const chave = designada ? `${p.N03_001}|${p.N03_004}` : p.N03_007;
  const atual = municipios.get(chave);
  if (atual) {
    atual.coords.push(...partes(f.geometry));
    if (designada) atual.codigo = String(Math.min(Number(atual.codigo), Number(p.N03_007) - 1)).padStart(5, "0");
    continue;
  }
  // Romaji: o Correio escreve "上北郡　横浜町" e, nas cidades designadas, "札幌市　中央区"
  const cidade = designada ? `${p.N03_004}　${p.N03_005}` : p.N03_003 ? `${p.N03_003}　${p.N03_004}` : p.N03_004;
  const r = romajiPorNome.get(`${p.N03_001}|${cidade}`);
  const latino = ROMAJI_FIXO[p.N03_007] ?? (r ? nomeRomaji(designada ? r.replace(/ SHI .*$/, " SHI") : r) : null);
  municipios.set(chave, {
    codigo: designada ? String(Number(p.N03_007) - 1).padStart(5, "0") : p.N03_007,
    provincia: p.N03_001,
    nome: latino ? `${latino} (${p.N03_004})` : p.N03_004,
    coords: partes(f.geometry),
  });
}

// O arquipélago tem milhares de ilhotas: cada nível só guarda as ilhas acima de uma área mínima (em graus²)
const areaAnel = (r) => Math.abs(r.reduce((s, [x1, y1], i) => { const [x2, y2] = r[(i + 1) % r.length]; return s + x1 * y2 - x2 * y1; }, 0)) / 2;
const semIlhotas = (coords, minimo) => {
  const grandes = coords.filter((p) => areaAnel(p[0]) >= minimo);
  return { type: "MultiPolygon", coordinates: grandes.length ? grandes : [coords.reduce((a, b) => (areaAnel(b[0]) > areaAnel(a[0]) ? b : a))] };
};

const provincias = new Map();
for (const f of await lerShapefile(`${pasta}/N03-20250101_prefecture`)) {
  if (!f.geometry) continue;
  const atual = provincias.get(f.properties.N03_001) ?? [];
  atual.push(...partes(f.geometry));
  provincias.set(f.properties.N03_001, atual);
}

let kb = 0, total = 0, semRomaji = 0;
const estados = [];
for (const [prov, coords] of provincias) {
  const lista = [...municipios.values()].filter((m) => m.provincia === prov);
  const codigo = `JP-${lista[0].codigo.slice(0, 2)}`;
  semRomaji += lista.filter((m) => !/\(/.test(m.nome)).length;
  kb += gravar(`public/geo/jp/municipios-${codigo}.json`, lista.map((m) =>
    forma(semIlhotas(m.coords, 0.00005), { codigo: m.codigo, nome: m.nome }, 3, 0.001)));
  total += lista.length;
  const r = romajiProvincia.get(prov);
  const latino = PROVINCIA_FIXA[prov] ?? (r ? nomeRomaji(r) : null);
  estados.push(forma(semIlhotas(coords, 0.001), { codigo, nome: latino ? `${latino} (${prov})` : prov, total: lista.length }, 3, 0.004));
}
estados.sort((a, b) => a.properties.codigo.localeCompare(b.properties.codigo));
kb += gravar("public/geo/jp/estados.json", estados);
console.log(`Japão: ${estados.length} províncias, ${total} municípios (${semRomaji} sem romaji), ${kb.toFixed(0)} KB`);
console.log(estados.map((e) => `${e.properties.codigo} ${e.properties.nome} (${e.properties.total})`).join(" | "));
