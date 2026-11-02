"use client";

import { useState } from "react";
import estilos from "./ListaLugares.module.css";

export type ItemLugar = {
  tipo: "estado" | "condado" | "municipio";
  codigo: string;
  nome: string;
  total?: number;
  visitados: number;
  anos: number[];
};

type Props = {
  titulo: string; // "estados", "províncias", "municípios"...
  itens: ItemLugar[];
  aoAbrir: (item: ItemLugar) => void;
};

const porcentagem = (feitos: number, total: number) => {
  if (!total || !feitos) return 0;
  return Math.max(1, Math.round((feitos / total) * 100)); // qualquer visita conta pelo menos 1%
};

// Lista dentro do painel: primeiro os lugares visitados (com porcentagem ou anos);
// estados e condados não visitados ficam atrás do botão "Ver todos".
export default function ListaLugares({ titulo, itens, aoAbrir }: Props) {
  const [todos, setTodos] = useState(false);
  const ehMunicipio = itens[0]?.tipo === "municipio";

  const visitados = itens
    .filter((i) => i.visitados > 0)
    .sort((a, b) =>
      ehMunicipio
        ? a.nome.localeCompare(b.nome, "pt-BR")
        : porcentagem(b.visitados, b.total ?? 0) - porcentagem(a.visitados, a.total ?? 0) || b.visitados - a.visitados,
    );
  // Municípios não visitados nunca aparecem na lista (seriam milhares)
  const outros = ehMunicipio ? [] : itens.filter((i) => i.visitados === 0).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  if (!visitados.length && !outros.length) return null;

  return (
    <section className={estilos.lista}>
      <h3 className={estilos.titulo}>
        {ehMunicipio ? `${titulo} visitados` : titulo}
      </h3>
      <ul>
        {[...visitados, ...(todos ? outros : [])].map((item) => {
          const pct = porcentagem(item.visitados, item.total ?? 0);
          return (
            <li key={item.codigo}>
              <button className={estilos.item} onClick={() => aoAbrir(item)}>
                <span className={estilos.nome}>{item.nome}</span>
                {ehMunicipio ? (
                  <span className={estilos.anos}>{item.anos.join(" · ")}</span>
                ) : (
                  <>
                    <span className={estilos.numeros}>
                      {item.visitados.toLocaleString("pt-BR")} de {(item.total ?? 0).toLocaleString("pt-BR")} · {pct}%
                    </span>
                    <span className={estilos.barra} aria-hidden="true">
                      <span className={pct === 100 ? estilos.completa : ""} style={{ width: `${pct}%` }} />
                    </span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {outros.length > 0 && (
        <button className={estilos.verTodos} onClick={() => setTodos(!todos)}>
          {todos ? "Mostrar só os visitados" : `Ver todos (${(visitados.length + outros.length).toLocaleString("pt-BR")})`}
        </button>
      )}
    </section>
  );
}
