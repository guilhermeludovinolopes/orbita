-- Órbita: o "país" do globo pode ser uma nação dentro de um Estado.
-- O Reino Unido aparece como Inglaterra, Escócia, País de Gales e Irlanda do Norte,
-- usando os códigos ISO 3166-2 (GB-ENG, GB-SCT, GB-WLS, GB-NIR).

alter table public.visitas
  alter column pais_codigo type text,
  add constraint pais_codigo_formato check (pais_codigo ~ '^[A-Z]{2}(-[A-Z]{3})?$');

comment on column public.visitas.pais_codigo is 'ISO 3166-1 (ex.: BR) ou, para nações do Reino Unido, ISO 3166-2 (ex.: GB-ENG)';
