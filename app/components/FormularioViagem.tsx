"use client";

import { useEffect, useMemo, useState } from "react";
import { DETALHE_PAISES } from "@/lib/detalhe-paises";
import { buscarLugares, carregarLugares, nomeDoPais, type Lugar, type NovaViagem, type Viagem } from "@/lib/viagens";
import estilos from "./MinhasViagens.module.css";

const MODOS: [Lugar["tipo"], string][] = [["município", "Cidade"], ["estado", "Estado"], ["país", "País"]];

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

type Props = {
  viagem?: Viagem; // editando; sem ela, é uma viagem nova
  anoInicial: number | null;
  primeiroAno: number;
  aoSalvar: (viagem: NovaViagem) => Promise<void>;
  aoCancelar: () => void;
};

// O lugar de uma viagem já gravada, no mesmo formato dos resultados da busca
function lugarDa(v: Viagem): Lugar {
  const paisNome = nomeDoPais(v.pais);
  const tipo = v.municipio ? "município" : v.nivel1 ? "estado" : "país";
  const nomes = DETALHE_PAISES[v.pais]?.nomes;
  return {
    tipo,
    pais: v.pais,
    paisNome,
    nivel1: v.nivel1,
    nivel1Nome: v.nivel1Nome,
    condado: v.condado,
    condadoNome: v.condadoNome,
    municipio: v.municipio,
    municipioNome: v.municipioNome,
    nome: v.municipioNome ?? v.nivel1Nome ?? paisNome,
    rotulo: tipo === "município" ? (nomes?.municipio[0] ?? tipo) : tipo === "estado" ? (nomes?.estado[0] ?? tipo) : "país",
    onde: tipo === "município" ? `${v.nivel1Nome}, ${paisNome}` : tipo === "estado" ? paisNome : "",
    chave: "",
  };
}

// "comune · Lazio, Itália", "estado · Brasil", "país"
const descrever = (l: Lugar) => (l.onde ? `${l.rotulo} · ${l.onde}` : l.rotulo);

// Criar ou editar uma viagem: lugar (busca), data (ano, mês e dia opcionais), local e observação
export default function FormularioViagem({ viagem, anoInicial, primeiroAno, aoSalvar, aoCancelar }: Props) {
  const [lugar, setLugar] = useState<Lugar | null>(viagem ? lugarDa(viagem) : null);
  const [texto, setTexto] = useState("");
  // Buscar por cidade (o normal: o estado e o país vêm junto), ou só por estado ou país, para quem quer só pintar o mapa
  const [modo, setModo] = useState<Lugar["tipo"]>(viagem ? lugarDa(viagem).tipo : "município");
  const [todos, setTodos] = useState<Lugar[] | null>(null);
  const [ano, setAno] = useState<number | null>(viagem ? viagem.ano : anoInicial);
  const [mes, setMes] = useState<number | null>(viagem?.mes ?? null);
  const [dia, setDia] = useState<number | null>(viagem?.dia ?? null);
  const [local, setLocal] = useState(viagem?.local ?? "");
  const [observacao, setObservacao] = useState(viagem?.observacao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // A lista de lugares vem aos pedaços: muda conforme a primeira palavra digitada
  useEffect(() => {
    let atual = true;
    carregarLugares(modo === "município" ? texto : "").then(
      (lista) => atual && setTodos(lista),
      (e) => {
        console.error("Não consegui carregar a lista de lugares", e);
        setErro("Não consegui carregar a lista de lugares.");
      },
    );
    return () => {
      atual = false;
    };
  }, [texto, modo]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && aoCancelar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aoCancelar]);

  const resultados = useMemo(() => {
    if (!todos) return [];
    return buscarLugares(todos.filter((l) => l.tipo === modo), texto);
  }, [todos, texto, modo]);

  const anoAtual = new Date().getFullYear();
  const anos: number[] = [];
  for (let a = Math.max(anoAtual, ano ?? 0); a >= Math.min(primeiroAno, ano ?? primeiroAno); a--) anos.push(a);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!lugar) return;
    setSalvando(true);
    setErro(null);
    try {
      await aoSalvar({
        ano,
        mes: ano ? mes : null,
        dia: ano && mes ? dia : null,
        pais: lugar.pais,
        nivel1: lugar.nivel1,
        nivel1Nome: lugar.nivel1Nome,
        condado: lugar.condado,
        condadoNome: lugar.condadoNome,
        municipio: lugar.municipio,
        municipioNome: lugar.municipioNome,
        local,
        observacao,
      });
    } catch (e) {
      console.error("Não consegui salvar a viagem", e);
      setErro("Não consegui salvar. Confira se você ainda está conectado e tente de novo.");
      setSalvando(false);
    }
  }

  return (
    <div className={estilos.formularioFundo}>
      <form className={estilos.formulario} onSubmit={enviar}>
        <h3 className={estilos.tituloFormulario}>{viagem ? "Editar viagem" : "Nova viagem"}</h3>

        <div className={estilos.campo}>
          <span>Lugar</span>
          {lugar ? (
            <div className={estilos.escolhido}>
              <div>
                <strong>{lugar.nome}</strong>
                <small>
                  {descrever(lugar)}
                </small>
              </div>
              <button type="button" className={estilos.link} onClick={() => setLugar(null)}>
                Trocar
              </button>
            </div>
          ) : (
            <>
              <div className={estilos.modos} role="radiogroup" aria-label="Buscar por">
                {MODOS.map(([tipo, rotulo]) => (
                  <button key={tipo} type="button" role="radio" aria-checked={modo === tipo} className={modo === tipo ? estilos.modoAtivo : estilos.modo} onClick={() => setModo(tipo)}>
                    {rotulo}
                  </button>
                ))}
              </div>
              <input
                type="search"
                autoFocus
                placeholder={!todos ? "Carregando a lista de lugares…" : `${MODOS.find(([t]) => t === modo)![1]}…`}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
              {resultados.length > 0 && (
                <ul className={estilos.resultados}>
                  {resultados.map((l) => (
                    <li key={`${l.tipo}-${l.pais}-${l.nivel1}-${l.municipio}`}>
                      <button type="button" onClick={() => setLugar(l)}>
                        <strong>{l.nome}</strong>
                        <small>
                          {descrever(l)}
                        </small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {todos && texto.trim().length >= 2 && resultados.length === 0 && <small className={estilos.ajuda}>Nada com esse nome.</small>}
              <small className={estilos.ajuda}>
                {modo === "município"
                  ? "O estado e o país entram junto com a cidade."
                  : `O ${modo} fica pintado no mapa, sem nenhuma cidade marcada.`}
              </small>
            </>
          )}
        </div>

        <div className={estilos.linhaCampos}>
          <label className={estilos.campo}>
            <span>Ano</span>
            <select value={ano ?? ""} onChange={(e) => setAno(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Sem ano</option>
              {anos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className={estilos.campo}>
            <span>Mês</span>
            <select value={mes ?? ""} disabled={!ano} onChange={(e) => setMes(e.target.value ? Number(e.target.value) : null)}>
              <option value="">—</option>
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className={estilos.campo}>
            <span>Dia</span>
            <input
              type="number"
              min={1}
              max={31}
              disabled={!ano || !mes}
              value={dia ?? ""}
              onChange={(e) => setDia(e.target.value ? Number(e.target.value) : null)}
            />
          </label>
        </div>

        <label className={estilos.campo}>
          <span>Local específico (opcional)</span>
          <input placeholder="Ex.: Riviera de São Lourenço" value={local} onChange={(e) => setLocal(e.target.value)} />
        </label>

        <label className={estilos.campo}>
          <span>Observação (opcional)</span>
          <textarea rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </label>

        {erro && <p className={estilos.aviso}>{erro}</p>}

        <div className={estilos.botoesFormulario}>
          <button type="button" className={estilos.link} onClick={aoCancelar}>
            Cancelar
          </button>
          <button className={estilos.botaoPrincipal} disabled={!lugar || salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
