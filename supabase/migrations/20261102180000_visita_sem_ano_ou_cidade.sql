-- Órbita: visitas mais flexíveis, para quem cadastra pelo site.
-- O ano passa a ser opcional (quem não quiser separar por anos só marca o lugar), e o lugar
-- pode parar no país ou no estado: assim dá para registrar países que ainda não têm mapa
-- detalhado (Japão, por exemplo) ou uma viagem de que não se lembra a cidade.

alter table public.visitas
  alter column ano drop not null,
  alter column nivel1_codigo drop not null,
  alter column nivel1_nome drop not null,
  alter column nivel2_codigo drop not null,
  alter column nivel2_nome drop not null,
  add constraint nivel1_completo check ((nivel1_codigo is null) = (nivel1_nome is null)),
  add constraint nivel2_completo check ((nivel2_codigo is null) = (nivel2_nome is null)),
  add constraint condado_exige_estado check (condado_codigo is null or nivel1_codigo is not null),
  add constraint municipio_exige_estado check (nivel2_codigo is null or nivel1_codigo is not null),
  add constraint mes_exige_ano check (mes is null or ano is not null);

comment on column public.visitas.ano is 'Ano da visita (opcional: sem ano, a visita só marca o lugar)';
comment on column public.visitas.nivel1_codigo is 'Estado (1º nível); vazio quando a visita marca só o país';
