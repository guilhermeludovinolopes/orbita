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
- Cada visita = lugar (por código oficial) + data (ano, mês e dia opcionais; sem ano a visita só marca o lugar) + observação livre + local específico opcional (ex.: Riviera de São Lourenço dentro de Bertioga). O lugar pode parar no país ou no estado (para países sem mapa detalhado, como o Japão).
- Tela: o globo e a imagem do espaço ocupam a tela inteira; o símbolo e o nome "Órbita · Guilherme Lopes" flutuam no canto de cima à esquerda, sem faixa de fundo. Dois ícones redondos (`app/components/Icones.tsx`, o Guilherme pode mandar versões novas), um embaixo do outro no canto direito: o diário de viagem abre "Minhas viagens" e a bandeira abre a coluna de países. Os painéis abrem ao lado dos ícones, por cima do globo, em Tinta translúcida, um de cada vez; o ícone aberto fica dourado. A coluna de países tem dois grupos de cima, fechados: Regiões (com os continentes dentro) e Atrações (com as 7 Maravilhas; outras listas entram ali). A legenda das cores fica sempre na imagem, no canto de baixo à esquerda.
- Painel "Minhas viagens" (ícone do diário): duas abas. "Ranking de países" tem filtro "Por anos" (anos diferentes em que foi ao país; o Brasil, onde mora, conta todos os anos de vida, desde 1999) e "Por visitas" (número de visitas registradas); a barra é proporcional ao primeiro colocado e o texto mostra só o número, sem "de 27". "Linha do tempo": por ano, do ano atual até 1999 (ano em que o Guilherme nasceu), mais o grupo "Sem ano". Todos veem; só edita quem sabe a chave do mapa (por enquanto só o Guilherme; o login por e-mail saiu porque não funcionava). A chave fica em `ORBITA_CHAVE` e a gravação usa a chave secreta do Supabase (`SUPABASE_SECRET_KEY`), ambas só nas variáveis de ambiente da Vercel e no `.env.local`; as rotas `app/api/chave` e `app/api/viagens` conferem a chave a cada pedido. As regras do banco continuam bloqueando gravação pela chave pública. Contas para outras pessoas ficam para depois. A busca de lugares usa `public/geo/lugares/` (gerado por `scripts/gerar-indice-lugares.mjs`; rodar de novo quando um mapa de país mudar): `base.json` com países, estados e condados, e os municípios em pedaços `m-<xx>.json` pelas 2 primeiras letras de cada palavra do nome; a busca baixa só o pedaço da primeira palavra digitada. O formulário busca por Cidade (padrão; o estado e o país entram junto), Estado ou País. Nomes conhecidos de cidades com nome oficial diferente (Munique, Nova York, Buenos Aires para a Ciudad Autónoma) ficam em `scripts/apelidos-lugares.json` e também entram na busca.
- Hierarquia: país → estado (1º nível) → **condado, só onde existe** (condado nos EUA e na Irlanda, província na Itália, distrito na Suíça) → município. O município fica sempre no mesmo nível em todos os países (São Paulo está no nível de Dublin, não no de County Dublin). Sem condado, o zoom vai direto do estado para o município. Nomes oficiais locais.
- Reino Unido separado em 4 nações, cada uma como "país" no globo: Inglaterra (`GB-ENG`), Escócia (`GB-SCT`), País de Gales (`GB-WLS`), Irlanda do Norte (`GB-NIR`).
- Londres é um lugar só (os 33 distritos juntos), com o código ONS da região Greater London (`E12000007`); por isso a região fica dourada quando visitada (aprovado pelo Guilherme). Dublin = Dublin City, com código provisório até o mapa da Irlanda.
- Códigos oficiais: IBGE (BR), Census/FIPS (US), ISTAT (IT), BFS (CH), INE/DICO (PT), ONS (Inglaterra); 1º nível em ISO 3166-2. Pipeline: `aplicar_respostas.py` → `casar_codigos.py` → `gerar_importacao.py` (o SQL gerado fica em `dados/` e é rodado no SQL Editor).

## Mapa e cores
- Globo 3D; clique no país → mapa do país por 2º nível; clique no estado → municípios. Países com esse detalhe ficam em `lib/detalhe-paises.ts`: Brasil (IBGE), EUA (Census), Itália (ISTAT), Suíça (swisstopo + BFS), Portugal (DGT + INE), Inglaterra (ONS), Irlanda (Tailte Éireann), Argentina (IGN), Chile (SUBDERE), Paraguai (INE), Bolívia (MDRyT), Canadá (StatCan) e Japão (MLIT, com romaji do Correio japonês), gerados por `scripts/gerar-<país>.mjs`; a maior parte da Europa (UE, EFTA, Balcãs e as nações do Reino Unido) vem da Eurostat (LAU 2023 + NUTS 2024) por `scripts/gerar-europa.mjs`; os demais das Américas, da Ásia, da Europa e toda a África vêm do COD-AB da ONU por `scripts/gerar-cod-ab.mjs` (uma configuração por país; sem tabela ISO, o código ISO 3166-2 vem do 1º nível do geoBoundaries) e, onde não há COD-AB (Austrália, Nova Zelândia, Coreia do Sul, Índia, Israel, Rússia e outros), do geoBoundaries por `scripts/gerar-geoboundaries.mjs`. Onde o departamento é o próprio município, `semCondado` pula o nível intermediário só naquele estado. Só Mônaco e Vaticano ficam sem mapa detalhado (não têm divisão interna). Onde só existe um nível abaixo do país (Guiana, Bahamas, ilhas do Caribe, Bahrein, Emirados, Montenegro, Moldávia, Andorra, San Marino, Maurício, Palau, Nauru), o país inteiro é o único "estado" e esse nível faz o papel de município. O Uruguai usa os municípios do geoBoundaries enquanto a camada oficial da DINOT estiver fora do ar. Países que atravessam o meridiano de 180° (Fiji, Kiribati, Nova Zelândia, Rússia) usam a opção `leste` dos geradores (longitudes negativas + 360). `scripts/conferir-mapas.mjs` confere se toda visita do banco acha o seu lugar nos mapas.
- Com condado (EUA, Itália, Suíça, Irlanda): país → estado → condado → município. Dentro do condado em foco, o que não é município (áreas rurais dos EUA) aparece num pastel mais escuro (`#B7AE9D`).
- Dourado: estado completo quando todos os municípios dele foram visitados; país completo quando todos os municípios do país foram. O município visitado é verde; quando o estado (ou o condado) dele está completo, os municípios também ficam dourados, porque aquele espaço está 100% visitado (ex.: a Cidade Autônoma de Buenos Aires, que tem um município só).
- Oceano realista: Blue Marble da NASA (domínio público) só com o mar, gerado por `scripts/gerar-oceano.mjs` em `public/geo/oceano.jpg`. Marinho fica por baixo, como reserva.
- Relevo sombreado da Natural Earth por cima das cores dos países (`scripts/gerar-relevo.mjs`); lagos e rios na cor do mar raso (`scripts/gerar-aguas.mjs`). Sem nuvens e sem dia/noite (decisão do Guilherme).
- Espaço ao redor do globo: imagem do espaço escolhida pelo Guilherme (`public/fundo/espaco.webp`, sol, planetas e galáxias), em tela cheia atrás do globo, sobre fundo Tinta. Para trocar, basta substituir o arquivo. Atmosfera bem sutil, que some ao aproximar (exceção consciente à regra de evitar gradientes, em avaliação).
- Não visitado: terra em tom pastel (`#D8CFBF`, em avaliação). Visitado: verde. Completo (visitou absolutamente tudo dentro): dourado.
- Divisas em Marrom Café, visíveis sobre todas as cores e o mar. País sob o mouse: contorno em Bordô, mais grosso.
- Foco ao entrar num país ou estado: o resto ganha película de Tinta a 60% (o mar escurece no nível do país) e a área em foco ganha contorno em Papel.
- Dourado do mapa mais vivo (`#E2B23A`), com halo `#F6D36B` em volta das áreas completas. O Dourado da marca (`#C9A34E`) continua nos textos.

## Marca (guia GL Pessoal v1)
- Marinho `#13294B` (principal), Bordô `#6B1420` (destaque), Dourado `#C9A34E` (acento, nunca texto pequeno em fundo claro), Marrom Café `#3B2418`, Papel `#F5F0E8`, Tinta `#000F0C`.
- Verde novo em avaliação: `#2E6A4F` (ainda não aprovado). Pastel da terra não visitada: `#D8CFBF` (em avaliação).
- Instrument Sans (600 títulos, 400 texto), IBM Plex Mono para legendas e dados. Ênfase só por peso, nunca itálico.
- Evitar roxo, rosa e gradientes. Um acento de cor por peça. Símbolo sobre Tinta ou Marinho.

## Ambiente
- No PowerShell desta máquina, use `npm.cmd` (scripts `.ps1` estão bloqueados).
