"use client";

import paisesMundo from "@/lib/paises-mundo.json";
import GrupoRecolhivel from "./GrupoRecolhivel";
import estilos from "./PainelBandeiras.module.css";

type Pais = { codigo: string; nome: string; continente: string };

const CONTINENTES = ["América do Sul", "América do Norte e Central", "Europa", "África", "Ásia", "Oceania"];

type Props = {
  visitados: Set<string>;
  aoEscolher: (codigo: string, nome: string) => void;
  atracoes: React.ReactNode; // seção "Atrações" (as 7 Maravilhas, por enquanto)
  aberto: boolean; // abre pelo ícone de bandeira no canto direito do globo
  aoFechar: () => void;
};

// Coluna da direita, por cima do globo: todas as bandeiras do mundo, com as dos países visitados em destaque
export default function PainelBandeiras({ visitados, aoEscolher, atracoes, aberto, aoFechar }: Props) {
  const paises = paisesMundo as Pais[];
  const totalVisitados = paises.filter((p) => visitados.has(p.codigo)).length;

  if (!aberto) return null;
  return (
    <>
      <aside className={estilos.coluna} aria-label="Bandeiras dos países">
        <header className={estilos.topo}>
          <h2 className={estilos.titulo}>Países</h2>
          <p className={estilos.contador}>
            {totalVisitados} de {paises.length}
          </p>
          <button className={estilos.fechar} onClick={aoFechar} aria-label="Fechar países">
            ×
          </button>
        </header>
        <div className={estilos.lista}>
          {/* Regiões fecham os continentes; Atrações vem embaixo */}
          <GrupoRecolhivel titulo="Regiões" contador={`${totalVisitados} de ${paises.length}`} macro>
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
          </GrupoRecolhivel>
          {atracoes}
        </div>
      </aside>
    </>
  );
}
