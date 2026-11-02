// As 7 Maravilhas do Mundo Moderno (eleitas em 2007 pela New7Wonders).
// Quem marca as que já viu é o Guilherme, à mão (tabela atracoes_visitadas).

export type Maravilha = {
  id: string; // usado na tabela atracoes_visitadas
  nome: string;
  curto: string; // nome curto para a faixa
  onde: string;
  pais: string; // código do globo
  ponto: [number, number]; // [longitude, latitude]
  imagem: string; // ilustração feita pelo Guilherme, mostrada no mapa quando a Maravilha é escolhida
};

export const MARAVILHAS: Maravilha[] = [
  { id: "maravilha-grande-muralha", nome: "Grande Muralha da China", curto: "Grande Muralha", onde: "Pequim, China", pais: "CN", ponto: [116.02, 40.3588], imagem: "/maravilhas/grande-muralha.webp" },
  { id: "maravilha-petra", nome: "Petra", curto: "Petra", onde: "Ma'an, Jordânia", pais: "JO", ponto: [35.4444, 30.3285], imagem: "/maravilhas/petra.webp" },
  { id: "maravilha-cristo-redentor", nome: "Cristo Redentor", curto: "Cristo Redentor", onde: "Rio de Janeiro, Brasil", pais: "BR", ponto: [-43.2105, -22.9519], imagem: "/maravilhas/cristo-redentor.webp" },
  { id: "maravilha-machu-picchu", nome: "Machu Picchu", curto: "Machu Picchu", onde: "Cusco, Peru", pais: "PE", ponto: [-72.545, -13.1631], imagem: "/maravilhas/machu-picchu.webp" },
  { id: "maravilha-chichen-itza", nome: "Chichén Itzá", curto: "Chichén Itzá", onde: "Yucatán, México", pais: "MX", ponto: [-88.5678, 20.6843], imagem: "/maravilhas/chichen-itza.webp" },
  { id: "maravilha-coliseu", nome: "Coliseu", curto: "Coliseu", onde: "Roma, Itália", pais: "IT", ponto: [12.4922, 41.8902], imagem: "/maravilhas/coliseu.webp" },
  { id: "maravilha-taj-mahal", nome: "Taj Mahal", curto: "Taj Mahal", onde: "Agra, Índia", pais: "IN", ponto: [78.0421, 27.1751], imagem: "/maravilhas/taj-mahal.webp" },
];
