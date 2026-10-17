// Gera public/geo/oceano.jpg a partir da Blue Marble Next Generation da NASA (domínio público),
// arquivo world.topo.bathy.200412.3x5400x2700.jpg (relevo + batimetria, dezembro de 2004).
//
// A imagem da NASA é equirretangular (latitude linear); o mapa trabalha em Web Mercator.
// Este script reprojeta para um quadrado Mercator, que o globo usa como fundo do mar.
//
// Uso: node scripts/gerar-oceano.mjs <caminho do world.topo.bathy...jpg>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import jpeg from "jpeg-js";

const LADO = 2048; // pixels do quadrado de saída
const LAT_MAX = 85.0511287798; // limite do Web Mercator
const AGUA_RASA = [38, 84, 146]; // tom do mar raso perto das costas na própria foto

const origem = jpeg.decode(readFileSync(process.argv[2]), { maxMemoryUsageInMB: 1024 });
const { width: lo, height: ao, data: px } = origem;
const saida = Buffer.alloc(LADO * LADO * 4);

// Amostra com interpolação bilinear na imagem de origem
function amostra(x, y, canal) {
  const x0 = Math.floor(x), y0 = Math.min(Math.floor(y), ao - 2);
  const fx = x - x0, fy = y - y0;
  const x1 = (x0 + 1) % lo;
  const p = (xx, yy) => px[(yy * lo + xx) * 4 + canal];
  return (p(x0, y0) * (1 - fx) + p(x1, y0) * fx) * (1 - fy) + (p(x0, y0 + 1) * (1 - fx) + p(x1, y0 + 1) * fx) * fy;
}

for (let y = 0; y < LADO; y++) {
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 0.5)) / LADO))) * 180) / Math.PI;
  const ys = Math.max(0, ((90 - lat) / 180) * ao - 0.5);
  for (let x = 0; x < LADO; x++) {
    const xs = ((x + 0.5) / LADO) * lo - 0.5;
    const xw = xs < 0 ? xs + lo : xs;
    const i = (y * LADO + x) * 4;
    const [r, g, b] = [0, 1, 2].map((c) => amostra(xw, ys, c));
    // Terra, gelo e água barrenta da foto aparecem nas bordas dos países como manchas.
    // Todo pixel que não é claramente mar vira azul de águas rasas.
    const ehMar = b > r + 12 && b >= g && r < 100; // r alto = neve ou gelo, mesmo azulados
    [saida[i], saida[i + 1], saida[i + 2]] = ehMar ? [r, g, b] : AGUA_RASA;
    saida[i + 3] = 255;
  }
}

mkdirSync("public/geo", { recursive: true });
const jpg = jpeg.encode({ data: saida, width: LADO, height: LADO }, 82);
writeFileSync("public/geo/oceano.jpg", jpg.data);
console.log(`oceano.jpg: ${LADO}x${LADO}, ${(jpg.data.length / 1024).toFixed(0)} KB (lat ±${LAT_MAX.toFixed(2)})`);
