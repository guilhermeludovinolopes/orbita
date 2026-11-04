import Image from "next/image";
import Globo from "./components/Globo";
import estilos from "./page.module.css";

// O globo ocupa a tela inteira, com o espaço atrás; o símbolo e o nome flutuam no canto,
// com o ícone de Minhas viagens logo abaixo (no Globo) e o de Países no canto direito
export default function Inicio() {
  return (
    <main className={estilos.tela}>
      <Globo />
      <header className={estilos.topo}>
        <Image className={estilos.simbolo} src="/marca/orbita-simbolo-transparente.png" alt="" width={176} height={176} priority />
        <div>
          <h1 className={estilos.titulo}>Órbita</h1>
          <p className={estilos.subtitulo}>Guilherme Lopes</p>
        </div>
      </header>
    </main>
  );
}
