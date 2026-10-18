// Ferramentas comuns aos scripts que geram os mapas de cada país em public/geo/<país>/.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import shapefile from "shapefile";

export const lerJson = (arquivo) => JSON.parse(readFileSync(arquivo, "utf8"));

export async function lerShapefile(caminhoSemExtensao) {
  const fonte = await shapefile.open(`${caminhoSemExtensao}.shp`, `${caminhoSemExtensao}.dbf`, { encoding: "utf-8" });
  const features = [];
  for (let r = await fonte.read(); !r.done; r = await fonte.read()) features.push(r.value);
  return features;
}

export function normalizar(texto) {
  return String(texto).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// 4 casas decimais (~10 m) por padrão; 3 (~100 m) onde há milhares de áreas pequenas
const arredondar = (c, casas) => {
  const f = 10 ** casas;
  return typeof c[0] === "number" ? c.map((n) => Math.round(n * f) / f) : c.map((x) => arredondar(x, casas));
};

// Remove pontos repetidos que o arredondamento cria em sequência
const limpar = (c) =>
  typeof c[0][0] === "number" ? c.filter((p, i) => i === 0 || p[0] !== c[i - 1][0] || p[1] !== c[i - 1][1]) : c.map(limpar);

// Douglas-Peucker: tira pontos que se desviam menos que a tolerância (em graus) da linha
function simplificarAnel(anel, tolerancia) {
  if (anel.length <= 8) return anel;
  const manter = new Uint8Array(anel.length);
  manter[0] = manter[anel.length - 1] = 1;
  const pilha = [[0, anel.length - 1]];
  while (pilha.length) {
    const [a, b] = pilha.pop();
    const [ax, ay] = anel[a], [bx, by] = anel[b];
    const dx = bx - ax, dy = by - ay, comp = Math.hypot(dx, dy);
    let maior = 0, indice = -1;
    for (let i = a + 1; i < b; i++) {
      // Anel fechado: as pontas coincidem, então mede a distância até o ponto
      const d = comp < 1e-12
        ? Math.hypot(anel[i][0] - ax, anel[i][1] - ay)
        : Math.abs(dy * anel[i][0] - dx * anel[i][1] + bx * ay - by * ax) / comp;
      if (d > maior) [maior, indice] = [d, i];
    }
    if (maior > tolerancia) {
      manter[indice] = 1;
      pilha.push([a, indice], [indice, b]);
    }
  }
  const resultado = anel.filter((_, i) => manter[i]);
  return resultado.length >= 4 ? resultado : anel;
}
const simplificar = (c, tol) => (typeof c[0][0] === "number" ? simplificarAnel(c, tol) : c.map((x) => simplificar(x, tol)));

// casas: casas decimais das coordenadas; tolerancia: simplificação em graus (0 = nenhuma)
export const forma = (geometria, propriedades, casas = 4, tolerancia = 0) => {
  let coords = limpar(arredondar(geometria.coordinates, casas));
  if (tolerancia) coords = simplificar(coords, tolerancia);
  return { type: "Feature", properties: propriedades, geometry: { type: geometria.type, coordinates: coords } };
};

export function gravar(caminho, features) {
  mkdirSync(caminho.replace(/[\\/][^\\/]+$/, ""), { recursive: true });
  const json = JSON.stringify({ type: "FeatureCollection", features });
  writeFileSync(caminho, json);
  return json.length / 1024;
}

const poligonos = (g) => (g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);

function dentroDoAnel([x, y], anel) {
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i], [xj, yj] = anel[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

export const pontoDentro = (ponto, geometria) =>
  poligonos(geometria).some((p) => dentroDoAnel(ponto, p[0]) && !p.slice(1).some((buraco) => dentroDoAnel(ponto, buraco)));

// Um ponto que cai dentro da forma: o centro do maior polígono, ou um vértice dele se o centro cair fora
export function pontoInterno(geometria) {
  const maior = poligonos(geometria).sort((a, b) => b[0].length - a[0].length)[0][0];
  const centro = [0, 1].map((i) => maior.reduce((s, p) => s + p[i], 0) / maior.length);
  return pontoDentro(centro, geometria) ? centro : maior[0];
}

// Em qual das áreas (features) o ponto cai
export const areaDoPonto = (ponto, areas) => areas.find((a) => pontoDentro(ponto, a.geometry));

// Em qual área uma forma está: tenta os pontos dados e depois os vértices da própria forma
// (cidades na costa às vezes têm o ponto de referência no mar do contorno simplificado)
export function areaDaForma(geometria, areas, pontosPreferidos = []) {
  for (const p of pontosPreferidos) {
    const a = areaDoPonto(p, areas);
    if (a) return a;
  }
  for (const poligono of poligonos(geometria)) {
    for (const p of poligono[0]) {
      const a = areaDoPonto(p, areas);
      if (a) return a;
    }
  }
  return undefined;
}

// Junta várias geometrias numa só (para montar distritos a partir das comunas, por exemplo)
export async function unir(geometrias) {
  const { default: clipping } = await import("polygon-clipping");
  const coords = clipping.union(...geometrias.map((g) => poligonos(g)));
  return { type: "MultiPolygon", coordinates: coords };
}

// Lê a tabela de códigos ISO 3166-2 de uma página da Wikipédia (formato wiki bruto)
// O nome vem como {{flag|Nome}}, [[Página|Nome]] ou texto simples, conforme o país
export function codigosIso(textoWiki, prefixo) {
  const padrao = new RegExp(
    `\\{\\{mono\\|(${prefixo}-[A-Z0-9]+)\\}\\}\\s*\\n?\\|\\|?\\s*(?:\\{\\{flag\\|([^}|\\n]+)|\\[\\[(?:[^|\\]\\n]*\\|)?([^\\]\\n]+)\\]\\]|([^|\\n]+))`,
    "g",
  );
  const pares = [...textoWiki.matchAll(padrao)];
  return Object.fromEntries(pares.map(([, codigo, a, b, c]) => [normalizar((a ?? b ?? c).trim()), codigo]));
}
