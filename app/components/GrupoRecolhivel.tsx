"use client";

import { useId, useState } from "react";
import estilos from "./GrupoRecolhivel.module.css";

type Props = {
  titulo: string;
  contador: string; // ex.: "1 de 23", sempre na mesma linha do título
  children: React.ReactNode;
};

// Grupo da coluna da direita que começa fechado: uma setinha abre e fecha o conteúdo
export default function GrupoRecolhivel({ titulo, contador, children }: Props) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  return (
    <section className={estilos.grupo}>
      <button className={estilos.cabecalho} onClick={() => setAberto(!aberto)} aria-expanded={aberto} aria-controls={id}>
        <span className={`${estilos.seta} ${aberto ? estilos.setaAberta : ""}`} aria-hidden="true">
          ▸
        </span>
        <span className={estilos.titulo}>{titulo}</span>
        <span className={estilos.contador}>{contador}</span>
      </button>
      <div id={id} hidden={!aberto} className={estilos.conteudo}>
        {children}
      </div>
    </section>
  );
}
