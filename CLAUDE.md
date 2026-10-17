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
- Unidade do mapa por país: município (BR, IT, CH), concelho (PT), condado (US, IE). Nomes oficiais locais.

## Mapa e cores
- Globo 3D; clique no país → mapa do país por 2º nível; clique no estado → municípios.
- Oceano realista: Blue Marble da NASA (domínio público) só com o mar, gerado por `scripts/gerar-oceano.mjs` em `public/geo/oceano.jpg`. Marinho fica por baixo, como reserva.
- Espaço ao redor do globo: Tinta com estrelas. Atmosfera bem sutil, que some ao aproximar (exceção consciente à regra de evitar gradientes, em avaliação).
- Não visitado: terra em tom pastel (`#D8CFBF`, em avaliação). Visitado: verde. Completo (visitou absolutamente tudo dentro): dourado.
- Divisas na cor do oceano, para separar sem desenhar borda.

## Marca (guia GL Pessoal v1)
- Marinho `#13294B` (principal), Bordô `#6B1420` (destaque), Dourado `#C9A34E` (acento, nunca texto pequeno em fundo claro), Marrom Café `#3B2418`, Papel `#F5F0E8`, Tinta `#000F0C`.
- Verde novo em avaliação: `#2E6A4F` (ainda não aprovado). Pastel da terra não visitada: `#D8CFBF` (em avaliação).
- Instrument Sans (600 títulos, 400 texto), IBM Plex Mono para legendas e dados. Ênfase só por peso, nunca itálico.
- Evitar roxo, rosa e gradientes. Um acento de cor por peça. Símbolo sobre Tinta ou Marinho.

## Ambiente
- No PowerShell desta máquina, use `npm.cmd` (scripts `.ps1` estão bloqueados).
