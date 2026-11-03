import { chaveConfere } from "@/lib/servidor";

// Confere a chave digitada no painel "Minhas viagens" (a gravação confere de novo a cada pedido)
export async function POST(pedido: Request) {
  if (!process.env.ORBITA_CHAVE) return Response.json({ erro: "A chave ainda não foi configurada no servidor." }, { status: 500 });
  const { chave } = (await pedido.json().catch(() => ({}))) as { chave?: string };
  return chaveConfere(chave ?? null) ? Response.json({ ok: true }) : Response.json({ erro: "Chave errada." }, { status: 401 });
}
