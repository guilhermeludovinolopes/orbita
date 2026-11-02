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
const BANDEIRAS_NO_TITULO = 14; // quantas bandeiras cabem ao lado do ano fechado

type Props = {
  aoFechar: () => void;
  aoMudar: () => Promise<void>; // repinta o globo por trás depois de salvar ou apagar
};

// Nome principal da viagem: o lugar mais fundo que foi marcado (cidade, estado ou país)
export const nomeDaViagem = (v: Viagem) => v.municipioNome ?? v.nivel1Nome ?? nomeDoPais(v.pais);

function ondeFica(v: Viagem) {
  const partes = v.municipio ? [v.nivel1Nome, nomeDoPais(v.pais)] : v.nivel1 ? [nomeDoPais(v.pais)] : ["país inteiro"];
  return partes.filter(Boolean).join(", ");
}

const quando = (v: Viagem) => (v.mes ? `${v.dia ? `${v.dia} ` : ""}${MESES[v.mes - 1]}` : "");

const chaveDoAno = (ano: number | null) => String(ano ?? "sem-ano");

function Bandeira({ pais, classe }: { pais: string; classe: string }) {
  return <img className={classe} src={`/bandeiras/${pais.toLowerCase()}.svg`} alt="" title={nomeDoPais(pais)} width={24} height={18} loading="lazy" />;
}

// Painel "Minhas viagens", em tela cheia: um bloco por ano (fechado até abrir pela setinha),
// do mais recente até 1999, mais o grupo "Sem ano". Abre só para ver; o botão "Editar"
// liga os botões de adicionar, editar e apagar (depois de entrar, só para o dono do mapa).
export default function MinhasViagens({ aoFechar, aoMudar }: Props) {
  const [viagens, setViagens] = useState<Viagem[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sessao, setSessao] = useState<Session | null>(null);
  const [dono, setDono] = useState<string | null>(null);
  const [editando, setEditando] = useState<{ viagem?: Viagem; ano: number | null } | null>(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [pedindoEntrada, setPedindoEntrada] = useState(false);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [filtro, setFiltro] = useState("");

  const podeEditar = Boolean(sessao && dono && sessao.user.id === dono);
  const editavel = modoEdicao && podeEditar;

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

  // Acabou de entrar: liga o modo de edição direto
  useEffect(() => {
    if (podeEditar && pedindoEntrada) {
      setModoEdicao(true);
      setPedindoEntrada(false);
    }
  }, [podeEditar, pedindoEntrada]);

  // Esc fecha o painel (a não ser que o formulário esteja aberto: aí o Esc é dele)
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && !editando && aoFechar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [editando, aoFechar]);

  const busca = semAcento(filtro);
  const grupos = useMemo(() => {
    const visiveis = (viagens ?? []).filter(
      (v) => !busca || semAcento([nomeDaViagem(v), ondeFica(v), v.local ?? "", v.observacao ?? ""].join(" ")).includes(busca),
    );
    const porAno = new Map<number | null, Viagem[]>();
    for (const v of visiveis) porAno.set(v.ano, [...(porAno.get(v.ano) ?? []), v]);
    for (const lista of porAno.values()) {
      lista.sort((a, b) => (a.mes ?? 13) - (b.mes ?? 13) || (a.dia ?? 32) - (b.dia ?? 32) || nomeDaViagem(a).localeCompare(nomeDaViagem(b), "pt-BR"));
    }
    const anos = new Set<number>();
    for (let a = new Date().getFullYear(); a >= PRIMEIRO_ANO; a--) anos.add(a);
    for (const a of porAno.keys()) if (a) anos.add(a);
    const lista = [...anos].sort((a, b) => b - a).map((ano) => ({ ano: ano as number | null, viagens: porAno.get(ano) ?? [] }));
    lista.push({ ano: null, viagens: porAno.get(null) ?? [] });
    // Buscando, só aparecem os anos que têm resultado
    return busca ? lista.filter((g) => g.viagens.length) : lista;
  }, [viagens, busca]);

  const total = viagens?.length ?? 0;
  const anosComViagem = new Set((viagens ?? []).flatMap((v) => (v.ano ? [v.ano] : []))).size;
  const paisesVisitados = new Set((viagens ?? []).map((v) => v.pais)).size;

  const alternarAno = (chave: string) =>
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  const comViagem = grupos.filter((g) => g.viagens.length).map((g) => chaveDoAno(g.ano));
  const todosAbertos = comViagem.length > 0 && comViagem.every((c) => abertos.has(c));

  function clicarEditar() {
    if (modoEdicao) return setModoEdicao(false);
    if (podeEditar) return setModoEdicao(true);
    setPedindoEntrada(true);
  }

  async function salvar(nova: NovaViagem) {
    await salvarViagem(nova, sessao!.user.id, editando?.viagem?.id);
    setEditando(null);
    setAbertos((atual) => new Set(atual).add(chaveDoAno(nova.ano))); // mostra onde ela entrou
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
    <div className={estilos.tela} role="dialog" aria-label="Minhas viagens">
      <header className={estilos.topo}>
        <div className={estilos.cabecalho}>
          <div>
            <h2 className={estilos.titulo}>Minhas viagens</h2>
            <p className={estilos.resumo}>
              {viagens
                ? `${total.toLocaleString("pt-BR")} ${total === 1 ? "visita" : "visitas"} · ${paisesVisitados} ${paisesVisitados === 1 ? "país" : "países"} · ${anosComViagem} ${anosComViagem === 1 ? "ano" : "anos"}`
                : "Carregando…"}
            </p>
          </div>
          <div className={estilos.acoes}>
            <input
              className={estilos.busca}
              type="search"
              placeholder="Buscar lugar ou nota…"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              aria-label="Buscar nas viagens"
            />
            <button className={modoEdicao ? estilos.botaoPrincipal : estilos.botao} onClick={clicarEditar} aria-pressed={modoEdicao}>
              {modoEdicao ? "Concluir" : "Editar"}
            </button>
            <button className={estilos.botao} onClick={aoFechar}>
              Ver no globo
            </button>
          </div>
        </div>

        {pedindoEntrada && !podeEditar && <Entrada sessao={sessao} aoCancelar={() => setPedindoEntrada(false)} />}

        {editavel && (
          <div className={estilos.faixaEdicao}>
            <span>Modo de edição: adicione, corrija ou apague viagens. O globo se atualiza sozinho.</span>
            <button className={estilos.botaoPrincipal} onClick={() => setEditando({ ano: new Date().getFullYear() })}>
              + Nova viagem
            </button>
          </div>
        )}
      </header>

      <div className={estilos.conteudo}>
        <div className={estilos.coluna}>
          {erro && <p className={estilos.aviso}>{erro}</p>}
          {!busca && comViagem.length > 0 && (
            <button className={estilos.link} onClick={() => setAbertos(todosAbertos ? new Set() : new Set(comViagem))}>
              {todosAbertos ? "Fechar todos os anos" : "Abrir todos os anos"}
            </button>
          )}

          {grupos.map(({ ano, viagens: doAno }) => {
            const chave = chaveDoAno(ano);
            // Buscando, os anos com resultado já vêm abertos
            const aberto = doAno.length > 0 && (Boolean(busca) || abertos.has(chave));
            const paises = [...new Set(doAno.map((v) => v.pais))];
            return (
              <section key={chave} className={`${estilos.ano} ${doAno.length ? "" : estilos.anoVazio}`}>
                <div className={estilos.cabecalhoAno}>
                  <button className={estilos.abrirAno} onClick={() => alternarAno(chave)} disabled={!doAno.length} aria-expanded={aberto}>
                    <span className={`${estilos.seta} ${aberto ? estilos.setaAberta : ""}`} aria-hidden="true">
                      {doAno.length ? "▸" : ""}
                    </span>
                    <span className={estilos.numeroAno}>{ano ?? "Sem ano"}</span>
                    <span className={estilos.contagem}>
                      {doAno.length
                        ? `${doAno.length} ${doAno.length === 1 ? "lugar" : "lugares"}`
                        : ano === PRIMEIRO_ANO
                          ? "nascimento"
                          : "nenhuma viagem"}
                    </span>
                    {paises.length > 0 && (
                      <span className={estilos.bandeirasAno} aria-hidden="true">
                        {paises.slice(0, BANDEIRAS_NO_TITULO).map((p) => (
                          <Bandeira key={p} pais={p} classe={estilos.bandeiraPequena} />
                        ))}
                        {paises.length > BANDEIRAS_NO_TITULO && <span className={estilos.maisPaises}>+{paises.length - BANDEIRAS_NO_TITULO}</span>}
                      </span>
                    )}
                  </button>
                  {editavel && (
                    <button className={estilos.mais} onClick={() => setEditando({ ano })} aria-label={`Adicionar viagem em ${ano ?? "sem ano"}`} title="Adicionar viagem neste ano">
                      +
                    </button>
                  )}
                </div>

                {aberto && (
                  <ul className={estilos.viagens}>
                    {doAno.map((v) => (
                      <li key={v.id} className={estilos.viagem}>
                        <Bandeira pais={v.pais} classe={estilos.bandeira} />
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
                          {editavel && (
                            <div className={estilos.botoesViagem}>
                              <button onClick={() => setEditando({ viagem: v, ano: v.ano })}>Editar</button>
                              <button onClick={() => void apagar(v)}>Apagar</button>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {sessao && (
        <footer className={estilos.rodape}>
          <span>{podeEditar ? `Conectado como ${sessao.user.email}` : "Esta conta não é a dona deste mapa."}</span>
          <button
            className={estilos.link}
            onClick={() => {
              setModoEdicao(false);
              void sair();
            }}
          >
            Sair
          </button>
        </footer>
      )}

      {editando && (
        <FormularioViagem
          key={editando.viagem?.id ?? `nova-${editando.ano}`} // cada viagem começa o formulário do zero
          viagem={editando.viagem} anoInicial={editando.ano} primeiroAno={PRIMEIRO_ANO} aoSalvar={salvar} aoCancelar={() => setEditando(null)} />
      )}
    </div>
  );
}

// Para editar, o site precisa saber que é o dono do mapa: um link no e-mail, uma vez só
// (depois o navegador fica conectado)
function Entrada({ sessao, aoCancelar }: { sessao: Session | null; aoCancelar: () => void }) {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"" | "enviando" | "enviado" | "erro">("");

  if (sessao) {
    return (
      <div className={estilos.faixaEdicao}>
        <span>Esta conta não é a dona deste mapa.</span>
        <button className={estilos.link} onClick={() => void sair()}>
          Sair
        </button>
      </div>
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
    <div className={estilos.faixaEdicao}>
      {estado === "enviado" ? (
        <span>Pronto: abra o link que chegou em {email}. Ele abre o Órbita já conectado: é só voltar em Minhas viagens e clicar em Editar.</span>
      ) : (
        <form className={estilos.entrar} onSubmit={enviar}>
          <span>Para editar, confirme que é você: mandamos um link para o seu e-mail (só na primeira vez).</span>
          <input type="email" required placeholder="Seu e-mail" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="E-mail" autoFocus />
          <button className={estilos.botaoPrincipal} disabled={estado === "enviando"}>
            {estado === "enviando" ? "Enviando…" : "Enviar link"}
          </button>
          <button type="button" className={estilos.link} onClick={aoCancelar}>
            Cancelar
          </button>
          {estado === "erro" && <span className={estilos.aviso}>Não deu certo. Confira o e-mail ou tente daqui a um minuto.</span>}
        </form>
      )}
    </div>
  );
}
