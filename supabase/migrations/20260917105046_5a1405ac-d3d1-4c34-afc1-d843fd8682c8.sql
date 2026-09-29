CREATE OR REPLACE FUNCTION private.therapy_agreement_version()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$ SELECT '2026-09-1'::text $$;