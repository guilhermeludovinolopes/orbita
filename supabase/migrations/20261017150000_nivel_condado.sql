-- Órbita: nível opcional de condado entre o estado e o município.
-- Existe só em alguns países (EUA, Irlanda). Onde não existe, fica vazio e o
-- mapa vai direto do estado para o município.

alter table public.visitas
  add column condado_codigo text,          -- código oficial, ex.: FIPS 06037 (Los Angeles County)
  add column condado_nome   text,          -- ex.: Los Angeles County
  add constraint condado_completo check ((condado_codigo is null) = (condado_nome is null));

drop index public.visitas_usuario_lugar;
create index visitas_usuario_lugar
  on public.visitas (usuario_id, pais_codigo, nivel1_codigo, condado_codigo, nivel2_codigo);

comment on column public.visitas.nivel2_codigo is 'Município (cidade), sempre no mesmo nível em todos os países';
comment on column public.visitas.condado_codigo is 'Condado, só nos países que têm esse nível (EUA, Irlanda)';
