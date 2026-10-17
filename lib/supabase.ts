import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null = null;

// Criado só quando é usado, no navegador: assim o build não quebra se as variáveis
// faltarem num ambiente (o globo aparece sem as cores e o erro vai para o console).
// Chave "publishable": é pública por natureza; quem protege os dados são as regras do banco.
export function obterSupabase(): SupabaseClient {
  if (cliente) return cliente;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave) {
    throw new Error("Faltam NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY neste ambiente");
  }
  cliente = createClient(url, chave);
  return cliente;
}
