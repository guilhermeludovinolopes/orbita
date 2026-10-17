import { obterSupabase } from "./supabase";

export type Situacao = "visitado" | "completo";

export type ResumoPais = {
  situacao: Situacao;
  visitas: number;
  lugares: number;
  primeiroAno: number;
  ultimoAno: number;
};

// O mapa público mostra as viagens deste perfil
const PERFIL_DO_SITE = "guilherme";

// Resumo das visitas por país (código do globo: "BR", "GB-ENG"...).
// "completo" depende do total de municípios de cada país e entra com o mapa por estados.
export async function carregarResumoPorPais(): Promise<Record<string, ResumoPais>> {
  const { data, error } = await obterSupabase()
    .from("visitas")
    .select("pais_codigo, nivel2_codigo, ano, perfis!inner(usuario)")
    .eq("perfis.usuario", PERFIL_DO_SITE);
  if (error) throw error;

  const resumo: Record<string, ResumoPais & { codigos: Set<string> }> = {};
  for (const v of data) {
    const r = (resumo[v.pais_codigo] ??= {
      situacao: "visitado", visitas: 0, lugares: 0, primeiroAno: v.ano, ultimoAno: v.ano, codigos: new Set(),
    });
    r.visitas++;
    r.codigos.add(v.nivel2_codigo);
    r.lugares = r.codigos.size;
    r.primeiroAno = Math.min(r.primeiroAno, v.ano);
    r.ultimoAno = Math.max(r.ultimoAno, v.ano);
  }
  return Object.fromEntries(Object.entries(resumo).map(([pais, { codigos: _, ...r }]) => [pais, r]));
}
