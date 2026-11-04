// Gera o índice da busca do painel "Minhas viagens", dividido para baixar só o que a busca precisa:
//   public/geo/lugares/base.json   estados e condados de todos os países com mapa detalhado (baixa ao abrir a busca)
//   public/geo/lugares/m-<xx>.json municípios com alguma palavra do nome começando por <xx> (2 letras, sem acento):
//                                  "São Paulo" entra em m-sa.json e em m-pa.json
// Sai dos mesmos arquivos de public/geo que o globo usa, então os códigos sempre batem com o mapa.
//
// Formato (compacto):
//   base.json   { "BR": { "estados": [[codigo, nome], ...], "condados": { "<estado>": [[codigo, nome], ...] } } }
//   m-<xx>.json { "BR": { "<estado>": [[codigo, nome, condado?, outrosNomes?], ...] } }
//   Os outros nomes (Munique para München) vêm de scripts/apelidos-lugares.json e também entram na busca.
//   Fora do a-z e 0-9 (grego, cirílico, kanji...), o nome do arquivo leva os códigos hexadecimais das letras:
//   "京都" → m-u4eac-90fd.json (mesma regra em lib/viagens.ts)
//
// Uso: node scripts/gerar-indice-lugares.mjs
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const PASTAS = { BR: "br", US: "us", IT: "it", CH: "ch", PT: "pt", "GB-ENG": "gb-eng", IE: "ie", AR: "ar", CL: "cl", PY: "py", BO: "bo", PE: "pe", EC: "ec", CO: "co", VE: "ve", SR: "sr", MX: "mx", GT: "gt", HN: "hn", SV: "sv", NI: "ni", CR: "cr", PA: "pa", CU: "cu", DO: "do", HT: "ht", JM: "jm", CA: "ca", JP: "jp", KR: "kr", IN: "in", IL: "il", JO: "jo", TJ: "tj", TM: "tm", SG: "sg", BN: "bn", SA: "sa", AZ: "az", GE: "ge", KW: "kw", AF: "af", AM: "am", BD: "bd", BT: "bt", KH: "kh", QA: "qa", KZ: "kz", CN: "cn", KP: "kp", PH: "ph", YE: "ye", ID: "id", IR: "ir", IQ: "iq", LA: "la", LB: "lb", MY: "my", MV: "mv", MN: "mn", MM: "mm", NP: "np", OM: "om", PS: "ps", PK: "pk", KG: "kg", SY: "sy", LK: "lk", TH: "th", TL: "tl", TR: "tr", UZ: "uz", VN: "vn", DE: "de", FR: "fr", ES: "es", BE: "be", GR: "gr", NL: "nl", AT: "at", DK: "dk", CZ: "cz", SK: "sk", HU: "hu", RO: "ro", BG: "bg", HR: "hr", SI: "si", SE: "se", FI: "fi", NO: "no", IS: "is", LT: "lt", LV: "lv", MT: "mt", AL: "al", MK: "mk", RS: "rs", LI: "li", PL: "pl", EE: "ee", CY: "cy", LU: "lu", "GB-SCT": "gb-sct", "GB-WLS": "gb-wls", "GB-NIR": "gb-nir", UA: "ua", BY: "by", RU: "ru", BA: "ba", ME: "me", MD: "md", AD: "ad", SM: "sm", ZA: "za", AO: "ao", DZ: "dz", BJ: "bj", BW: "bw", BF: "bf", BI: "bi", CV: "cv", CM: "cm", TD: "td", KM: "km", CG: "cg", CI: "ci", DJ: "dj", EG: "eg", ER: "er", ET: "et", GA: "ga", GM: "gm", GH: "gh", GN: "gn", GQ: "gq", GW: "gw", LS: "ls", LR: "lr", LY: "ly", MG: "mg", MW: "mw", ML: "ml", MA: "ma", MR: "mr", MZ: "mz", NA: "na", NE: "ne", NG: "ng", KE: "ke", CF: "cf", CD: "cd", RW: "rw", ST: "st", SC: "sc", SN: "sn", SL: "sl", SO: "so", SZ: "sz", SD: "sd", SS: "ss", TZ: "tz", TG: "tg", TN: "tn", UG: "ug", ZM: "zm", ZW: "zw", MU: "mu", AU: "au", NZ: "nz", PG: "pg", FJ: "fj", SB: "sb", VU: "vu", TO: "to", KI: "ki", FM: "fm", MH: "mh", WS: "ws", TV: "tv", PW: "pw", NR: "nr", UY: "uy", BZ: "bz", GY: "gy", BS: "bs", TT: "tt", BB: "bb", VC: "vc", GD: "gd", AG: "ag", DM: "dm", KN: "kn", LC: "lc", BH: "bh", AE: "ae" };

const ler = (arquivo) => JSON.parse(readFileSync(arquivo, "utf8")).features.map((f) => f.properties);

// Mesma normalização da busca (lib/viagens.ts): sem acento e em minúsculas; as palavras, só letras e números
const palavras = (nome) =>
  nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((p) => p.length >= 2);

const arquivo = (chave) => (/^[a-z0-9]+$/.test(chave) ? `m-${chave}` : `m-u${[...chave].map((l) => l.codePointAt(0).toString(16)).join("-")}`);

// Nomes conhecidos: "país|estado|nome oficial" → outros nomes (estado vazio vale para qualquer estado do país)
const apelidos = new Map();
for (const [pais, estado, nome, outros] of JSON.parse(readFileSync("scripts/apelidos-lugares.json", "utf8")).lugares) {
  apelidos.set(`${pais}|${estado ?? ""}|${nome}`, outros);
}
const usados = new Set();

const base = {};
const pedacos = new Map(); // "sa" → { BR: { "BR-SP": [...] } }
let total = 0;
for (const [pais, pasta] of Object.entries(PASTAS)) {
  const dir = `public/geo/${pasta}`;
  const estados = ler(`${dir}/estados.json`);
  const item = { estados: estados.map((e) => [e.codigo, e.nome]) };
  for (const e of estados) {
    // O Brasil usa a sigla sem "BR-" no nome do arquivo: municipios-SP.json
    const sufixo = pais === "BR" ? e.codigo.replace("BR-", "") : e.codigo;
    const condados = `${dir}/condados-${sufixo}.json`;
    if (existsSync(condados)) {
      item.condados ??= {};
      item.condados[e.codigo] = ler(condados).map((c) => [c.codigo, c.nome]);
    }
    for (const m of ler(`${dir}/municipios-${sufixo}.json`)) {
      const chaveApelido = [`${pais}|${e.codigo}|${m.nome}`, `${pais}||${m.nome}`].find((c) => apelidos.has(c));
      const outros = chaveApelido ? apelidos.get(chaveApelido) : null;
      if (chaveApelido) usados.add(chaveApelido);
      const linha = outros ? [m.codigo, m.nome, m.condado ?? null, outros] : m.condado ? [m.codigo, m.nome, m.condado] : [m.codigo, m.nome];
      for (const chave of new Set([m.nome, ...(outros ?? [])].flatMap(palavras).map((p) => p.slice(0, 2)))) {
        if (!pedacos.has(chave)) pedacos.set(chave, {});
        const porPais = pedacos.get(chave);
        ((porPais[pais] ??= {})[e.codigo] ??= []).push(linha);
      }
      total++;
    }
  }
  base[pais] = item;
}

rmSync("public/geo/lugares", { recursive: true, force: true });
rmSync("public/geo/lugares.json", { force: true });
mkdirSync("public/geo/lugares", { recursive: true });
writeFileSync("public/geo/lugares/base.json", JSON.stringify(base));
for (const [chave, porPais] of pedacos) writeFileSync(`public/geo/lugares/${arquivo(chave)}.json`, JSON.stringify(porPais));
const sobrando = [...apelidos.keys()].filter((c) => !usados.has(c));
if (sobrando.length) console.log(`Nomes conhecidos sem município no mapa: ${sobrando.join("; ")}`);
console.log(`${Object.keys(base).length} países, ${total.toLocaleString("pt-BR")} municípios em ${pedacos.size} pedaços de public/geo/lugares/`);
