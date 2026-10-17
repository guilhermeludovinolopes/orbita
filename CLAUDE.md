# Órbita — regras do projeto

App web pessoal do Guilherme Lopes (linha **GL Pessoal**, sem fins profissionais) para registrar os lugares visitados, ano a ano, num globo interativo.

## Governança (obrigatório)
- Nenhuma decisão final sem aprovação do Guilherme. Na dúvida, perguntar.
- Toda mudança entra por Pull Request no GitHub. O `main` é protegido; nunca enviar direto para ele.
- Quem faz o merge é o Guilherme, nunca o Claude.
- Se uma ideia puder ser melhorada, dizer com franqueza e propor alternativa.

## Contas
- GitHub: `guilhermeludovinolopes` (repo `guilhermeludovinolopes/orbita`, público). Vercel e Supabase entram por essa conta.
- Nesta máquina também existem as contas de trabalho `Yakarana` e `Yakarana7`. **Nunca** usá-las aqui. Comandos `gh` usam `GH_TOKEN` da conta pessoal.
- Segredos nunca entram no código: ficam na Vercel / Supabase e em `.env.local` (ignorado).

## Dados
- Fonte original: planilha `~/Documents/Arrumar/Roadmap - Guilherme Lopes.xlsx` (aba "Time Line"). Não alterar.
- `dados/` fica fora do Git (dados pessoais em repo público).
- Cada visita = lugar (por código oficial) + data (ano obrigatório; mês e dia opcionais) + observação livre + local específico opcional (ex.: Riviera de São Lourenço dentro de Bertioga).
- Hierarquia: país → estado (1º nível) → **condado, só onde existe** (US, IE) → município. O município fica sempre no mesmo nível em todos os países (São Paulo está no nível de Dublin, não no de County Dublin). Sem condado, o zoom vai direto do estado para o município. Nomes oficiais locais.
- Reino Unido separado em 4 nações, cada uma como "país" no globo: Inglaterra (`GB-ENG`), Escócia (`GB-SCT`), País de Gales (`GB-WLS`), Irlanda do Norte (`GB-NIR`).

## Mapa e cores
- Globo 3D; clique no país → mapa do país por 2º nível; clique no estado → municípios.
- Não visitado: sem preenchimento e sem borda. Visitado: verde. Completo (visitou absolutamente tudo dentro): dourado.

## Marca (guia GL Pessoal v1)
- Marinho `#13294B` (principal), Bordô `#6B1420` (destaque), Dourado `#C9A34E` (acento, nunca texto pequeno em fundo claro), Marrom Café `#3B2418`, Papel `#F5F0E8`, Tinta `#000F0C`.
- Verde novo em avaliação: `#2E6A4F` (ainda não aprovado).
- Instrument Sans (600 títulos, 400 texto), IBM Plex Mono para legendas e dados. Ênfase só por peso, nunca itálico.
- Evitar roxo, rosa e gradientes. Um acento de cor por peça. Símbolo sobre Tinta ou Marinho.
