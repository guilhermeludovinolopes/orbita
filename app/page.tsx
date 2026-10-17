import Image from "next/image";
import estilos from "./page.module.css";

export default function Inicio() {
  return (
    <main className={estilos.tela}>
      <Image
        className={estilos.simbolo}
        src="/marca/orbita-simbolo.png"
        alt="Bússola Dourada em Órbita"
        width={1254}
        height={1254}
        priority
      />
      <div>
        <h1 className={estilos.titulo}>Órbita</h1>
        <p className={estilos.subtitulo}>O mapa das viagens de Guilherme Lopes</p>
      </div>
      <p className={estilos.legenda}>Em construção · 2026</p>
    </main>
  );
}
