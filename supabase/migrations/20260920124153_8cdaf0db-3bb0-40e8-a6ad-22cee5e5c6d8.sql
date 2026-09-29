ALTER TABLE public.service_requests
  ADD COLUMN org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX service_requests_org_idx ON public.service_requests (org_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.leads_org(_org_id UUID, _user_id UUID)
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

GRANT EXECUTE ON FUNCTION public.leads_org(UUID, UUID) TO authenticated;

CREATE POLICY "Church leaders see their church's asks" ON public.service_requests
  FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.leads_org(org_id, auth.uid()));

CREATE POLICY "Church leaders see offers on their church's asks" ON public.service_offers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_requests r
      WHERE r.id = service_offers.request_id
        AND r.org_id IS NOT NULL
        AND public.leads_org(r.org_id, auth.uid())
    )
  );