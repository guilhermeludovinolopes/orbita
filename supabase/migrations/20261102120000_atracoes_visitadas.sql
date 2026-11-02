-- Órbita: atrações que a pessoa marcou como vistas (7 Maravilhas agora, atrações da UNESCO depois).
-- A lista das atrações fica no site (arquivos fixos); aqui guardamos só quem viu o quê, e quando.
-- A marcação é sempre manual: ir à cidade não quer dizer que viu a atração.

create table public.atracoes_visitadas (
  usuario_id  uuid not null references public.perfis (id) on delete cascade,
  atracao_id  text not null check (atracao_id ~ '^[a-z0-9-]+$'),  -- ex.: maravilha-coliseu
  ano         smallint check (ano between 1900 and 2100),           -- opcional
  observacao  text,
  criado_em   timestamptz not null default now(),
  primary key (usuario_id, atracao_id)
);

alter table public.atracoes_visitadas enable row level security;

create policy "atrações de perfis públicos são visíveis"
  on public.atracoes_visitadas for select
  using (
    usuario_id = auth.uid()
    or exists (select 1 from public.perfis p where p.id = usuario_id and p.publico)
  );

create policy "cada um marca as próprias atrações"
  on public.atracoes_visitadas for insert
  with check (usuario_id = auth.uid());

create policy "cada um edita as próprias atrações"
  on public.atracoes_visitadas for update
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

create policy "cada um desmarca as próprias atrações"
  on public.atracoes_visitadas for delete
  using (usuario_id = auth.uid());
