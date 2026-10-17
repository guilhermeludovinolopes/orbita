import Image from "next/image";
import Globo from "./components/Globo";
import estilos from "./page.module.css";

export default function Inicio() {
  return (
    <main className={estilos.tela}>
      <header className={estilos.topo}>
        <Image
          className={estilos.simbolo}
          src="/marca/orbita-simbolo.png"
          alt=""
          width={1254}
          height={1254}
          priority
        />
        <div>
          <h1 className={estilos.titulo}>Órbita</h1>
          <p className={estilos.subtitulo}>Guilherme Lopes</p>
        </div>
      </header>
      <Globo />
    </main>
  );
}
