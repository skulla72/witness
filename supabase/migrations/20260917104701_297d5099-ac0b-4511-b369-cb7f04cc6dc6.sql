DROP FUNCTION IF EXISTS public.grants_for_org_public(uuid);

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.grants_for_org_public(_org_id uuid)
RETURNS TABLE (
  id uuid,
  org_id uuid,
  sponsor text,
  fund_name text,
  donor_name text,
  anonymous boolean,
  amount_cents integer,
  granted_on date,
  status text,
  note text,
  reference text,
  recorded_by uuid,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id,
         g.org_id,
         CASE WHEN g.anonymous THEN '' ELSE g.sponsor END,
         CASE WHEN g.anonymous THEN '' ELSE g.fund_name END,
         CASE WHEN g.anonymous THEN '' ELSE g.donor_name END,
         g.anonymous,
         g.amount_cents,
         g.granted_on,
         g.status,
         CASE WHEN g.anonymous THEN '' ELSE g.note END,
         ''::text,
         NULL::uuid,
         g.created_at
  FROM public.daf_grants g
  WHERE g.org_id = _org_id
    AND g.status = 'received'
  ORDER BY g.granted_on DESC
$$;

REVOKE ALL ON FUNCTION private.grants_for_org_public(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.grants_for_org_public(_org_id uuid)
RETURNS TABLE (
  id uuid,
  org_id uuid,
  sponsor text,
  fund_name text,
  donor_name text,
  anonymous boolean,
  amount_cents integer,
  granted_on date,
  status text,
  note text,
  reference text,
  recorded_by uuid,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = private
AS $$
  SELECT * FROM private.grants_for_org_public(_org_id)
$$;

REVOKE ALL ON FUNCTION public.grants_for_org_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grants_for_org_public(uuid) TO anon, authenticated, service_role;