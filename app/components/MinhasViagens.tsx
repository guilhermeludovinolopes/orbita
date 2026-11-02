"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  acompanharSessao,
  apagarViagem,
  carregarViagens,
  idDoPerfil,
  nomeDoPais,
  pedirLink,
  sair,
  salvarViagem,
  semAcento,
  type NovaViagem,
  type Viagem,
} from "@/lib/viagens";
import FormularioViagem from "./FormularioViagem";
import estilos from "./MinhasViagens.module.css";

// A linha do tempo começa no ano em que o Guilherme nasceu
const PRIMEIRO_ANO = 1999;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

type Props = {
  aoFechar: () => void;
  aoMudar: () => Promise<void>; // repinta o globo depois de salvar ou apagar
};

// Nome principal da viagem: o lugar mais fundo que foi marcado (cidade, estado ou país)
export const nomeDaViagem = (v: Viagem) => v.municipioNome ?? v.nivel1Nome ?? nomeDoPais(v.pais);

function ondeFica(v: Viagem) {
  const partes = v.municipio ? [v.nivel1Nome, nomeDoPais(v.pais)] : v.nivel1 ? [nomeDoPais(v.pais)] : ["país"];
  return partes.filter(Boolean).join(", ");
}

const quando = (v: Viagem) => (v.mes ? `${v.dia ? `${v.dia} ` : ""}${MESES[v.mes - 1]}` : "");

// Painel "Minhas viagens": um bloco por ano, do mais recente até 1999, mais o grupo "Sem ano".
// Todo mundo pode ver; só o dono do mapa, depois de entrar, vê os botões de editar.
export default function MinhasViagens({ aoFechar, aoMudar }: Props) {
  const [viagens, setViagens] = useState<Viagem[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sessao, setSessao] = useState<Session | null>(null);
  const [dono, setDono] = useState<string | null>(null);
  const [editando, setEditando] = useState<{ viagem?: Viagem; ano: number | null } | null>(null);
  const [filtro, setFiltro] = useState("");

  const podeEditar = Boolean(sessao && dono && sessao.user.id === dono);

  async function recarregar() {
    try {
      setViagens(await carregarViagens());
      setErro(null);
    } catch (e) {
      console.error("Não consegui carregar as viagens", e);
      setErro("Não consegui carregar as viagens. Tente de novo em instantes.");
    }
  }

  useEffect(() => {
    void recarregar();
    void idDoPerfil().then(setDono);
    return acompanharSessao(setSessao);
  }, []);

  // Fecha com Esc (a não ser que o formulário esteja aberto: aí o Esc é dele)
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && !editando && aoFechar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [editando, aoFechar]);

  const grupos = useMemo(() => {
    const busca = semAcento(filtro);
    const visiveis = (viagens ?? []).filter(
      (v) => !busca || semAcento([nomeDaViagem(v), ondeFica(v), v.local ?? "", v.observacao ?? ""].join(" ")).includes(busca),
    );
    const porAno = new Map<number | null, Viagem[]>();
    for (const v of visiveis) porAno.set(v.ano, [...(porAno.get(v.ano) ?? []), v]);
    for (const lista of porAno.values()) {
      lista.sort((a, b) => (a.mes ?? 13) - (b.mes ?? 13) || (a.dia ?? 32) - (b.dia ?? 32) || nomeDaViagem(a).localeCompare(nomeDaViagem(b), "pt-BR"));
    }
    const anoAtual = new Date().getFullYear();
    const anos = new Set<number>();
    for (let a = anoAtual; a >= PRIMEIRO_ANO; a--) anos.add(a);
    for (const a of porAno.keys()) if (a) anos.add(a);
    const lista = [...anos].sort((a, b) => b - a).map((ano) => ({ ano: ano as number | null, viagens: porAno.get(ano) ?? [] }));
    lista.push({ ano: null, viagens: porAno.get(null) ?? [] });
    // Buscando, só aparecem os anos que têm resultado
    return busca ? lista.filter((g) => g.viagens.length) : lista;
  }, [viagens, filtro]);

  const total = viagens?.length ?? 0;
  const anosComViagem = new Set((viagens ?? []).flatMap((v) => (v.ano ? [v.ano] : []))).size;

  async function salvar(nova: NovaViagem) {
    await salvarViagem(nova, sessao!.user.id, editando?.viagem?.id);
    setEditando(null);
    await recarregar();
    await aoMudar();
  }

  async function apagar(v: Viagem) {
    if (!window.confirm(`Apagar a viagem a ${nomeDaViagem(v)} (${v.ano ?? "sem ano"})?`)) return;
    try {
      await apagarViagem(v.id);
      await recarregar();
      await aoMudar();
    } catch (e) {
      console.error("Não consegui apagar a viagem", e);
      window.alert("Não consegui apagar a viagem. Tente de novo.");
    }
  }

  return (
    <aside className={estilos.painel} aria-label="Minhas viagens">
      <header className={estilos.topo}>
        <div>
          <h2 className={estilos.titulo}>Minhas viagens</h2>
          <p className={estilos.resumo}>
            {viagens ? `${total.toLocaleString("pt-BR")} ${total === 1 ? "visita" : "visitas"} · ${anosComViagem} ${anosComViagem === 1 ? "ano" : "anos"}` : "Carregando…"}
          </p>
        </div>
        <button className={estilos.fechar} onClick={aoFechar} aria-label="Fechar">
          ×
        </button>
      </header>

      <div className={estilos.acoes}>
        {podeEditar && (
          <button className={estilos.botaoPrincipal} onClick={() => setEditando({ ano: new Date().getFullYear() })}>
            + Nova viagem
          </button>
        )}
        <input
          className={estilos.busca}
          type="search"
          placeholder="Buscar lugar ou nota…"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          aria-label="Buscar nas viagens"
        />
      </div>

      <div className={estilos.lista}>
        {erro && <p className={estilos.aviso}>{erro}</p>}
        {grupos.map(({ ano, viagens: doAno }) => (
          <section key={ano ?? "sem-ano"} className={`${estilos.ano} ${doAno.length ? "" : estilos.anoVazio}`}>
            <div className={estilos.cabecalhoAno}>
              <h3 className={estilos.numeroAno}>{ano ?? "Sem ano"}</h3>
              <span className={estilos.contagem}>
                {doAno.length ? `${doAno.length} ${doAno.length === 1 ? "lugar" : "lugares"}` : ano === PRIMEIRO_ANO ? "nascimento" : "nenhuma viagem"}
              </span>
              {podeEditar && (
                <button className={estilos.mais} onClick={() => setEditando({ ano })} aria-label={`Adicionar viagem em ${ano ?? "sem ano"}`} title="Adicionar viagem">
                  +
                </button>
              )}
            </div>
            {doAno.length > 0 && (
              <ul className={estilos.viagens}>
                {doAno.map((v) => (
                  <li key={v.id} className={estilos.viagem}>
                    <div className={estilos.textoViagem}>
                      <p className={estilos.lugar}>
                        {nomeDaViagem(v)}
                        {v.local && <span className={estilos.local}> · {v.local}</span>}
                      </p>
                      <p className={estilos.onde}>
                        {quando(v) && <span className={estilos.data}>{quando(v)} · </span>}
                        {ondeFica(v)}
                      </p>
                      {v.observacao && <p className={estilos.observacao}>{v.observacao}</p>}
                    </div>
                    {podeEditar && (
                      <div className={estilos.botoesViagem}>
                        <button onClick={() => setEditando({ viagem: v, ano: v.ano })}>Editar</button>
                        <button onClick={() => void apagar(v)}>Apagar</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <Entrada sessao={sessao} podeEditar={podeEditar} />

      {editando && (
        <FormularioViagem viagem={editando.viagem} anoInicial={editando.ano} primeiroAno={PRIMEIRO_ANO} aoSalvar={salvar} aoCancelar={() => setEditando(null)} />
      )}
    </aside>
  );
}

// Rodapé: entrar com o link por e-mail, ou sair
function Entrada({ sessao, podeEditar }: { sessao: Session | null; podeEditar: boolean }) {
  const [abrindo, setAbrindo] = useState(false);
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"" | "enviando" | "enviado" | "erro">("");

  if (sessao) {
    return (
      <footer className={estilos.rodape}>
        <span>{podeEditar ? `Editando como ${sessao.user.email}` : "Esta conta não é a dona deste mapa."}</span>
        <button className={estilos.link} onClick={() => void sair()}>
          Sair
        </button>
      </footer>
    );
  }

  if (!abrindo) {
    return (
      <footer className={estilos.rodape}>
        <button className={estilos.link} onClick={() => setAbrindo(true)}>
          Entrar para editar
        </button>
      </footer>
    );
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    try {
      await pedirLink(email.trim());
      setEstado("enviado");
    } catch (erro) {
      console.error("Não consegui enviar o link", erro);
      setEstado("erro");
    }
  }

  return (
    <footer className={estilos.rodape}>
      {estado === "enviado" ? (
        <span>Pronto: abra o link que chegou em {email}.</span>
      ) : (
        <form className={estilos.entrar} onSubmit={enviar}>
          <input type="email" required placeholder="Seu e-mail" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="E-mail" autoFocus />
          <button className={estilos.botaoPrincipal} disabled={estado === "enviando"}>
            {estado === "enviando" ? "Enviando…" : "Enviar link"}
          </button>
          {estado === "erro" && <span className={estilos.aviso}>Não deu certo. Confira o e-mail ou tente daqui a um minuto.</span>}
        </form>
      )}
    </footer>
  );
}
