-- ---------- helpers ----------
CREATE OR REPLACE FUNCTION private.is_org_leader(_org_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL
     AND (auth.uid() IS NULL OR _user_id = auth.uid())
     AND EXISTS (
       SELECT 1 FROM public.organization_members m
       WHERE m.org_id = _org_id AND m.user_id = _user_id AND m.role IN ('owner','leader')
     )
$$;
REVOKE ALL ON FUNCTION private.is_org_leader(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_org_leader(uuid, uuid) TO authenticated;

-- ---------- profiles additions ----------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS business_line text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS serving_public boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS giver_mark boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS has_given boolean NOT NULL DEFAULT false;

-- ---------- needs ----------
CREATE TABLE public.needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'project' CHECK (kind IN ('prayer','project')),
  posted_by uuid NOT NULL,
  prayer_id uuid REFERENCES public.prayer_posts(id) ON DELETE SET NULL,
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  story text NOT NULL DEFAULT '' CHECK (char_length(story) <= 4000),
  city text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  goal_cents integer NOT NULL DEFAULT 0 CHECK (goal_cents >= 0 AND goal_cents <= 500000000),
  raised_cents integer NOT NULL DEFAULT 0,
  needs_hands boolean NOT NULL DEFAULT false,
  hours_needed integer NOT NULL DEFAULT 0 CHECK (hours_needed >= 0),
  hands_count integer NOT NULL DEFAULT 0,
  skills text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','funded','in_progress','completed','closed')),
  is_public boolean NOT NULL DEFAULT true,
  cover_path text,
  featured_week date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT needs_money_needs_partner CHECK (goal_cents = 0 OR org_id IS NOT NULL)
);
CREATE INDEX needs_status_idx ON public.needs (status, created_at DESC);
CREATE INDEX needs_prayer_idx ON public.needs (prayer_id);
CREATE INDEX needs_org_idx ON public.needs (org_id);
CREATE INDEX needs_featured_idx ON public.needs (featured_week DESC) WHERE featured_week IS NOT NULL;

GRANT SELECT ON public.needs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.needs TO authenticated;
GRANT ALL ON public.needs TO service_role;
ALTER TABLE public.needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public needs are visible to everyone"
ON public.needs FOR SELECT TO anon
USING (is_public = true AND status <> 'closed');

CREATE POLICY "Members see public needs, their own, and needs on prayers they can read"
ON public.needs FOR SELECT TO authenticated
USING (
  (is_public = true AND status <> 'closed')
  OR posted_by = auth.uid()
  OR (org_id IS NOT NULL AND private.is_org_leader(org_id, auth.uid()))
  OR has_role(auth.uid(), 'admin')
  OR (prayer_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.prayer_posts p WHERE p.id = needs.prayer_id))
);

CREATE POLICY "Members post needs they are allowed to post"
ON public.needs FOR INSERT TO authenticated
WITH CHECK (
  posted_by = auth.uid()
  AND is_active_beta_member(auth.uid())
  AND (
    org_id IS NULL
    OR private.is_org_leader(org_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.nonprofit_profiles np WHERE np.org_id = needs.org_id AND np.accepting)
  )
  AND (
    (kind = 'project' AND prayer_id IS NULL AND org_id IS NOT NULL AND private.is_org_leader(org_id, auth.uid()))
    OR (kind = 'prayer' AND prayer_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.prayer_posts p
      WHERE p.id = needs.prayer_id
        AND (p.author_id = auth.uid() OR (needs.org_id IS NOT NULL AND private.is_org_leader(needs.org_id, auth.uid())))
    ))
  )
);

CREATE POLICY "Posters, partner leaders and admins edit needs"
ON public.needs FOR UPDATE TO authenticated
USING (posted_by = auth.uid() OR (org_id IS NOT NULL AND private.is_org_leader(org_id, auth.uid())) OR has_role(auth.uid(), 'admin'))
WITH CHECK (posted_by = auth.uid() OR (org_id IS NOT NULL AND private.is_org_leader(org_id, auth.uid())) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Posters and admins delete needs"
ON public.needs FOR DELETE TO authenticated
USING (posted_by = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_needs_updated_at BEFORE UPDATE ON public.needs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Nobody but the system may touch the running totals.
CREATE OR REPLACE FUNCTION public.protect_need_totals()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF current_setting('app.system_write', true) IS DISTINCT FROM '1' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.raised_cents := 0; NEW.hands_count := 0;
    ELSE
      NEW.raised_cents := OLD.raised_cents; NEW.hands_count := OLD.hands_count;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER needs_protect_totals BEFORE INSERT OR UPDATE ON public.needs
FOR EACH ROW EXECUTE FUNCTION public.protect_need_totals();

-- ---------- volunteers on a need ----------
CREATE TABLE public.need_pledges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id uuid NOT NULL REFERENCES public.needs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 500),
  status text NOT NULL DEFAULT 'offered' CHECK (status IN ('offered','accepted','done','withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (need_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.need_pledges TO authenticated;
GRANT ALL ON public.need_pledges TO service_role;
ALTER TABLE public.need_pledges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Helpers and need owners see pledges"
ON public.need_pledges FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.needs n WHERE n.id = need_pledges.need_id
             AND (n.posted_by = auth.uid() OR (n.org_id IS NOT NULL AND private.is_org_leader(n.org_id, auth.uid()))))
);
CREATE POLICY "Members offer hands"
ON public.need_pledges FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND status = 'offered' AND is_active_beta_member(auth.uid()));
CREATE POLICY "Helpers withdraw, owners accept or complete"
ON public.need_pledges FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.needs n WHERE n.id = need_pledges.need_id
             AND (n.posted_by = auth.uid() OR (n.org_id IS NOT NULL AND private.is_org_leader(n.org_id, auth.uid()))))
)
WITH CHECK (
  (user_id = auth.uid() AND status IN ('offered','withdrawn'))
  OR has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.needs n WHERE n.id = need_pledges.need_id
             AND (n.posted_by = auth.uid() OR (n.org_id IS NOT NULL AND private.is_org_leader(n.org_id, auth.uid()))))
);
CREATE POLICY "Helpers remove their own pledge"
ON public.need_pledges FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER update_need_pledges_updated_at BEFORE UPDATE ON public.need_pledges
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_need_hands()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _need uuid := COALESCE(NEW.need_id, OLD.need_id);
BEGIN
  PERFORM set_config('app.system_write', '1', true);
  UPDATE public.needs SET hands_count = (
    SELECT count(*) FROM public.need_pledges WHERE need_id = _need AND status IN ('offered','accepted','done')
  ) WHERE id = _need;
  PERFORM set_config('app.system_write', '0', true);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_need_hands() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER need_pledges_count AFTER INSERT OR UPDATE OR DELETE ON public.need_pledges
FOR EACH ROW EXECUTE FUNCTION public.sync_need_hands();

-- ---------- need updates (before/after, time-lapse, story, reaction, follow-ups) ----------
CREATE TABLE public.need_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id uuid NOT NULL REFERENCES public.needs(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'note' CHECK (kind IN ('before','progress','after','timelapse','story','reaction','note')),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 2000),
  media_path text,
  media_type text CHECK (media_type IS NULL OR media_type IN ('image','video')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX need_updates_need_idx ON public.need_updates (need_id, created_at);

GRANT SELECT ON public.need_updates TO anon;
GRANT SELECT, INSERT, DELETE ON public.need_updates TO authenticated;
GRANT ALL ON public.need_updates TO service_role;
ALTER TABLE public.need_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Updates follow the need's visibility"
ON public.need_updates FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.needs n WHERE n.id = need_updates.need_id));

CREATE POLICY "Posters, leaders, admins and accepted helpers post updates"
ON public.need_updates FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.needs n
    WHERE n.id = need_updates.need_id
      AND (
        n.posted_by = auth.uid()
        OR (n.org_id IS NOT NULL AND private.is_org_leader(n.org_id, auth.uid()))
        OR has_role(auth.uid(), 'admin')
        OR EXISTS (SELECT 1 FROM public.need_pledges pl WHERE pl.need_id = n.id AND pl.user_id = auth.uid() AND pl.status IN ('accepted','done'))
      )
  )
);

CREATE POLICY "Authors and admins remove updates"
ON public.need_updates FOR DELETE TO authenticated
USING (author_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- ---------- donations designated to a need ----------
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS need_id uuid REFERENCES public.needs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS donations_need_idx ON public.donations (need_id) WHERE need_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_need_raised()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _need uuid := COALESCE(NEW.need_id, OLD.need_id); _sum integer; _goal integer; _status text;
BEGIN
  IF _need IS NULL THEN RETURN NULL; END IF;
  SELECT COALESCE(SUM(amount_cents - COALESCE(refunded_cents,0)),0) INTO _sum
    FROM public.donations WHERE need_id = _need AND status = 'paid';
  SELECT goal_cents, status INTO _goal, _status FROM public.needs WHERE id = _need;
  PERFORM set_config('app.system_write', '1', true);
  UPDATE public.needs
     SET raised_cents = _sum,
         status = CASE WHEN _status = 'open' AND _goal > 0 AND _sum >= _goal THEN 'funded' ELSE status END
   WHERE id = _need;
  PERFORM set_config('app.system_write', '0', true);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_need_raised() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER donations_sync_need AFTER INSERT OR UPDATE OF status, amount_cents, refunded_cents, need_id ON public.donations
FOR EACH ROW EXECUTE FUNCTION public.sync_need_raised();

-- ---------- service hours ----------
CREATE TABLE public.service_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  need_id uuid REFERENCES public.needs(id) ON DELETE SET NULL,
  hours numeric(7,2) NOT NULL CHECK (hours > 0 AND hours <= 1000),
  served_on date NOT NULL DEFAULT CURRENT_DATE,
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 500),
  status text NOT NULL DEFAULT 'self' CHECK (status IN ('self','verified','rejected')),
  verified_by uuid,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX service_hours_user_idx ON public.service_hours (user_id, served_on DESC);
CREATE INDEX service_hours_org_idx ON public.service_hours (org_id) WHERE org_id IS NOT NULL;
CREATE INDEX service_hours_need_idx ON public.service_hours (need_id) WHERE need_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_hours TO authenticated;
GRANT ALL ON public.service_hours TO service_role;
ALTER TABLE public.service_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "People see their hours; verifiers see hours sent to them"
ON public.service_hours FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin')
  OR (org_id IS NOT NULL AND private.is_org_leader(org_id, auth.uid()))
  OR (need_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.needs n WHERE n.id = service_hours.need_id AND n.posted_by = auth.uid()))
);
CREATE POLICY "People log their own hours"
ON public.service_hours FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND status = 'self' AND is_active_beta_member(auth.uid()));
CREATE POLICY "People edit their own unverified hours"
ON public.service_hours FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND status = 'self')
WITH CHECK (user_id = auth.uid() AND status = 'self');
CREATE POLICY "Leaders and need posters verify hours"
ON public.service_hours FOR UPDATE TO authenticated
USING (
  user_id <> auth.uid() AND (
    has_role(auth.uid(), 'admin')
    OR (org_id IS NOT NULL AND private.is_org_leader(org_id, auth.uid()))
    OR (need_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.needs n WHERE n.id = service_hours.need_id AND n.posted_by = auth.uid()))
  )
)
WITH CHECK (
  user_id <> auth.uid() AND (
    has_role(auth.uid(), 'admin')
    OR (org_id IS NOT NULL AND private.is_org_leader(org_id, auth.uid()))
    OR (need_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.needs n WHERE n.id = service_hours.need_id AND n.posted_by = auth.uid()))
  )
);
CREATE POLICY "People delete their own unverified hours"
ON public.service_hours FOR DELETE TO authenticated
USING (user_id = auth.uid() AND status = 'self');

CREATE TRIGGER update_service_hours_updated_at BEFORE UPDATE ON public.service_hours
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stamp who verified; the person logging can never mark their own verified.
CREATE OR REPLACE FUNCTION public.stamp_hours_verification()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'verified' THEN
      NEW.verified_by := auth.uid(); NEW.verified_at := now();
    ELSIF NEW.status = 'self' THEN
      NEW.verified_by := NULL; NEW.verified_at := NULL;
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'verified' AND NEW.status = 'verified'
     AND (NEW.hours IS DISTINCT FROM OLD.hours) THEN
    NEW.hours := OLD.hours;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER service_hours_stamp BEFORE INSERT OR UPDATE ON public.service_hours
FOR EACH ROW EXECUTE FUNCTION public.stamp_hours_verification();

-- ---------- public serving badge (system-maintained) ----------
CREATE TABLE public.serving_badges (
  user_id uuid PRIMARY KEY,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  business_name text NOT NULL DEFAULT '',
  business_line text NOT NULL DEFAULT '',
  is_public boolean NOT NULL DEFAULT true,
  hours_verified numeric(9,2) NOT NULL DEFAULT 0,
  hours_self numeric(9,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.serving_badges TO anon, authenticated;
GRANT ALL ON public.serving_badges TO service_role;
ALTER TABLE public.serving_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public badges are visible to everyone"
ON public.serving_badges FOR SELECT TO anon, authenticated
USING (is_public = true OR user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.sync_serving_badge(_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.serving_badges (user_id, display_name, avatar_url, business_name, business_line, is_public, hours_verified, hours_self, updated_at)
  SELECT p.user_id, COALESCE(p.display_name,''), p.avatar_url, p.business_name, p.business_line, p.serving_public,
         COALESCE((SELECT SUM(hours) FROM public.service_hours h WHERE h.user_id = _user AND h.status = 'verified'),0),
         COALESCE((SELECT SUM(hours) FROM public.service_hours h WHERE h.user_id = _user AND h.status = 'self'),0),
         now()
  FROM public.profiles p WHERE p.user_id = _user
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name, avatar_url = EXCLUDED.avatar_url,
    business_name = EXCLUDED.business_name, business_line = EXCLUDED.business_line,
    is_public = EXCLUDED.is_public, hours_verified = EXCLUDED.hours_verified,
    hours_self = EXCLUDED.hours_self, updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.sync_serving_badge(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.on_service_hours_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.sync_serving_badge(COALESCE(NEW.user_id, OLD.user_id));
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.on_service_hours_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER service_hours_badge AFTER INSERT OR UPDATE OR DELETE ON public.service_hours
FOR EACH ROW EXECUTE FUNCTION public.on_service_hours_change();

CREATE OR REPLACE FUNCTION public.on_profile_badge_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.sync_serving_badge(NEW.user_id);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.on_profile_badge_fields() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER profiles_badge_sync AFTER INSERT OR UPDATE OF display_name, avatar_url, business_name, business_line, serving_public ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.on_profile_badge_fields();

-- ---------- perk awards ----------
CREATE TABLE public.perk_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  track text NOT NULL CHECK (track IN ('giving','serving')),
  threshold numeric(12,2) NOT NULL,
  perk text NOT NULL,
  status text NOT NULL DEFAULT 'earned' CHECK (status IN ('earned','sent','declined')),
  shipping text NOT NULL DEFAULT '' CHECK (char_length(shipping) <= 600),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 600),
  fulfilled_by uuid,
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, track, threshold)
);
CREATE INDEX perk_awards_status_idx ON public.perk_awards (status, created_at);
GRANT SELECT, UPDATE ON public.perk_awards TO authenticated;
GRANT ALL ON public.perk_awards TO service_role;
ALTER TABLE public.perk_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "People see their perks; admins see all"
ON public.perk_awards FOR SELECT TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY "People add shipping or decline; admins fulfil"
ON public.perk_awards FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR (user_id = auth.uid() AND status IN ('earned','declined'))
);
CREATE TRIGGER update_perk_awards_updated_at BEFORE UPDATE ON public.perk_awards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- storage: need media ----------
CREATE POLICY "Members upload need media to their own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'need-media' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "Members remove their own need media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'need-media' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "Need media follows the need's visibility"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'need-media'
  AND EXISTS (SELECT 1 FROM public.needs n WHERE n.id::text = (storage.foldername(name))[1])
);