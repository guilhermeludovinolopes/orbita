import type { Session } from "@supabase/supabase-js";
import { DETALHE_PAISES } from "./detalhe-paises";
import paisesMundo from "./paises-mundo.json";
import { obterSupabase } from "./supabase";

// O painel "Minhas viagens": cada visita completa, para listar por ano, criar, editar e apagar.
// O globo usa lib/visitas.ts (só os códigos); aqui entram também os nomes, a data e a observação.

export type Viagem = {
  id: string;
  ano: number | null;
  mes: number | null;
  dia: number | null;
  pais: string;
  nivel1: string | null;
  nivel1Nome: string | null;
  condado: string | null;
  condadoNome: string | null;
  municipio: string | null;
  municipioNome: string | null;
  local: string | null;
  observacao: string | null;
};

export type NovaViagem = Omit<Viagem, "id">;

const PERFIL_DO_SITE = "guilherme";

const COLUNAS =
  "id, ano, mes, dia, pais_codigo, nivel1_codigo, nivel1_nome, condado_codigo, condado_nome, nivel2_codigo, nivel2_nome, local_nome, observacao";

type Linha = Record<string, unknown>;

const daLinha = (l: Linha): Viagem => ({
  id: l.id as string,
  ano: l.ano as number | null,
  mes: l.mes as number | null,
  dia: l.dia as number | null,
  pais: l.pais_codigo as string,
  nivel1: l.nivel1_codigo as string | null,
  nivel1Nome: l.nivel1_nome as string | null,
  condado: l.condado_codigo as string | null,
  condadoNome: l.condado_nome as string | null,
  municipio: l.nivel2_codigo as string | null,
  municipioNome: l.nivel2_nome as string | null,
  local: l.local_nome as string | null,
  observacao: l.observacao as string | null,
});

const paraLinha = (v: NovaViagem) => ({
  ano: v.ano,
  mes: v.ano ? v.mes : null,
  dia: v.ano && v.mes ? v.dia : null,
  pais_codigo: v.pais,
  nivel1_codigo: v.nivel1,
  nivel1_nome: v.nivel1Nome,
  condado_codigo: v.condado,
  condado_nome: v.condadoNome,
  nivel2_codigo: v.municipio,
  nivel2_nome: v.municipioNome,
  local_nome: v.local?.trim() || null,
  observacao: v.observacao?.trim() || null,
});

// Dono do mapa público: só ele vê os botões de editar
export async function idDoPerfil(): Promise<string | null> {
  const { data } = await obterSupabase().from("perfis").select("id").eq("usuario", PERFIL_DO_SITE).maybeSingle();
  return data?.id ?? null;
}

export async function carregarViagens(): Promise<Viagem[]> {
  const { data, error } = await obterSupabase()
    .from("visitas")
    .select(`${COLUNAS}, perfis!inner(usuario)`)
    .eq("perfis.usuario", PERFIL_DO_SITE);
  if (error) throw error;
  return (data as Linha[]).map(daLinha);
}

export async function salvarViagem(viagem: NovaViagem, usuarioId: string, id?: string): Promise<void> {
  const tabela = obterSupabase().from("visitas");
  const { error } = id
    ? await tabela.update(paraLinha(viagem)).eq("id", id)
    : await tabela.insert({ ...paraLinha(viagem), usuario_id: usuarioId });
  if (error) throw error;
}

export async function apagarViagem(id: string): Promise<void> {
  const { error } = await obterSupabase().from("visitas").delete().eq("id", id);
  if (error) throw error;
}

// Login por link no e-mail. Só entra quem já tem conta (não cria contas novas pelo site).
export async function pedirLink(email: string): Promise<void> {
  const { error } = await obterSupabase().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin, shouldCreateUser: false },
  });
  if (error) throw error;
}

export async function sair(): Promise<void> {
  await obterSupabase().auth.signOut();
}

export function acompanharSessao(aoMudar: (sessao: Session | null) => void): () => void {
  const supabase = obterSupabase();
  void supabase.auth.getSession().then(({ data }) => aoMudar(data.session));
  const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => aoMudar(sessao));
  return () => data.subscription.unsubscribe();
}

// ---------- Busca de lugares ----------

// Índice dividido (gerado por scripts/gerar-indice-lugares.mjs): os estados e condados num arquivo só,
// e os municípios em pedaços pelas 2 primeiras letras de cada palavra do nome
type Base = Record<string, { estados: [string, string][]; condados?: Record<string, [string, string][]> }>;
type Pedaco = Record<string, Record<string, ([string, string] | [string, string, string])[]>>;

export type Lugar = {
  tipo: "país" | "estado" | "município";
  pais: string;
  paisNome: string;
  nivel1: string | null;
  nivel1Nome: string | null;
  condado: string | null;
  condadoNome: string | null;
  municipio: string | null;
  municipioNome: string | null;
  nome: string; // o que aparece em destaque na busca
  rotulo: string; // o nome do nível naquele país: "município", "comune", "cidade", "região"...
  onde: string; // "São Paulo, Brasil" (vazio para país)
  chave: string; // nome sem acento, em minúsculas, para comparar
};

const PAISES = paisesMundo as { codigo: string; nome: string }[];
export const nomeDoPais = (codigo: string) => PAISES.find((p) => p.codigo === codigo)?.nome ?? codigo;

export const semAcento = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const vazio = { nivel1: null, nivel1Nome: null, condado: null, condadoNome: null, municipio: null, municipioNome: null };

let base: Promise<{ indice: Base; lugares: Lugar[] }> | null = null;

// Os 198 países e, nos países com mapa detalhado, os estados: o que a busca mostra antes de baixar municípios
function carregarBase() {
  base ??= fetch("/geo/lugares/base.json")
    .then((r) => r.json() as Promise<Base>)
    .then((indice) => {
      const lugares: Lugar[] = PAISES.map((p) => (
        { ...vazio, tipo: "país", pais: p.codigo, paisNome: p.nome, nome: p.nome, rotulo: "país", onde: "", chave: semAcento(p.nome) }
      ));
      for (const [pais, item] of Object.entries(indice)) {
        const paisNome = nomeDoPais(pais);
        for (const [nivel1, nivel1Nome] of item.estados) {
          lugares.push({
            ...vazio, tipo: "estado", pais, paisNome, nivel1, nivel1Nome,
            nome: nivel1Nome, rotulo: DETALHE_PAISES[pais].nomes.estado[0], onde: paisNome, chave: semAcento(nivel1Nome),
          });
        }
      }
      return { indice, lugares };
    });
  return base;
}

// Pedaço do índice de municípios para a primeira palavra da busca: "sao pa" → m-sa.json.
// Fora do a-z e 0-9, o arquivo leva os códigos hexadecimais das letras (mesma regra do script)
const pedacos = new Map<string, Promise<Lugar[]>>();
function carregarPedaco(chave: string): Promise<Lugar[]> {
  const arquivo = /^[a-z0-9]+$/.test(chave) ? `m-${chave}` : `m-u${[...chave].map((l) => l.codePointAt(0)!.toString(16)).join("-")}`;
  if (!pedacos.has(chave)) {
    pedacos.set(chave, Promise.all([carregarBase(), fetch(`/geo/lugares/${arquivo}.json`).then((r) => (r.ok ? (r.json() as Promise<Pedaco>) : ({} as Pedaco)))]) // sem arquivo: nenhum município com essas letras
      .then(([{ indice }, pedaco]) => {
        const lugares: Lugar[] = [];
        for (const [pais, porEstado] of Object.entries(pedaco)) {
          const paisNome = nomeDoPais(pais);
          const nomes = DETALHE_PAISES[pais].nomes;
          const estados = new Map(indice[pais].estados);
          for (const [nivel1, municipios] of Object.entries(porEstado)) {
            const nivel1Nome = estados.get(nivel1) ?? nivel1;
            const condados = new Map(indice[pais].condados?.[nivel1] ?? []);
            for (const [municipio, municipioNome, condado] of municipios) {
              lugares.push({
                tipo: "município", pais, paisNome, nivel1, nivel1Nome,
                condado: condado ?? null,
                condadoNome: condado ? (condados.get(condado) ?? null) : null,
                municipio,
                municipioNome,
                nome: municipioNome,
                rotulo: nomes.municipio[0],
                onde: `${nivel1Nome}, ${paisNome}`,
                chave: semAcento(municipioNome),
              });
            }
          }
        }
        return lugares;
      }));
  }
  return pedacos.get(chave)!;
}

// Os lugares que podem casar com a busca: países, estados e os municípios do pedaço da primeira palavra
// (com 2 letras ou mais). Acha "Paulo" em São Paulo, mas não um pedaço do meio de uma palavra
export async function carregarLugares(texto = ""): Promise<Lugar[]> {
  const { lugares } = await carregarBase();
  const palavra = semAcento(texto).split(/[^\p{L}\p{N}]+/u).find((p) => p.length >= 2);
  return palavra ? [...lugares, ...(await carregarPedaco(palavra.slice(0, 2)))] : lugares;
}

// Quem começa com o texto vem antes de quem só contém; países e estados antes dos municípios
export function buscarLugares(todos: Lugar[], texto: string, limite = 30): Lugar[] {
  const busca = semAcento(texto);
  if (busca.length < 2) return [];
  const peso = { país: 0, estado: 1, município: 2 };
  return todos
    .filter((l) => l.chave.includes(busca))
    .map((l) => ({ l, nota: (l.chave === busca ? 0 : l.chave.startsWith(busca) ? 1 : 2) * 10 + peso[l.tipo] }))
    .sort((a, b) => a.nota - b.nota || a.l.nome.localeCompare(b.l.nome, "pt-BR"))
    .slice(0, limite)
    .map(({ l }) => l);
}
