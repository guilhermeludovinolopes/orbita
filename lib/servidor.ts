import { createHash, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Só no servidor (rotas de app/api): quem pode mexer nas viagens é quem sabe a chave.
// A chave (ORBITA_CHAVE) e a chave secreta do Supabase (SUPABASE_SECRET_KEY) ficam nas variáveis de ambiente
// da Vercel e no .env.local; nunca no código nem no navegador.

export const PERFIL_DO_SITE = "guilherme";

// Compara pelos resumos SHA-256, em tempo constante (não dá para adivinhar a chave pelo tempo da resposta)
export function chaveConfere(recebida: string | null): boolean {
  const certa = process.env.ORBITA_CHAVE;
  if (!certa || !recebida) return false;
  const resumo = (t: string) => createHash("sha256").update(t).digest();
  return timingSafeEqual(resumo(recebida), resumo(certa));
}

let cliente: SupabaseClient | null = null;

// Cliente com a chave secreta: passa por cima das regras do banco, por isso só depois de conferir a chave
export function supabaseDoServidor(): SupabaseClient {
  if (cliente) return cliente;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secreta = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secreta) throw new Error("Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SECRET_KEY neste ambiente");
  cliente = createClient(url, secreta, { auth: { persistSession: false } });
  return cliente;
}

// O dono do mapa público: as viagens novas entram no perfil dele, e só as dele podem ser editadas
export async function idDoDono(): Promise<string> {
  const { data, error } = await supabaseDoServidor().from("perfis").select("id").eq("usuario", PERFIL_DO_SITE).single();
  if (error) throw error;
  return data.id as string;
}
