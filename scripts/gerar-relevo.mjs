// Gera public/geo/relevo.png a partir do SR_50M.tif (relevo sombreado da Natural Earth,
// domínio público). O resultado é uma camada transparente: só as sombras (preto) e as
// encostas iluminadas (branco) aparecem, por cima das cores dos países.
//
// A imagem de origem é equirretangular; a saída é um quadrado Web Mercator, como o mar.
//
// Uso: node scripts/gerar-relevo.mjs <caminho do SR_50M.tif>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import UTIF from "utif";
import { PNG } from "pngjs";

const LADO = 2048;
const PLANO = 206; // valor do terreno plano (e do mar) no SR_50M
const FORCA_SOMBRA = 1.7; // quanto as sombras escurecem
const MAX_SOMBRA = 0.5; // opacidade máxima da sombra
const MAX_LUZ = 0.22; // opacidade máxima do brilho nas encostas

const buf = readFileSync(process.argv[2]);
const [ifd] = UTIF.decode(buf);
UTIF.decodeImage(buf, ifd);
const { width: lo, height: ao, data: cinza } = ifd;

const latDaLinha = (y) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / LADO))) * 180) / Math.PI;
const linhaOrigem = (lat) => ((90 - lat) / 180) * ao;

const png = new PNG({ width: LADO, height: LADO });
for (let y = 0; y < LADO; y++) {
  // Média de todos os pixels de origem que caem dentro do pixel de saída
  const ys0 = Math.floor(linhaOrigem(latDaLinha(y)));
  const ys1 = Math.max(ys0 + 1, Math.ceil(linhaOrigem(latDaLinha(y + 1))));
  for (let x = 0; x < LADO; x++) {
    const xs0 = Math.floor((x / LADO) * lo);
    const xs1 = Math.max(xs0 + 1, Math.floor(((x + 1) / LADO) * lo));
    let soma = 0, n = 0;
    for (let ys = ys0; ys < Math.min(ys1, ao); ys++) {
      for (let xs = xs0; xs < xs1; xs++) { soma += cinza[ys * lo + xs]; n++; }
    }
    const v = soma / n;
    const i = (y * LADO + x) * 4;
    if (v < PLANO) {
      png.data[i] = png.data[i + 1] = png.data[i + 2] = 0;
      png.data[i + 3] = Math.round(Math.min(MAX_SOMBRA, ((PLANO - v) / PLANO) * FORCA_SOMBRA) * 255);
    } else {
      png.data[i] = png.data[i + 1] = png.data[i + 2] = 255;
      png.data[i + 3] = Math.round(Math.min(MAX_LUZ, ((v - PLANO) / (255 - PLANO)) * MAX_LUZ * 1.5) * 255);
    }
  }
}

mkdirSync("public/geo", { recursive: true });
// Opacidade em degraus de 4 comprime muito melhor e não se nota na tela
for (let i = 3; i < png.data.length; i += 4) png.data[i] = Math.round(png.data[i] / 4) * 4;
const saida = PNG.sync.write(png, { colorType: 4 }); // cinza + transparência
writeFileSync("public/geo/relevo.png", saida);
console.log(`relevo.png: ${LADO}x${LADO}, ${(saida.length / 1024).toFixed(0)} KB`);
