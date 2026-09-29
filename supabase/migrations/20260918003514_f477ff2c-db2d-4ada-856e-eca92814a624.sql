-- ============ Professional service pages ============
CREATE TABLE public.pro_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL DEFAULT '',
  trade text NOT NULL DEFAULT '',
  headline text NOT NULL DEFAULT '',
  about text NOT NULL DEFAULT '',
  service_area text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  rate_cents integer NOT NULL DEFAULT 0,
  rate_kind text NOT NULL DEFAULT 'quote',
  serves_free boolean NOT NULL DEFAULT false,
  photo_url text,
  website text,
  phone text,
  status text NOT NULL DEFAULT 'pending',
  review_note text NOT NULL DEFAULT '',
  reviewed_by uuid,
  reviewed_at timestamptz,
  id_verified_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pro_profiles_status_check CHECK (status IN ('draft','pending','approved','removed')),
  CONSTRAINT pro_profiles_rate_kind_check CHECK (rate_kind IN ('hourly','flat','quote')),
  CONSTRAINT pro_profiles_rate_check CHECK (rate_cents >= 0 AND rate_cents <= 100000000)
);
CREATE INDEX pro_profiles_status_idx ON public.pro_profiles (status);
CREATE INDEX pro_profiles_place_idx ON public.pro_profiles (region, city);

GRANT SELECT ON public.pro_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pro_profiles TO authenticated;
GRANT ALL ON public.pro_profiles TO service_role;
ALTER TABLE public.pro_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved pro pages are public"
ON public.pro_profiles FOR SELECT TO anon, authenticated
USING (status = 'approved');

CREATE POLICY "A pro reads their own page"
ON public.pro_profiles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "The team reads every pro page"
ON public.pro_profiles FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "A pro creates their own page"
ON public.pro_profiles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND status IN ('draft','pending'));

CREATE POLICY "A pro edits their own page"
ON public.pro_profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "The team reviews pro pages"
ON public.pro_profiles FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- A pro may not approve, verify or un-remove themselves.
CREATE OR REPLACE FUNCTION public.pro_profiles_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF private.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.status := CASE WHEN OLD.status = 'approved' THEN 'approved'
                     WHEN OLD.status = 'removed' THEN 'removed'
                     WHEN NEW.status IN ('draft','pending') THEN NEW.status
                     ELSE OLD.status END;
  NEW.id_verified_at := OLD.id_verified_at;
  NEW.reviewed_by := OLD.reviewed_by;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.review_note := OLD.review_note;
  NEW.removed_at := OLD.removed_at;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER pro_profiles_guard BEFORE UPDATE ON public.pro_profiles
FOR EACH ROW EXECUTE FUNCTION public.pro_profiles_guard();

-- ============ Two-way reviews, hidden until both sides write ============
CREATE TABLE public.pro_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id uuid NOT NULL REFERENCES public.pro_profiles(id) ON DELETE CASCADE,
  need_id uuid,
  job_key text NOT NULL,
  author_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  direction text NOT NULL,
  stars smallint NOT NULL,
  body text NOT NULL DEFAULT '',
  revealed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pro_reviews_direction_check CHECK (direction IN ('of_pro','of_homeowner')),
  CONSTRAINT pro_reviews_stars_check CHECK (stars BETWEEN 1 AND 5),
  CONSTRAINT pro_reviews_once UNIQUE (job_key, direction)
);
CREATE INDEX pro_reviews_pro_idx ON public.pro_reviews (pro_id, created_at DESC);
CREATE INDEX pro_reviews_subject_idx ON public.pro_reviews (subject_id, created_at DESC);

GRANT SELECT ON public.pro_reviews TO anon;
GRANT SELECT, INSERT ON public.pro_reviews TO authenticated;
GRANT ALL ON public.pro_reviews TO service_role;
ALTER TABLE public.pro_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Revealed reviews are public"
ON public.pro_reviews FOR SELECT TO anon, authenticated
USING (revealed_at IS NOT NULL OR created_at < now() - interval '7 days');

CREATE POLICY "You read your own review"
ON public.pro_reviews FOR SELECT TO authenticated
USING (author_id = auth.uid());

CREATE POLICY "You write one review per job side"
ON public.pro_reviews FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND subject_id <> auth.uid());

-- When the second side lands, both become visible at the same moment.
CREATE OR REPLACE FUNCTION public.pro_reviews_reveal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.pro_reviews r
    WHERE r.job_key = NEW.job_key AND r.direction <> NEW.direction
  ) THEN
    NEW.revealed_at := now();
    UPDATE public.pro_reviews SET revealed_at = now()
    WHERE job_key = NEW.job_key AND revealed_at IS NULL AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pro_reviews_reveal BEFORE INSERT ON public.pro_reviews
FOR EACH ROW EXECUTE FUNCTION public.pro_reviews_reveal();

-- ============ Strikes ============
CREATE TABLE public.pro_strikes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id uuid NOT NULL REFERENCES public.pro_profiles(id) ON DELETE CASCADE,
  kind text NOT NULL,
  need_id uuid,
  note text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pro_strikes_kind_check CHECK (kind IN ('no_show','quality'))
);
CREATE INDEX pro_strikes_pro_idx ON public.pro_strikes (pro_id);

GRANT SELECT, INSERT ON public.pro_strikes TO authenticated;
GRANT ALL ON public.pro_strikes TO service_role;
ALTER TABLE public.pro_strikes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "A pro sees their own strikes"
ON public.pro_strikes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.pro_profiles p WHERE p.id = pro_id AND p.user_id = auth.uid()));

CREATE POLICY "The team reads strikes"
ON public.pro_strikes FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "The team records strikes"
ON public.pro_strikes FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

-- Two of either kind takes the page out of search.
CREATE OR REPLACE FUNCTION public.pro_strikes_enforce()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE same_kind integer;
BEGIN
  SELECT count(*) INTO same_kind FROM public.pro_strikes
  WHERE pro_id = NEW.pro_id AND kind = NEW.kind;
  IF same_kind >= 2 THEN
    UPDATE public.pro_profiles
    SET status = 'removed', removed_at = now(),
        review_note = CASE WHEN NEW.kind = 'no_show'
          THEN 'Removed after two confirmed no-shows. Our team reviews appeals.'
          ELSE 'Removed after two confirmed problems with the work. Our team reviews appeals.' END,
        updated_at = now()
    WHERE id = NEW.pro_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pro_strikes_enforce AFTER INSERT ON public.pro_strikes
FOR EACH ROW EXECUTE FUNCTION public.pro_strikes_enforce();

-- ============ Identity checks ============
CREATE TABLE public.pro_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id uuid NOT NULL UNIQUE REFERENCES public.pro_profiles(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'unstarted',
  reference text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pro_verifications_status_check CHECK (status IN ('unstarted','pending','verified','failed'))
);
GRANT SELECT, INSERT, UPDATE ON public.pro_verifications TO authenticated;
GRANT ALL ON public.pro_verifications TO service_role;
ALTER TABLE public.pro_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "A pro sees their own identity check"
ON public.pro_verifications FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.pro_profiles p WHERE p.id = pro_id AND p.user_id = auth.uid()));

CREATE POLICY "A pro starts their own identity check"
ON public.pro_verifications FOR INSERT TO authenticated
WITH CHECK (
  status IN ('unstarted','pending')
  AND EXISTS (SELECT 1 FROM public.pro_profiles p WHERE p.id = pro_id AND p.user_id = auth.uid())
);

CREATE POLICY "The team reads identity checks"
ON public.pro_verifications FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "The team records identity checks"
ON public.pro_verifications FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- ============ Claiming an organization page ============
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS claimed_by uuid,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

CREATE TABLE public.org_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role_title text NOT NULL DEFAULT '',
  work_email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  review_note text NOT NULL DEFAULT '',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_claims_status_check CHECK (status IN ('pending','reviewing','approved','declined')),
  CONSTRAINT org_claims_once UNIQUE (org_id, user_id)
);
CREATE INDEX org_claims_status_idx ON public.org_claims (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.org_claims TO authenticated;
GRANT ALL ON public.org_claims TO service_role;
ALTER TABLE public.org_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "You read your own claim"
ON public.org_claims FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "The team reads every claim"
ON public.org_claims FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "You ask to claim a page"
ON public.org_claims FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "The team decides claims"
ON public.org_claims FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- Approving a claim hands the page over and seats the person as a leader.
CREATE OR REPLACE FUNCTION public.org_claims_on_approve()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND COALESCE(OLD.status, '') <> 'approved' THEN
    INSERT INTO public.organization_members (org_id, user_id, role)
    VALUES (NEW.org_id, NEW.user_id, 'leader')
    ON CONFLICT (org_id, user_id) DO UPDATE SET role = 'leader';
    UPDATE public.organizations
    SET claimed_by = NEW.user_id, claimed_at = now(), updated_at = now()
    WHERE id = NEW.org_id AND claimed_by IS NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER org_claims_on_approve BEFORE UPDATE ON public.org_claims
FOR EACH ROW EXECUTE FUNCTION public.org_claims_on_approve();

-- ============ Announcements ============
CREATE TABLE public.org_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'news',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  starts_at timestamptz,
  link_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_announcements_kind_check CHECK (kind IN ('news','event','prayer','serving'))
);
CREATE INDEX org_announcements_org_idx ON public.org_announcements (org_id, created_at DESC);

GRANT SELECT ON public.org_announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_announcements TO authenticated;
GRANT ALL ON public.org_announcements TO service_role;
ALTER TABLE public.org_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Announcements are public"
ON public.org_announcements FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Leaders post announcements"
ON public.org_announcements FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND private.is_org_leader(org_id, auth.uid()));

CREATE POLICY "Leaders edit announcements"
ON public.org_announcements FOR UPDATE TO authenticated
USING (private.is_org_leader(org_id, auth.uid()))
WITH CHECK (private.is_org_leader(org_id, auth.uid()));

CREATE POLICY "Leaders remove announcements"
ON public.org_announcements FOR DELETE TO authenticated
USING (private.is_org_leader(org_id, auth.uid()));

-- ============ Payout details ============
CREATE TABLE public.org_payout_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT '',
  account_reference text NOT NULL DEFAULT '',
  bank_name text NOT NULL DEFAULT '',
  account_holder text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'unstarted',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_payout_status_check CHECK (status IN ('unstarted','pending','verified','blocked'))
);
GRANT SELECT, INSERT, UPDATE ON public.org_payout_accounts TO authenticated;
GRANT ALL ON public.org_payout_accounts TO service_role;
ALTER TABLE public.org_payout_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaders read their payout details"
ON public.org_payout_accounts FOR SELECT TO authenticated
USING (private.is_org_leader(org_id, auth.uid()) OR private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Leaders add payout details"
ON public.org_payout_accounts FOR INSERT TO authenticated
WITH CHECK (private.is_org_leader(org_id, auth.uid()) AND status IN ('unstarted','pending'));

CREATE POLICY "Leaders update payout details"
ON public.org_payout_accounts FOR UPDATE TO authenticated
USING (private.is_org_leader(org_id, auth.uid()) OR private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.is_org_leader(org_id, auth.uid()) OR private.has_role(auth.uid(), 'admin'));

-- ============ Monthly plans ============
CREATE TABLE public.org_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  price_id text NOT NULL DEFAULT '',
  amount_cents integer NOT NULL DEFAULT 0,
  environment text NOT NULL DEFAULT 'sandbox',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_session_id text,
  current_period_end timestamptz,
  started_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_subscriptions_plan_check CHECK (plan IN ('page','page_giving','serving')),
  CONSTRAINT org_subscriptions_status_check CHECK (status IN ('pending','active','past_due','canceled','failed')),
  CONSTRAINT org_subscriptions_once UNIQUE (org_id, plan, environment)
);
CREATE INDEX org_subscriptions_org_idx ON public.org_subscriptions (org_id);
CREATE INDEX org_subscriptions_stripe_idx ON public.org_subscriptions (stripe_subscription_id);

GRANT SELECT, INSERT, UPDATE ON public.org_subscriptions TO authenticated;
GRANT ALL ON public.org_subscriptions TO service_role;
ALTER TABLE public.org_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaders read their plans"
ON public.org_subscriptions FOR SELECT TO authenticated
USING (private.is_org_leader(org_id, auth.uid()) OR private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Leaders start a plan"
ON public.org_subscriptions FOR INSERT TO authenticated
WITH CHECK (private.is_org_leader(org_id, auth.uid()) AND started_by = auth.uid());

CREATE POLICY "Leaders change their plan"
ON public.org_subscriptions FOR UPDATE TO authenticated
USING (private.is_org_leader(org_id, auth.uid()) OR private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.is_org_leader(org_id, auth.uid()) OR private.has_role(auth.uid(), 'admin'));

-- Which plans an organization carries, with no billing details attached.
CREATE OR REPLACE FUNCTION private.org_plans(_org_id uuid)
RETURNS TABLE (plan text, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.plan, s.status
  FROM public.org_subscriptions s
  WHERE s.org_id = _org_id AND s.status IN ('active','past_due');
$$;
REVOKE ALL ON FUNCTION private.org_plans(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.org_plans(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.org_plans(_org_id uuid)
RETURNS TABLE (plan text, status text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT * FROM private.org_plans(_org_id);
$$;
GRANT EXECUTE ON FUNCTION public.org_plans(uuid) TO anon, authenticated, service_role;

-- Shared timestamp keeper for the new tables.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
CREATE TRIGGER org_announcements_touch BEFORE UPDATE ON public.org_announcements
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER org_payout_touch BEFORE UPDATE ON public.org_payout_accounts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER org_subscriptions_touch BEFORE UPDATE ON public.org_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER pro_verifications_touch BEFORE UPDATE ON public.pro_verifications
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();