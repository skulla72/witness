-- A switch the team can flip, so nothing goes out during the beta.
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read settings"
  ON public.platform_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only the team changes settings"
  ON public.platform_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER platform_settings_touch BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.platform_settings (key, enabled)
VALUES ('claim_invites', false)
ON CONFLICT (key) DO NOTHING;

-- One record per organization we reached out to, so nobody is contacted twice.
CREATE TABLE IF NOT EXISTS public.org_claim_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email',
  sent_to TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  prompted_by UUID,
  note TEXT NOT NULL DEFAULT '',
  handled_by UUID,
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS org_claim_invites_org_channel_idx
  ON public.org_claim_invites (org_id, channel);
GRANT SELECT ON public.org_claim_invites TO authenticated;
GRANT ALL ON public.org_claim_invites TO service_role;
ALTER TABLE public.org_claim_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only the team sees outreach"
  ON public.org_claim_invites FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only the team edits outreach"
  ON public.org_claim_invites FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER org_claim_invites_touch BEFORE UPDATE ON public.org_claim_invites
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();