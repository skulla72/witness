-- 1. Lane partners become real, claimable nonprofit organizations.
INSERT INTO public.organizations (slug, name, kind, city, region, description, website, address, verified)
VALUES
  ('second-mile-homes','Second Mile Homes','nonprofit','Denver','CO','Sober living beds for men leaving detox, with a work program.','secondmilehomes.org','Denver, CO', true),
  ('the-4am-club','The 4AM Club','nonprofit','Toledo','OH','Peer-run recovery meetings before shift work starts.','4amclub.org','Toledo, OH', false),
  ('anchor-mentors','Anchor Mentors','nonprofit','Atlanta','GA','One vetted man, one boy, three years minimum.','anchormentors.org','Atlanta, GA', true),
  ('saturday-dads','Saturday Dads','nonprofit','Little Rock','AR','Teaches incarcerated fathers to write and call home.','saturdaydads.org','Little Rock, AR', true),
  ('after-the-casseroles','After the Casseroles','nonprofit','Nashville','TN','Month 2 to month 24 of widow and widower care.','afterthecasseroles.org','Nashville, TN', true),
  ('quiet-courage','Quiet Courage','nonprofit','Phoenix','AZ','Trauma therapy and legal advocacy for survivors, no cost.','quietcourage.org','Phoenix, AZ', true),
  ('no-trash-bags','No Trash Bags','nonprofit','Kansas City','MO','A real suitcase and a week of clothes on placement night.','notrashbags.org','Kansas City, MO', true),
  ('steady-table','Steady Table','nonprofit','Portland','OR','Subsidized counseling for men who have never had a session.','steadytable.org','Portland, OR', true),
  ('third-shift-line','Third Shift Line','nonprofit','Remote','','Overnight peer line staffed by men in recovery.','thirdshiftline.org','Remote', false),
  ('tuesday-fund','Tuesday Fund','nonprofit','Columbus','OH','One-time rent and utility gaps, verified by local pastors.','tuesdayfund.org','Columbus, OH', true)
ON CONFLICT (slug) DO NOTHING;

-- 2. Nonprofit giving profile.
CREATE TABLE public.nonprofit_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  lane text NOT NULL,
  tier text NOT NULL DEFAULT 'grassroots',
  to_program integer NOT NULL DEFAULT 85 CHECK (to_program BETWEEN 0 AND 100),
  mission text NOT NULL DEFAULT '',
  accepting boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.nonprofit_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nonprofit_profiles TO authenticated;
GRANT ALL ON public.nonprofit_profiles TO service_role;

ALTER TABLE public.nonprofit_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nonprofit profiles are public"
  ON public.nonprofit_profiles FOR SELECT USING (true);

CREATE POLICY "Leaders can add their nonprofit profile"
  ON public.nonprofit_profiles FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.organization_members m
      WHERE m.org_id = nonprofit_profiles.org_id AND m.user_id = auth.uid()
        AND m.role = ANY (ARRAY['owner','leader']))
  );

CREATE POLICY "Leaders can update their nonprofit profile"
  ON public.nonprofit_profiles FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.organization_members m
      WHERE m.org_id = nonprofit_profiles.org_id AND m.user_id = auth.uid()
        AND m.role = ANY (ARRAY['owner','leader']))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.organization_members m
      WHERE m.org_id = nonprofit_profiles.org_id AND m.user_id = auth.uid()
        AND m.role = ANY (ARRAY['owner','leader']))
  );

CREATE POLICY "Leaders can remove their nonprofit profile"
  ON public.nonprofit_profiles FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.organization_members m
      WHERE m.org_id = nonprofit_profiles.org_id AND m.user_id = auth.uid()
        AND m.role = ANY (ARRAY['owner','leader']))
  );

CREATE TRIGGER update_nonprofit_profiles_updated_at
  BEFORE UPDATE ON public.nonprofit_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.nonprofit_profiles (org_id, lane, tier, to_program, mission)
SELECT o.id, v.lane, v.tier, v.to_program, v.mission
FROM (VALUES
  ('second-mile-homes','recovery','audited',87,'Sober living beds for men leaving detox, with a work program.'),
  ('the-4am-club','recovery','grassroots',96,'Peer-run recovery meetings before shift work starts.'),
  ('anchor-mentors','fatherlessness','audited',82,'One vetted man, one boy, three years minimum.'),
  ('saturday-dads','fatherlessness','growing',90,'Teaches incarcerated fathers to write and call home.'),
  ('after-the-casseroles','grief','growing',88,'Month 2 to month 24 of widow and widower care.'),
  ('quiet-courage','abuse','audited',79,'Trauma therapy and legal advocacy for survivors, no cost.'),
  ('no-trash-bags','foster','growing',92,'A real suitcase and a week of clothes on placement night.'),
  ('steady-table','mens_mental_health','growing',85,'Subsidized counseling for men who have never had a session.'),
  ('third-shift-line','mens_mental_health','grassroots',94,'Overnight peer line staffed by men in recovery.'),
  ('tuesday-fund','hunger','audited',91,'One-time rent and utility gaps, verified by local pastors.')
) AS v(slug, lane, tier, to_program, mission)
JOIN public.organizations o ON o.slug = v.slug
ON CONFLICT (org_id) DO NOTHING;

-- 3. Donations ledger.
CREATE TABLE public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lane text NOT NULL DEFAULT '',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  donor_name text,
  note text NOT NULL DEFAULT '',
  amount_cents integer NOT NULL CHECK (amount_cents >= 100),
  currency text NOT NULL DEFAULT 'usd',
  frequency text NOT NULL DEFAULT 'once' CHECK (frequency IN ('once','monthly')),
  status text NOT NULL DEFAULT 'pending',
  stripe_session_id text,
  stripe_subscription_id text,
  receipt_url text,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_donations_org ON public.donations(org_id, created_at DESC);
CREATE INDEX idx_donations_user ON public.donations(user_id);
CREATE UNIQUE INDEX idx_donations_session ON public.donations(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

GRANT SELECT ON public.donations TO authenticated;
GRANT ALL ON public.donations TO service_role;

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Givers and nonprofit leaders can see gifts"
  ON public.donations FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.organization_members m
      WHERE m.org_id = donations.org_id AND m.user_id = auth.uid()
        AND m.role = ANY (ARRAY['owner','leader']))
  );

CREATE TRIGGER update_donations_updated_at
  BEFORE UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();