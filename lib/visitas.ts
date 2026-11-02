import { obterSupabase } from "./supabase";

export type Situacao = "visitado" | "completo";

export type Visita = {
  pais: string; // código do globo: "BR", "GB-ENG"...
  nivel1: string | null; // ISO 3166-2: "BR-SP" (vazio se a visita marca só o país)
  condado: string | null; // só nos países com esse nível: FIPS 06037, ISTAT 215...
  municipio: string | null; // código oficial do país: IBGE 3518701 (vazio se marca só o estado)
  ano: number | null; // opcional
};

export type Resumo = {
  visitas: number;
  lugares: number;
  primeiroAno: number | null; // vazio quando nenhuma visita tem ano
  ultimoAno: number | null;
  anos: number[];
};

// O mapa público mostra as viagens deste perfil
const PERFIL_DO_SITE = "guilherme";

export async function carregarVisitas(): Promise<Visita[]> {
  const { data, error } = await obterSupabase()
    .from("visitas")
    .select("pais_codigo, nivel1_codigo, condado_codigo, nivel2_codigo, ano, perfis!inner(usuario)")
    .eq("perfis.usuario", PERFIL_DO_SITE);
  if (error) throw error;
  return data.map((v) => ({
    pais: v.pais_codigo,
    nivel1: v.nivel1_codigo,
    condado: v.condado_codigo,
    municipio: v.nivel2_codigo,
    ano: v.ano,
  }));
}

export type AtracaoVista = { ano: number | null; observacao: string | null };

// Atrações (7 Maravilhas, depois UNESCO) que o Guilherme marcou como vistas.
// Se a tabela ainda não existir no banco, devolve vazio em vez de quebrar o globo.
export async function carregarAtracoesVistas(): Promise<Map<string, AtracaoVista>> {
  const { data, error } = await obterSupabase()
    .from("atracoes_visitadas")
    .select("atracao_id, ano, observacao, perfis!inner(usuario)")
    .eq("perfis.usuario", PERFIL_DO_SITE);
  if (error) {
    console.error("Não consegui carregar as atrações vistas", error);
    return new Map();
  }
  return new Map(data.map((a) => [a.atracao_id, { ano: a.ano, observacao: a.observacao }]));
}

// Anos com visita, sem repetir, em ordem (as visitas sem ano ficam de fora)
export const anosDe = (visitas: Visita[]) =>
  [...new Set(visitas.flatMap((v) => (v.ano ? [v.ano] : [])))].sort((a, b) => a - b);

// Municípios visitados (as visitas só de país ou de estado não contam aqui)
export const municipiosDe = (visitas: Visita[]) => new Set(visitas.flatMap((v) => (v.municipio ? [v.municipio] : [])));

export function resumir(visitas: Visita[]): Resumo | null {
  if (visitas.length === 0) return null;
  const anos = anosDe(visitas);
  return {
    visitas: visitas.length,
    lugares: municipiosDe(visitas).size,
    primeiroAno: anos[0] ?? null,
    ultimoAno: anos[anos.length - 1] ?? null,
    anos,
  };
}

// Visitado se tem ao menos uma visita; completo se visitou todos os municípios que existem ali.
// O município é a última camada: visitado nele é sempre verde (sem totalMunicipios).
export function situacao(resumo: Resumo | null, totalMunicipios?: number): Situacao | null {
  if (!resumo) return null;
  return totalMunicipios && resumo.lugares >= totalMunicipios ? "completo" : "visitado";
}
