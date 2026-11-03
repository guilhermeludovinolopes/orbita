import { chaveConfere, idDoDono, supabaseDoServidor } from "@/lib/servidor";
import { paraLinha, type NovaViagem } from "@/lib/viagens";

// Criar (POST), editar (PUT) e apagar (DELETE) viagens. Cada pedido traz a chave no cabeçalho
// "x-orbita-chave"; sem ela certa, nada é gravado. Só mexe nas viagens do dono do mapa.

async function executar(pedido: Request, acao: (dono: string) => Promise<{ error: unknown }>) {
  if (!chaveConfere(pedido.headers.get("x-orbita-chave"))) return Response.json({ erro: "Chave errada." }, { status: 401 });
  try {
    const { error } = await acao(await idDoDono());
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    console.error("Não consegui gravar a viagem", e);
    return Response.json({ erro: "Não consegui gravar no banco." }, { status: 500 });
  }
}

export async function POST(pedido: Request) {
  const { viagem } = (await pedido.json()) as { viagem: NovaViagem };
  return executar(pedido, async (dono) => await supabaseDoServidor().from("visitas").insert({ ...paraLinha(viagem), usuario_id: dono }));
}

export async function PUT(pedido: Request) {
  const { id, viagem } = (await pedido.json()) as { id: string; viagem: NovaViagem };
  return executar(pedido, async (dono) =>
    await supabaseDoServidor().from("visitas").update(paraLinha(viagem)).eq("id", id).eq("usuario_id", dono));
}

export async function DELETE(pedido: Request) {
  const id = new URL(pedido.url).searchParams.get("id");
  if (!id) return Response.json({ erro: "Falta o id." }, { status: 400 });
  return executar(pedido, async (dono) => await supabaseDoServidor().from("visitas").delete().eq("id", id).eq("usuario_id", dono));
}
