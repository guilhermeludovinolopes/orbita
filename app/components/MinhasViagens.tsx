"use client";

import { useEffect, useMemo, useState } from "react";
import {
  apagarViagem,
  carregarViagens,
  chaveGuardada,
  entrarComChave,
  esquecerChave,
  nomeDoPais,
  salvarViagem,
  semAcento,
  type NovaViagem,
  type Viagem,
} from "@/lib/viagens";
import FormularioViagem from "./FormularioViagem";
import estilos from "./MinhasViagens.module.css";

// A linha do tempo começa no ano em que o Guilherme nasceu
const PRIMEIRO_ANO = 1999;
const PAIS_DE_CASA = "BR"; // onde o Guilherme mora: no ranking conta todos os anos de vida
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
// liga os botões de adicionar, editar e apagar (para quem sabe a chave do mapa).
export default function MinhasViagens({ aoFechar, aoMudar }: Props) {
  const [viagens, setViagens] = useState<Viagem[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [comChave, setComChave] = useState(false);
  const [editando, setEditando] = useState<{ viagem?: Viagem; ano: number | null } | null>(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [pedindoEntrada, setPedindoEntrada] = useState(false);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [filtro, setFiltro] = useState("");
  const [aba, setAba] = useState<"linha" | "ranking">("linha");

  const podeEditar = comChave;
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
    setComChave(Boolean(chaveGuardada())); // chave já conferida antes neste navegador
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
    await salvarViagem(nova, editando?.viagem?.id);
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
              Fechar
            </button>
          </div>
        </div>

        <div className={`${estilos.modos} ${estilos.abas}`} role="tablist" aria-label="Ver as viagens">
          <button role="tab" aria-selected={aba === "linha"} className={aba === "linha" ? estilos.modoAtivo : estilos.modo} onClick={() => setAba("linha")}>
            Linha do tempo
          </button>
          <button role="tab" aria-selected={aba === "ranking"} className={aba === "ranking" ? estilos.modoAtivo : estilos.modo} onClick={() => setAba("ranking")}>
            Ranking de países
          </button>
        </div>

        {pedindoEntrada && !podeEditar && <Entrada aoEntrar={() => setComChave(true)} aoCancelar={() => setPedindoEntrada(false)} />}

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
        {aba === "ranking" ? (
          <Ranking viagens={viagens ?? []} />
        ) : (
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
        )}
      </div>

      {podeEditar && (
        <footer className={estilos.rodape}>
          <span>Este navegador está liberado para editar.</span>
          <button
            className={estilos.link}
            onClick={() => {
              setModoEdicao(false);
              setComChave(false);
              esquecerChave();
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

// Ranking dos países, com filtro: por anos diferentes em que ele foi (o país onde mora conta todos os anos de vida)
// ou por número de visitas registradas (cada cidade, estado ou local conta uma)
type OrdemRanking = "anos" | "visitas";

const anosTexto = (n: number) => `${n} ${n === 1 ? "ano" : "anos diferentes"}`;
const visitasTexto = (n: number) => `${n} ${n === 1 ? "visita" : "visitas"}`;

function Ranking({ viagens }: { viagens: Viagem[] }) {
  const [ordem, setOrdem] = useState<OrdemRanking>("anos");
  const anosDeVida = new Date().getFullYear() - PRIMEIRO_ANO;
  const porPais = new Map<string, { anos: Set<number>; visitas: number }>();
  for (const v of viagens) {
    const item = porPais.get(v.pais) ?? { anos: new Set<number>(), visitas: 0 };
    if (v.ano) item.anos.add(v.ano);
    item.visitas++;
    porPais.set(v.pais, item);
  }
  const linhas = [...porPais].map(([pais, { anos, visitas }]) => {
    const lista = [...anos].sort((a, b) => a - b);
    const casa = pais === PAIS_DE_CASA;
    return { pais, nome: nomeDoPais(pais), anos: casa ? anosDeVida : lista.length, visitas, primeiro: lista[0], ultimo: lista.at(-1), casa };
  });
  const valor = (l: (typeof linhas)[number]) => (ordem === "anos" ? l.anos : l.visitas);
  const outro = (l: (typeof linhas)[number]) => (ordem === "anos" ? l.visitas : l.anos);
  linhas.sort((a, b) => valor(b) - valor(a) || outro(b) - outro(a) || a.nome.localeCompare(b.nome, "pt-BR"));
  const maior = Math.max(1, ...linhas.map(valor)); // a barra é proporcional ao primeiro colocado

  if (!linhas.length) return <p className={estilos.ajuda}>Nenhuma viagem ainda.</p>;
  return (
    <div className={estilos.ranking}>
      <div className={estilos.modos} role="radiogroup" aria-label="Ordenar o ranking">
        <button role="radio" aria-checked={ordem === "anos"} className={ordem === "anos" ? estilos.modoAtivo : estilos.modo} onClick={() => setOrdem("anos")}>
          Por anos
        </button>
        <button role="radio" aria-checked={ordem === "visitas"} className={ordem === "visitas" ? estilos.modoAtivo : estilos.modo} onClick={() => setOrdem("visitas")}>
          Por visitas
        </button>
      </div>
      <ol>
        {linhas.map((l, i) => {
          const periodo = l.casa ? "onde você mora" : l.primeiro ? (l.primeiro === l.ultimo ? `${l.primeiro}` : `de ${l.primeiro} a ${l.ultimo}`) : "";
          return (
            <li key={l.pais} className={[estilos.ouro, estilos.prata, estilos.bronze][i] ?? estilos.demais}>
              <span className={estilos.posicao}>{i + 1}º</span>
              <Bandeira pais={l.pais} classe={estilos.bandeiraRanking} />
              <div className={estilos.linhaRanking}>
                <div className={estilos.nomeRanking}>
                  <strong>{l.nome}</strong>
                  <span>{ordem === "anos" ? anosTexto(l.anos) : visitasTexto(l.visitas)}</span>
                </div>
                <div className={estilos.barra} aria-hidden="true">
                  <span style={{ width: `${Math.max(2, (valor(l) / maior) * 100)}%` }} />
                </div>
                <small>{[ordem === "anos" ? visitasTexto(l.visitas) : anosTexto(l.anos), periodo].filter(Boolean).join(" · ")}</small>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// Para editar, a chave do mapa (uma vez por navegador: depois ela fica guardada)
function Entrada({ aoEntrar, aoCancelar }: { aoEntrar: () => void; aoCancelar: () => void }) {
  const [chave, setChave] = useState("");
  const [estado, setEstado] = useState<"" | "conferindo" | "erro">("");
  const [mensagem, setMensagem] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("conferindo");
    try {
      const erro = await entrarComChave(chave);
      if (!erro) return aoEntrar();
      setMensagem(erro);
    } catch (erro) {
      console.error("Não consegui conferir a chave", erro);
      setMensagem("Não consegui falar com o servidor. Tente de novo.");
    }
    setEstado("erro");
  }

  return (
    <div className={estilos.faixaEdicao}>
      <form className={estilos.entrar} onSubmit={enviar}>
        <span>Para editar, digite a chave do mapa (só na primeira vez neste navegador).</span>
        <input type="password" required placeholder="Chave" value={chave} onChange={(e) => setChave(e.target.value)} aria-label="Chave" autoFocus />
        <button className={estilos.botaoPrincipal} disabled={estado === "conferindo"}>
          {estado === "conferindo" ? "Conferindo…" : "Entrar"}
        </button>
        <button type="button" className={estilos.link} onClick={aoCancelar}>
          Cancelar
        </button>
        {estado === "erro" && <span className={estilos.aviso}>{mensagem}</span>}
      </form>
    </div>
  );
}
