CREATE TABLE public.counselor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  photo_url text NOT NULL DEFAULT '',
  headline text NOT NULL DEFAULT '',
  about text NOT NULL DEFAULT '',
  license_type text NOT NULL DEFAULT '',
  license_number text NOT NULL DEFAULT '',
  license_state text NOT NULL DEFAULT '',
  specialties text[] NOT NULL DEFAULT '{}',
  languages text[] NOT NULL DEFAULT '{English}',
  offers_video boolean NOT NULL DEFAULT true,
  offers_in_person boolean NOT NULL DEFAULT false,
  city text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  rate_cents integer NOT NULL DEFAULT 0,
  sliding_scale boolean NOT NULL DEFAULT false,
  faith_integrated boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  license_verified_at timestamptz,
  review_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.counselor_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.counselor_profiles TO authenticated;
GRANT ALL ON public.counselor_profiles TO service_role;
ALTER TABLE public.counselor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved counselors are public" ON public.counselor_profiles FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "Counselors read own" ON public.counselor_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all counselors" ON public.counselor_profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Counselors create own" ON public.counselor_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending' AND license_verified_at IS NULL);
CREATE POLICY "Counselors update own" ON public.counselor_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update counselors" ON public.counselor_profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Counselors delete own" ON public.counselor_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Owners cannot approve themselves or edit review fields.
CREATE OR REPLACE FUNCTION public.guard_counselor_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  IF NOT public.has_role(auth.uid(), 'admin') AND auth.role() <> 'service_role' THEN
    NEW.status := CASE WHEN OLD.status = 'approved' AND (NEW.license_number <> OLD.license_number OR NEW.license_state <> OLD.license_state OR NEW.license_type <> OLD.license_type) THEN 'pending' ELSE OLD.status END;
    NEW.license_verified_at := CASE WHEN NEW.status = 'pending' AND OLD.status = 'approved' THEN NULL ELSE OLD.license_verified_at END;
    NEW.review_note := OLD.review_note;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER counselor_review_guard BEFORE UPDATE ON public.counselor_profiles FOR EACH ROW EXECUTE FUNCTION public.guard_counselor_review();

CREATE TABLE public.counselor_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id uuid NOT NULL REFERENCES public.counselor_profiles(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL,
  message text NOT NULL DEFAULT '',
  prefers_video boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.counselor_requests TO authenticated;
GRANT ALL ON public.counselor_requests TO service_role;
ALTER TABLE public.counselor_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Requester reads own" ON public.counselor_requests FOR SELECT TO authenticated USING (auth.uid() = requester_id);
CREATE POLICY "Counselor reads theirs" ON public.counselor_requests FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.counselor_profiles c WHERE c.id = counselor_id AND c.user_id = auth.uid()));
CREATE POLICY "Requester creates" ON public.counselor_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id AND status = 'pending' AND EXISTS (SELECT 1 FROM public.counselor_profiles c WHERE c.id = counselor_id AND c.status = 'approved'));
CREATE POLICY "Counselor answers" ON public.counselor_requests FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.counselor_profiles c WHERE c.id = counselor_id AND c.user_id = auth.uid()));
CREATE POLICY "Requester withdraws" ON public.counselor_requests FOR DELETE TO authenticated USING (auth.uid() = requester_id);

CREATE TABLE public.org_counselors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  counselor_id uuid NOT NULL REFERENCES public.counselor_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, counselor_id)
);
GRANT SELECT ON public.org_counselors TO anon;
GRANT SELECT, INSERT, DELETE ON public.org_counselors TO authenticated;
GRANT ALL ON public.org_counselors TO service_role;
ALTER TABLE public.org_counselors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org counselors public" ON public.org_counselors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Org owner adds" ON public.org_counselors FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE POLICY "Org owner removes" ON public.org_counselors FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));