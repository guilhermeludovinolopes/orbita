// Confere se cada visita do banco encontra o seu estado, condado e município nos mapas de public/geo.
// Lê as visitas pela API pública (mesma chave do site, de .env.local).
//
// Uso: node scripts/conferir-mapas.mjs
import { existsSync, readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => l.split("=").map((s) => s.trim())),
);
const PASTAS = { BR: "br", US: "us", IT: "it", CH: "ch", PT: "pt", "GB-ENG": "gb-eng", IE: "ie", AR: "ar", CL: "cl", PY: "py", BO: "bo", PE: "pe", EC: "ec", CO: "co", VE: "ve", SR: "sr", MX: "mx", GT: "gt", HN: "hn", SV: "sv", NI: "ni", CR: "cr", PA: "pa", CU: "cu", DO: "do", HT: "ht", JM: "jm", CA: "ca", JP: "jp", KR: "kr", IN: "in", IL: "il", JO: "jo", TJ: "tj", TM: "tm", SG: "sg", BN: "bn", SA: "sa", AZ: "az", GE: "ge", KW: "kw", AF: "af", AM: "am", BD: "bd", BT: "bt", KH: "kh", QA: "qa", KZ: "kz", CN: "cn", KP: "kp", PH: "ph", YE: "ye", ID: "id", IR: "ir", IQ: "iq", LA: "la", LB: "lb", MY: "my", MV: "mv", MN: "mn", MM: "mm", NP: "np", OM: "om", PS: "ps", PK: "pk", KG: "kg", SY: "sy", LK: "lk", TH: "th", TL: "tl", TR: "tr", UZ: "uz", VN: "vn", DE: "de", FR: "fr", ES: "es", BE: "be", GR: "gr", NL: "nl", AT: "at", DK: "dk", CZ: "cz", SK: "sk", HU: "hu", RO: "ro", BG: "bg", HR: "hr", SI: "si", SE: "se", FI: "fi", NO: "no", IS: "is", LT: "lt", LV: "lv", MT: "mt", AL: "al", MK: "mk", RS: "rs", LI: "li", PL: "pl", EE: "ee", CY: "cy", LU: "lu", "GB-SCT": "gb-sct", "GB-WLS": "gb-wls", "GB-NIR": "gb-nir", UA: "ua", BY: "by", RU: "ru", BA: "ba", ME: "me", MD: "md", AD: "ad", SM: "sm", ZA: "za", AO: "ao", DZ: "dz", BJ: "bj", BW: "bw", BF: "bf", BI: "bi", CV: "cv", CM: "cm", TD: "td", KM: "km", CG: "cg", CI: "ci", DJ: "dj", EG: "eg", ER: "er", ET: "et", GA: "ga", GM: "gm", GH: "gh", GN: "gn", GQ: "gq", GW: "gw", LS: "ls", LR: "lr", LY: "ly", MG: "mg", MW: "mw", ML: "ml", MA: "ma", MR: "mr", MZ: "mz", NA: "na", NE: "ne", NG: "ng", KE: "ke", CF: "cf", CD: "cd", RW: "rw", ST: "st", SC: "sc", SN: "sn", SL: "sl", SO: "so", SZ: "sz", SD: "sd", SS: "ss", TZ: "tz", TG: "tg", TN: "tn", UG: "ug", ZM: "zm", ZW: "zw", MU: "mu" };

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
  if (!v.nivel1_codigo) continue; // visita só do país: não há o que achar no mapa detalhado
  const base = `public/geo/${pasta}`;
  const onde = `${v.pais_codigo} ${v.nivel2_nome}`;
  if (!codigos(`${base}/estados.json`)?.has(v.nivel1_codigo)) problemas.push(`${onde}: estado ${v.nivel1_codigo} não está no mapa`);
  const condados = codigos(`${base}/condados-${v.nivel1_codigo}.json`);
  if (v.condado_codigo && condados && !condados.has(v.condado_codigo)) problemas.push(`${onde}: condado ${v.condado_codigo} não está no mapa`);
  // O Brasil (passo 2a) usa a sigla sem "BR-" no nome do arquivo: municipios-SP.json
  const sufixo = v.pais_codigo === "BR" ? v.nivel1_codigo.replace("BR-", "") : v.nivel1_codigo;
  if (v.nivel2_codigo && !codigos(`${base}/municipios-${sufixo}.json`)?.has(v.nivel2_codigo)) problemas.push(`${onde}: município ${v.nivel2_codigo} não está no mapa`);
}

const unicos = [...new Set(problemas)];
console.log(`${visitas.length} visitas conferidas; ${unicos.length} problemas`);
for (const p of unicos) console.log(" -", p);
