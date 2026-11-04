// Ícones dos dois botões redondos do globo (traço em Papel, 24×24, herdam a cor do botão)

// Minhas viagens: um diário de viagem aberto, com uma rota tracejada até um alfinete
export function IconeViagens() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 5.5c2.6-1 5.4-1 8 0v14c-2.6-1-5.4-1-8 0z" />
      <path d="M21 5.5c-2.6-1-5.4-1-8 0v14c2.6-1 5.4-1 8 0z" />
      <path d="M5 15.5c1-1.8 2.2-1.2 3-3" strokeDasharray="1.4 1.8" />
      <path d="M17 13.2c-1.5-1.6-2.2-2.6-2.2-3.6a2.2 2.2 0 0 1 4.4 0c0 1-.7 2-2.2 3.6z" />
      <circle cx="17" cy="9.6" r=".6" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Países: uma bandeira tremulando no mastro
export function IconePaises() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 21V3.5" />
      <path d="M5 4.5c2.4-1.4 4.6-1.4 7 0s4.6 1.4 7 0v8c-2.4 1.4-4.6 1.4-7 0s-4.6-1.4-7 0" />
    </svg>
  );
}
