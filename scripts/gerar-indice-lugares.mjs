// Gera public/geo/lugares.json: os nomes e códigos de todos os estados, condados e municípios
// dos países com mapa detalhado, para a busca do painel "Minhas viagens".
// Sai dos mesmos arquivos de public/geo que o globo usa, então os códigos sempre batem com o mapa.
//
// Formato (compacto, para baixar rápido):
//   { "BR": { "estados": [[codigo, nome], ...],
//             "condados": { "<estado>": [[codigo, nome], ...] },          // só onde existe
//             "municipios": { "<estado>": [[codigo, nome, condado?], ...] } } }
//
// Uso: node scripts/gerar-indice-lugares.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const PASTAS = { BR: "br", US: "us", IT: "it", CH: "ch", PT: "pt", "GB-ENG": "gb-eng", IE: "ie", AR: "ar" };

const ler = (arquivo) => JSON.parse(readFileSync(arquivo, "utf8")).features.map((f) => f.properties);

const indice = {};
let total = 0;
for (const [pais, pasta] of Object.entries(PASTAS)) {
  const base = `public/geo/${pasta}`;
  const estados = ler(`${base}/estados.json`);
  const item = { estados: estados.map((e) => [e.codigo, e.nome]), municipios: {} };
  for (const e of estados) {
    // O Brasil usa a sigla sem "BR-" no nome do arquivo: municipios-SP.json
    const sufixo = pais === "BR" ? e.codigo.replace("BR-", "") : e.codigo;
    const condados = `${base}/condados-${sufixo}.json`;
    if (existsSync(condados)) {
      item.condados ??= {};
      item.condados[e.codigo] = ler(condados).map((c) => [c.codigo, c.nome]);
    }
    item.municipios[e.codigo] = ler(`${base}/municipios-${sufixo}.json`).map((m) =>
      m.condado ? [m.codigo, m.nome, m.condado] : [m.codigo, m.nome],
    );
    total += item.municipios[e.codigo].length;
  }
  indice[pais] = item;
}

writeFileSync("public/geo/lugares.json", JSON.stringify(indice));
console.log(`${Object.keys(indice).length} países, ${total.toLocaleString("pt-BR")} municípios em public/geo/lugares.json`);
