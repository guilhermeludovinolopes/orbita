import Globo from "./components/Globo";
import estilos from "./page.module.css";

// O globo ocupa a tela inteira, com o espaço atrás; os painéis abrem pelos ícones dos cantos
export default function Inicio() {
  return (
    <main className={estilos.tela}>
      <Globo />
    </main>
  );
}
