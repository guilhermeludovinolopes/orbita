"use client";

import { useState } from "react";
import paisesMundo from "@/lib/paises-mundo.json";
import GrupoRecolhivel from "./GrupoRecolhivel";
import estilos from "./PainelBandeiras.module.css";

type Pais = { codigo: string; nome: string; continente: string };

const CONTINENTES = ["América do Sul", "América do Norte e Central", "Europa", "África", "Ásia", "Oceania"];

type Props = {
  visitados: Set<string>;
  aoEscolher: (codigo: string, nome: string) => void;
  legenda: React.ReactNode;
  antesDosPaises?: React.ReactNode; // seção no topo da lista (as 7 Maravilhas)
};

// Coluna da direita: todas as bandeiras do mundo, com as dos países visitados em destaque
export default function PainelBandeiras({ visitados, aoEscolher, legenda, antesDosPaises }: Props) {
  const [aberto, setAberto] = useState(false); // só usado no celular, onde a coluna vira uma gaveta
  const paises = paisesMundo as Pais[];
  const totalVisitados = paises.filter((p) => visitados.has(p.codigo)).length;

  return (
    <>
      <button className={estilos.alternar} onClick={() => setAberto(!aberto)} aria-expanded={aberto}>
        {aberto ? "Fechar" : `Países · ${totalVisitados}`}
      </button>

      <aside className={`${estilos.coluna} ${aberto ? estilos.aberta : ""}`} aria-label="Bandeiras dos países">
        <header className={estilos.topo}>
          <h2 className={estilos.titulo}>Países</h2>
          <p className={estilos.contador}>
            {totalVisitados} de {paises.length}
          </p>
        </header>
        <div className={estilos.legenda}>{legenda}</div>

        <div className={estilos.lista}>
          {antesDosPaises}
          {CONTINENTES.map((continente) => {
            // Visitados primeiro, depois em ordem alfabética
            const doContinente = paises
              .filter((p) => p.continente === continente)
              .sort((a, b) => Number(visitados.has(b.codigo)) - Number(visitados.has(a.codigo)) || a.nome.localeCompare(b.nome, "pt-BR"));
            const vistos = doContinente.filter((p) => visitados.has(p.codigo)).length;
            return (
              <GrupoRecolhivel key={continente} titulo={continente} contador={`${vistos} de ${doContinente.length}`}>
                <ul className={estilos.grade}>
                  {doContinente.map((p) => (
                    <li key={p.codigo}>
                      <button
                        className={`${estilos.bandeira} ${visitados.has(p.codigo) ? estilos.visitado : ""}`}
                        onClick={() => {
                          aoEscolher(p.codigo, p.nome);
                          setAberto(false);
                        }}
                        title={p.nome}
                        aria-label={`${p.nome}${visitados.has(p.codigo) ? " (visitado)" : ""}`}
                      >
                        <img src={`/bandeiras/${p.codigo.toLowerCase()}.svg`} alt="" loading="lazy" width={40} height={30} />
                      </button>
                    </li>
                  ))}
                </ul>
              </GrupoRecolhivel>
            );
          })}
        </div>
      </aside>
    </>
  );
}
