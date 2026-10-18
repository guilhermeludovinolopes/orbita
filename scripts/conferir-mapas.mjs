// Confere se cada visita do banco encontra o seu estado, condado e município nos mapas de public/geo.
// Lê as visitas pela API pública (mesma chave do site, de .env.local).
//
// Uso: node scripts/conferir-mapas.mjs
import { existsSync, readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => l.split("=").map((s) => s.trim())),
);
const PASTAS = { BR: "br", US: "us", IT: "it", CH: "ch", PT: "pt", "GB-ENG": "gb-eng", IE: "ie" };

const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/visitas?select=pais_codigo,nivel1_codigo,condado_codigo,nivel2_codigo,nivel2_nome`, {
  headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
});
const visitas = await r.json();

const cache = new Map();
const codigos = (arquivo) => {
  if (!cache.has(arquivo)) cache.set(arquivo, existsSync(arquivo) ? new Set(JSON.parse(readFileSync(arquivo, "utf8")).features.map((f) => f.properties.codigo)) : null);
  return cache.get(arquivo);
};

const problemas = [];
for (const v of visitas) {
  const pasta = PASTAS[v.pais_codigo];
  if (!pasta) { problemas.push(`${v.pais_codigo}: país sem mapa detalhado`); continue; }
  const base = `public/geo/${pasta}`;
  const onde = `${v.pais_codigo} ${v.nivel2_nome}`;
  if (!codigos(`${base}/estados.json`)?.has(v.nivel1_codigo)) problemas.push(`${onde}: estado ${v.nivel1_codigo} não está no mapa`);
  const condados = codigos(`${base}/condados-${v.nivel1_codigo}.json`);
  if (v.condado_codigo && condados && !condados.has(v.condado_codigo)) problemas.push(`${onde}: condado ${v.condado_codigo} não está no mapa`);
  // O Brasil (passo 2a) usa a sigla sem "BR-" no nome do arquivo: municipios-SP.json
  const sufixo = v.pais_codigo === "BR" ? v.nivel1_codigo.replace("BR-", "") : v.nivel1_codigo;
  if (!codigos(`${base}/municipios-${sufixo}.json`)?.has(v.nivel2_codigo)) problemas.push(`${onde}: município ${v.nivel2_codigo} não está no mapa`);
}

const unicos = [...new Set(problemas)];
console.log(`${visitas.length} visitas conferidas; ${unicos.length} problemas`);
for (const p of unicos) console.log(" -", p);
