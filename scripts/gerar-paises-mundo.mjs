// Gera a lista de países do painel de bandeiras e copia as bandeiras usadas:
//   lib/paises-mundo.json   código do globo, nome em português e continente de cada país
//   public/bandeiras/*.svg  bandeiras do pacote flag-icons (MIT), proporção 4x3
//
// Países: os membros da ONU (pacote world-countries, ODbL) mais o Vaticano e a Palestina
// (observadores). O Reino Unido aparece como as suas 4 nações, como no globo.
//
// Uso: node scripts/gerar-paises-mundo.mjs
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const mundo = require("world-countries");

const OBSERVADORES = new Set(["VA", "PS"]);
const NACOES_REINO_UNIDO = [
  { codigo: "GB-ENG", nome: "Inglaterra" },
  { codigo: "GB-SCT", nome: "Escócia" },
  { codigo: "GB-WLS", nome: "País de Gales" },
  { codigo: "GB-NIR", nome: "Irlanda do Norte" },
];

// Continentes como se fala no Brasil: as Américas divididas em Sul e Norte/Central/Caribe
function continente(p) {
  if (p.region === "Americas") return p.subregion === "South America" ? "América do Sul" : "América do Norte e Central";
  return { Europe: "Europa", Africa: "África", Asia: "Ásia", Oceania: "Oceania" }[p.region];
}

const paises = [];
for (const p of mundo.filter((p) => p.unMember || OBSERVADORES.has(p.cca2))) {
  if (p.cca2 === "GB") {
    for (const n of NACOES_REINO_UNIDO) paises.push({ ...n, continente: "Europa" });
    continue;
  }
  paises.push({ codigo: p.cca2, nome: p.translations.por.common, continente: continente(p) });
}
paises.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

mkdirSync("public/bandeiras", { recursive: true });
for (const p of paises) {
  copyFileSync(`node_modules/flag-icons/flags/4x3/${p.codigo.toLowerCase()}.svg`, `public/bandeiras/${p.codigo.toLowerCase()}.svg`);
}
writeFileSync("lib/paises-mundo.json", JSON.stringify(paises, null, 1) + "\n");

const porContinente = Object.groupBy(paises, (p) => p.continente);
console.log(`${paises.length} países:`, Object.entries(porContinente).map(([c, l]) => `${c} ${l.length}`).join(", "));
