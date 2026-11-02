// Miniaturas das 7 Maravilhas, desenhadas para o Órbita em traço simples (sem fotos de terceiros).
// Cada uma é o miolo de um SVG 64x64; a cor do traço vem de quem desenha (currentColor).

const MINIATURAS: Record<string, string> = {
  // Grande Muralha: a muralha subindo e descendo os morros, com uma torre de vigia
  "maravilha-grande-muralha": `
    <polyline points="6,44 18,34 30,40 42,28 58,36"/>
    <polyline points="6,52 18,42 30,48 42,36 58,44"/>
    <path d="M8 43 v-3 M12 40 v-3 M16 36 v-3 M22 36 v-3 M26 38 v-3 M50 32 v-3 M54 34 v-3"/>
    <path d="M38 31 V19 H48 V31"/>
    <path d="M38 19 v-3 h3 v3 M45 19 v-3 h3 v3"/>
    <path d="M42 31 v-5 h2 v5"/>`,

  // Petra: a fachada do Tesouro, com colunas, frontão e o pavilhão redondo em cima
  "maravilha-petra": `
    <path d="M12 54 H52"/>
    <path d="M16 54 V36 M24 54 V36 M40 54 V36 M48 54 V36"/>
    <path d="M14 36 H50 L32 28 Z"/>
    <path d="M24 28 V16 M40 28 V16 M30 28 V18 M34 28 V18"/>
    <path d="M22 16 H42"/>
    <path d="M27 16 a5 5 0 0 1 10 0"/>
    <path d="M29 54 V44 a3 3 0 0 1 6 0 V54"/>`,

  // Cristo Redentor: a estátua de braços abertos sobre o Corcovado
  "maravilha-cristo-redentor": `
    <circle cx="32" cy="15" r="3.5"/>
    <path d="M12 22 H52"/>
    <path d="M28 22 L26.5 43 H37.5 L36 22"/>
    <path d="M27 43 v3 h10 v-3"/>
    <path d="M6 56 L20 47 L28 46 H36 L44 47 L58 56"/>`,

  // Machu Picchu: o pico do Huayna Picchu e os terraços da cidadela
  "maravilha-machu-picchu": `
    <path d="M6 54 L20 34 L27 40 L38 12 L50 34 L58 54"/>
    <path d="M14 46 H30 M11 50 H34 M8 54 H38"/>
    <path d="M18 46 v-3 h4 v3 M24 46 v-3 h4 v3"/>
    <path d="M41 24 l4 6"/>`,

  // Chichén Itzá: a pirâmide de degraus (El Castillo) com o templo no topo
  "maravilha-chichen-itza": `
    <path d="M6 54 H58"/>
    <path d="M10 54 V48 H54 V54"/>
    <path d="M14 48 V42 H50 V48"/>
    <path d="M18 42 V36 H46 V42"/>
    <path d="M22 36 V30 H42 V36"/>
    <path d="M26 30 V20 H38 V30"/>
    <path d="M29 30 v-5 h6 v5"/>
    <path d="M29 54 L29.5 30 M35 54 L34.5 30"/>`,

  // Coliseu: a parede curva com as fileiras de arcos
  "maravilha-coliseu": `
    <path d="M8 52 H56 V22 Q32 12 8 22 Z"/>
    <path d="M8 32 H56 M8 42 H56"/>
    <path d="M12 52 v-6 a3 3 0 0 1 6 0 v6 M22 52 v-6 a3 3 0 0 1 6 0 v6 M32 52 v-6 a3 3 0 0 1 6 0 v6 M42 52 v-6 a3 3 0 0 1 6 0 v6"/>
    <path d="M12 42 v-5 a3 3 0 0 1 6 0 v5 M22 42 v-5 a3 3 0 0 1 6 0 v5 M32 42 v-5 a3 3 0 0 1 6 0 v5 M42 42 v-5 a3 3 0 0 1 6 0 v5"/>
    <path d="M14 30 v-3 h3 v3 M23 28 v-3 h3 v3 M32 27 v-3 h3 v3 M41 28 v-3 h3 v3"/>`,

  // Taj Mahal: a cúpula em forma de cebola, o portal e os dois minaretes
  "maravilha-taj-mahal": `
    <path d="M6 54 H58"/>
    <path d="M18 54 V34 H46 V54"/>
    <path d="M21 34 C21 24 32 18 32 12 C32 18 43 24 43 34"/>
    <path d="M32 12 V7"/>
    <path d="M27 54 V44 a5 5 0 0 1 10 0 V54"/>
    <path d="M11 54 V24 M53 54 V24"/>
    <path d="M9 24 h4 M51 24 h4 M10 24 a1.5 1.5 0 0 1 2 -3 M52 24 a1.5 1.5 0 0 1 2 -3"/>`,
};

export function svgDaMiniatura(id: string): string {
  return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${MINIATURAS[id] ?? ""}</svg>`;
}
