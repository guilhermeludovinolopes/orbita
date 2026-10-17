// Dados provisórios só para o protótipo do globo: os países que aparecem na planilha.
// Serão substituídos pelas visitas do banco quando a importação for aprovada.

export type Situacao = "visitado" | "completo";

export const situacaoPorPais: Record<string, Situacao> = {
  BR: "visitado",
  "GB-ENG": "visitado",
  IT: "visitado",
  PT: "visitado",
  CH: "visitado",
  US: "visitado",
  IE: "visitado",
};
