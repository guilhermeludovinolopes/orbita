import { obterSupabase } from "./supabase";

export type Situacao = "visitado" | "completo";

export type Visita = {
  pais: string; // código do globo: "BR", "GB-ENG"...
  nivel1: string; // ISO 3166-2: "BR-SP"
  condado: string | null; // só nos países com esse nível: FIPS 06037, ISTAT 215...
  municipio: string; // código oficial do país: IBGE 3518701
  ano: number;
};

export type Resumo = {
  visitas: number;
  lugares: number;
  primeiroAno: number;
  ultimoAno: number;
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

export function resumir(visitas: Visita[]): Resumo | null {
  if (visitas.length === 0) return null;
  const anos = [...new Set(visitas.map((v) => v.ano))].sort((a, b) => a - b);
  return {
    visitas: visitas.length,
    lugares: new Set(visitas.map((v) => v.municipio)).size,
    primeiroAno: anos[0],
    ultimoAno: anos[anos.length - 1],
    anos,
  };
}

// Visitado se tem ao menos uma visita; completo se visitou todos os municípios que existem ali.
// O município é a última camada: visitado nele é sempre verde (sem totalMunicipios).
export function situacao(resumo: Resumo | null, totalMunicipios?: number): Situacao | null {
  if (!resumo) return null;
  return totalMunicipios && resumo.lugares >= totalMunicipios ? "completo" : "visitado";
}
