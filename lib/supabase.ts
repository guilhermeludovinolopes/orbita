import { createClient } from "@supabase/supabase-js";

// Chave "publishable": é pública por natureza; quem protege os dados são as regras do banco
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);
