// Gera public/marca/orbita-simbolo-transparente.png a partir do símbolo com fundo preto (public/marca/orbita-simbolo.png):
// o preto vira transparência (a opacidade de cada ponto é o brilho dele), para o símbolo flutuar sobre a
// imagem do espaço. Sai reduzido a 176 px (44 px na tela, com sobra para telas de alta densidade).
//
// Uso: node scripts/gerar-simbolo-transparente.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

const LADO = 176;
const origem = PNG.sync.read(readFileSync("public/marca/orbita-simbolo.png"));
const saida = new PNG({ width: LADO, height: LADO });
const passo = origem.width / LADO;

for (let y = 0; y < LADO; y++) {
  for (let x = 0; x < LADO; x++) {
    // Média dos pontos da origem que caem neste ponto da saída
    let r = 0, g = 0, b = 0, n = 0;
    for (let oy = Math.floor(y * passo); oy < Math.floor((y + 1) * passo); oy++) {
      for (let ox = Math.floor(x * passo); ox < Math.floor((x + 1) * passo); ox++) {
        const i = (oy * origem.width + ox) * 4;
        r += origem.data[i]; g += origem.data[i + 1]; b += origem.data[i + 2]; n++;
      }
    }
    [r, g, b] = [r / n, g / n, b / n];
    // Preto → transparente: opacidade = canal mais forte; a cor é "desfeita" do preto para manter o tom
    const alfa = Math.max(r, g, b);
    const j = (y * LADO + x) * 4;
    saida.data[j] = alfa ? Math.round((r * 255) / alfa) : 0;
    saida.data[j + 1] = alfa ? Math.round((g * 255) / alfa) : 0;
    saida.data[j + 2] = alfa ? Math.round((b * 255) / alfa) : 0;
    saida.data[j + 3] = Math.round(alfa);
  }
}
writeFileSync("public/marca/orbita-simbolo-transparente.png", PNG.sync.write(saida));
console.log(`public/marca/orbita-simbolo-transparente.png (${LADO} px)`);
