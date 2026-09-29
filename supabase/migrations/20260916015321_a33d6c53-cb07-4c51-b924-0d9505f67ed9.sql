CREATE TABLE public.daf_grants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sponsor TEXT NOT NULL DEFAULT '',
  fund_name TEXT NOT NULL DEFAULT '',
  donor_name TEXT NOT NULL DEFAULT '',
  anonymous BOOLEAN NOT NULL DEFAULT false,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  granted_on DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('expected','received')),
  note TEXT NOT NULL DEFAULT '',
  reference TEXT NOT NULL DEFAULT '',
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX daf_grants_org_idx ON public.daf_grants (org_id, granted_on DESC);

GRANT SELECT ON public.daf_grants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daf_grants TO authenticated;
GRANT ALL ON public.daf_grants TO service_role;

ALTER TABLE public.daf_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can see received grants"
  ON public.daf_grants FOR SELECT
  USING (status = 'received');

CREATE POLICY "Org leaders can see their grants"
  ON public.daf_grants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.org_id = daf_grants.org_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner','leader')
    )
  );

CREATE POLICY "Admins can see all grants"
  ON public.daf_grants FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can record grants"
  ON public.daf_grants FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update grants"
  ON public.daf_grants FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete grants"
  ON public.daf_grants FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_daf_grants_updated_at
  BEFORE UPDATE ON public.daf_grants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();