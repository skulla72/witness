DROP POLICY "Church leaders see their church's asks" ON public.service_requests;
DROP POLICY "Church leaders see offers on their church's asks" ON public.service_offers;
DROP FUNCTION public.leads_org(UUID, UUID);

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.leads_org(_org_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = _org_id
      AND m.user_id = _user_id
      AND m.role IN ('owner', 'leader')
  )
$$;

REVOKE ALL ON FUNCTION private.leads_org(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.leads_org(UUID, UUID) TO authenticated;

CREATE POLICY "Church leaders see their church's asks" ON public.service_requests
  FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND private.leads_org(org_id, auth.uid()));

CREATE POLICY "Church leaders see offers on their church's asks" ON public.service_offers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_requests r
      WHERE r.id = service_offers.request_id
        AND r.org_id IS NOT NULL
        AND private.leads_org(r.org_id, auth.uid())
    )
  );