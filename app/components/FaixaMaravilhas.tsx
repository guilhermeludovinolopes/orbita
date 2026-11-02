"use client";

import { MARAVILHAS, type Maravilha } from "@/lib/maravilhas";
import type { AtracaoVista } from "@/lib/visitas";
import GrupoRecolhivel from "./GrupoRecolhivel";
import estilos from "./FaixaMaravilhas.module.css";

type Props = {
  vistas: Map<string, AtracaoVista>;
  aoEscolher: (maravilha: Maravilha) => void;
};

// As 7 Maravilhas do Mundo, no topo da coluna da direita (fechadas até abrir pela setinha),
// com as que o Guilherme já viu em dourado
export default function FaixaMaravilhas({ vistas, aoEscolher }: Props) {
  const total = MARAVILHAS.filter((m) => vistas.has(m.id)).length;
  return (
    <GrupoRecolhivel titulo="7 Maravilhas" contador={`${total} de 7`}>
      <ul className={estilos.lista}>
        {MARAVILHAS.map((m) => {
          const vista = vistas.get(m.id);
          return (
            <li key={m.id}>
              <button
                className={`${estilos.maravilha} ${vista ? estilos.vista : ""}`}
                onClick={() => aoEscolher(m)}
                title={`${m.nome} · ${m.onde}${vista ? " · vista" : ""}`}
              >
                <span className={estilos.marca} aria-hidden="true">{vista ? "★" : "☆"}</span>
                {m.curto}
              </button>
            </li>
          );
        })}
      </ul>
    </GrupoRecolhivel>
  );
}
