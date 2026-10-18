-- Órbita: Dublin City ganha o código oficial da Tailte Éireann (BDY_ID 265011),
-- no lugar do código provisório usado na importação.

update public.visitas
set nivel2_codigo = '265011',
    nivel2_nome = 'Dublin City'
where pais_codigo = 'IE'
  and nivel2_codigo = 'IE-D-DUBLIN-CITY';
