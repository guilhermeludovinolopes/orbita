-- Órbita: perfis de usuário e visitas.
-- Os contornos do mapa (países, estados, municípios) não ficam no banco:
-- são arquivos estáticos servidos pelo site. Aqui guardamos só os códigos oficiais.

-- Perfil público de cada pessoa (1 para 1 com auth.users)
create table public.perfis (
  id          uuid primary key references auth.users (id) on delete cascade,
  usuario     text unique not null check (usuario ~ '^[a-z0-9-]{3,30}$'),
  nome        text not null,
  publico     boolean not null default true,
  criado_em   timestamptz not null default now()
);

-- Uma visita = um lugar + uma data + uma observação
create table public.visitas (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null references public.perfis (id) on delete cascade,

  -- Data: ano obrigatório; mês e dia opcionais
  ano             smallint not null check (ano between 1900 and 2100),
  mes             smallint check (mes between 1 and 12),
  dia             smallint check (dia between 1 and 31),

  -- Lugar, por código oficial (o nome fica guardado para exibição)
  pais_codigo     char(2) not null,          -- ISO 3166-1, ex.: BR, IT
  nivel1_codigo   text not null,             -- ISO 3166-2, ex.: BR-SP, IT-42
  nivel1_nome     text not null,             -- ex.: São Paulo, Liguria
  nivel2_codigo   text not null,             -- código nacional, ex.: IBGE 3518701
  nivel2_nome     text not null,             -- ex.: Guarujá, Genova

  -- Local específico dentro do município (opcional), ex.: Riviera de São Lourenço
  local_nome      text,
  local_lat       double precision check (local_lat between -90 and 90),
  local_lng       double precision check (local_lng between -180 and 180),

  observacao      text,

  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),

  constraint dia_exige_mes check (dia is null or mes is not null),
  constraint coordenadas_juntas check ((local_lat is null) = (local_lng is null))
);

create index visitas_usuario_ano on public.visitas (usuario_id, ano);
create index visitas_usuario_lugar on public.visitas (usuario_id, pais_codigo, nivel1_codigo, nivel2_codigo);

create function public.tocar_atualizado_em() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger visitas_atualizado_em
  before update on public.visitas
  for each row execute function public.tocar_atualizado_em();

-- Segurança: qualquer um lê perfis e visitas públicos; só o dono escreve.
alter table public.perfis enable row level security;
alter table public.visitas enable row level security;

create policy "perfis públicos são visíveis"
  on public.perfis for select
  using (publico or id = auth.uid());

create policy "cada um cria o próprio perfil"
  on public.perfis for insert
  with check (id = auth.uid());

create policy "cada um edita o próprio perfil"
  on public.perfis for update
  using (id = auth.uid());

create policy "visitas de perfis públicos são visíveis"
  on public.visitas for select
  using (
    usuario_id = auth.uid()
    or exists (select 1 from public.perfis p where p.id = usuario_id and p.publico)
  );

create policy "cada um cria as próprias visitas"
  on public.visitas for insert
  with check (usuario_id = auth.uid());

create policy "cada um edita as próprias visitas"
  on public.visitas for update
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

create policy "cada um apaga as próprias visitas"
  on public.visitas for delete
  using (usuario_id = auth.uid());
