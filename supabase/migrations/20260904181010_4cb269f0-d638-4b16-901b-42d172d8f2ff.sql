ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '';

CREATE TABLE public.organization_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label text NOT NULL,
  day_of_week smallint NOT NULL DEFAULT 0,
  time_text text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  sort integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.organization_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_services TO authenticated;
GRANT ALL ON public.organization_services TO service_role;

ALTER TABLE public.organization_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service times are viewable by everyone"
  ON public.organization_services FOR SELECT USING (true);

CREATE POLICY "Leaders can add service times"
  ON public.organization_services FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = organization_services.org_id AND m.user_id = auth.uid()
      AND m.role = ANY (ARRAY['owner'::text, 'leader'::text])));

CREATE POLICY "Leaders can update service times"
  ON public.organization_services FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = organization_services.org_id AND m.user_id = auth.uid()
      AND m.role = ANY (ARRAY['owner'::text, 'leader'::text])))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = organization_services.org_id AND m.user_id = auth.uid()
      AND m.role = ANY (ARRAY['owner'::text, 'leader'::text])));

CREATE POLICY "Leaders can delete service times"
  ON public.organization_services FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = organization_services.org_id AND m.user_id = auth.uid()
      AND m.role = ANY (ARRAY['owner'::text, 'leader'::text])));

CREATE TRIGGER update_organization_services_updated_at
  BEFORE UPDATE ON public.organization_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.organization_prayer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT '',
  contact text NOT NULL DEFAULT '',
  request text NOT NULL,
  keep_private boolean NOT NULL DEFAULT true,
  prayed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.organization_prayer_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_prayer_requests TO authenticated;
GRANT ALL ON public.organization_prayer_requests TO service_role;

ALTER TABLE public.organization_prayer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can send a prayer request"
  ON public.organization_prayer_requests FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(btrim(request)) BETWEEN 1 AND 2000
    AND char_length(name) <= 120
    AND char_length(contact) <= 200
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "Leaders can read prayer requests"
  ON public.organization_prayer_requests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = organization_prayer_requests.org_id AND m.user_id = auth.uid()
      AND m.role = ANY (ARRAY['owner'::text, 'leader'::text])));

CREATE POLICY "Senders can read their own prayer requests"
  ON public.organization_prayer_requests FOR SELECT TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Leaders can mark prayer requests prayed for"
  ON public.organization_prayer_requests FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = organization_prayer_requests.org_id AND m.user_id = auth.uid()
      AND m.role = ANY (ARRAY['owner'::text, 'leader'::text])))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = organization_prayer_requests.org_id AND m.user_id = auth.uid()
      AND m.role = ANY (ARRAY['owner'::text, 'leader'::text])));

CREATE POLICY "Leaders can delete prayer requests"
  ON public.organization_prayer_requests FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = organization_prayer_requests.org_id AND m.user_id = auth.uid()
      AND m.role = ANY (ARRAY['owner'::text, 'leader'::text])));

CREATE TRIGGER update_organization_prayer_requests_updated_at
  BEFORE UPDATE ON public.organization_prayer_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.organization_services (org_id, label, day_of_week, time_text, note, sort)
SELECT o.id, 'Sunday Worship', 0, '9:00 AM', 'Coffee in the lobby from 8:30.', 1
FROM public.organizations o WHERE o.kind = 'church';

INSERT INTO public.organization_services (org_id, label, day_of_week, time_text, note, sort)
SELECT o.id, 'Sunday Worship', 0, '11:00 AM', 'Kids ministry runs during this hour.', 2
FROM public.organizations o WHERE o.kind = 'church';

INSERT INTO public.organization_services (org_id, label, day_of_week, time_text, note, sort)
SELECT o.id, 'Midweek Prayer', 3, '6:30 PM', 'Come as you are. Nothing to prepare.', 3
FROM public.organizations o WHERE o.kind = 'church';