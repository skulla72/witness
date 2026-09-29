-- ============ pooled job funding ("chip in to hire the sub") ============
CREATE TABLE public.job_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id uuid NOT NULL UNIQUE REFERENCES public.needs(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  worker_id uuid,
  worker_name text NOT NULL DEFAULT '' CHECK (char_length(worker_name) <= 120),
  worker_line text NOT NULL DEFAULT '' CHECK (char_length(worker_line) <= 120),
  goal_cents integer NOT NULL CHECK (goal_cents >= 500 AND goal_cents <= 5000000),
  raised_cents integer NOT NULL DEFAULT 0,
  backer_count integer NOT NULL DEFAULT 0,
  platform_fee_bps integer NOT NULL DEFAULT 1000 CHECK (platform_fee_bps >= 0 AND platform_fee_bps <= 2000),
  status text NOT NULL DEFAULT 'collecting'
    CHECK (status IN ('collecting','funded','confirmed','released','refunded','redirected','canceled')),
  donated boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  confirmed_by uuid,
  released_at timestamptz,
  released_by uuid,
  release_note text NOT NULL DEFAULT '' CHECK (char_length(release_note) <= 500),
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','live')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_funds_need_idx ON public.job_funds (need_id);
CREATE INDEX job_funds_worker_idx ON public.job_funds (worker_id) WHERE worker_id IS NOT NULL;

GRANT SELECT ON public.job_funds TO anon;
GRANT SELECT, INSERT, UPDATE ON public.job_funds TO authenticated;
GRANT ALL ON public.job_funds TO service_role;
ALTER TABLE public.job_funds ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.can_manage_need(_need_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.needs n
    WHERE n.id = _need_id
      AND (
        n.posted_by = _user_id
        OR (n.org_id IS NOT NULL AND private.is_org_leader(n.org_id, _user_id))
        OR public.has_role(_user_id, 'admin')
      )
  )
$$;
REVOKE ALL ON FUNCTION private.can_manage_need(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_manage_need(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.need_is_open_to_all(_need_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.needs n WHERE n.id = _need_id AND n.is_public AND n.status <> 'closed')
$$;
REVOKE ALL ON FUNCTION private.need_is_open_to_all(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.need_is_open_to_all(uuid) TO anon, authenticated;

CREATE POLICY "Job funds on public projects are visible to everyone"
ON public.job_funds FOR SELECT TO anon
USING (private.need_is_open_to_all(need_id));

CREATE POLICY "Members see job funds they can reach"
ON public.job_funds FOR SELECT TO authenticated
USING (
  private.need_is_open_to_all(need_id)
  OR worker_id = auth.uid()
  OR private.can_manage_need(need_id, auth.uid())
);

CREATE POLICY "Posters and leaders open a job fund"
ON public.job_funds FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND private.can_manage_need(need_id, auth.uid()));

CREATE POLICY "Posters and leaders edit their job fund"
ON public.job_funds FOR UPDATE TO authenticated
USING (private.can_manage_need(need_id, auth.uid()))
WITH CHECK (private.can_manage_need(need_id, auth.uid()));

-- Only the server may move money numbers or the money status.
CREATE OR REPLACE FUNCTION public.protect_job_fund()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF current_setting('app.system_write', true) IS DISTINCT FROM '1' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.raised_cents := 0; NEW.backer_count := 0; NEW.platform_fee_bps := 1000;
      NEW.status := 'collecting';
      NEW.confirmed_at := NULL; NEW.confirmed_by := NULL;
      NEW.released_at := NULL; NEW.released_by := NULL;
    ELSE
      NEW.raised_cents := OLD.raised_cents; NEW.backer_count := OLD.backer_count;
      NEW.platform_fee_bps := OLD.platform_fee_bps; NEW.status := OLD.status;
      NEW.confirmed_at := OLD.confirmed_at; NEW.confirmed_by := OLD.confirmed_by;
      NEW.released_at := OLD.released_at; NEW.released_by := OLD.released_by;
      NEW.goal_cents := OLD.goal_cents;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER job_funds_protect BEFORE INSERT OR UPDATE ON public.job_funds
FOR EACH ROW EXECUTE FUNCTION public.protect_job_fund();

CREATE TRIGGER update_job_funds_updated_at BEFORE UPDATE ON public.job_funds
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ who chipped in ============
CREATE TABLE public.job_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES public.job_funds(id) ON DELETE CASCADE,
  need_id uuid NOT NULL REFERENCES public.needs(id) ON DELETE CASCADE,
  user_id uuid,
  email text,
  donor_name text NOT NULL DEFAULT '' CHECK (char_length(donor_name) <= 80),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 300),
  amount_cents integer NOT NULL CHECK (amount_cents >= 100 AND amount_cents <= 500000),
  refunded_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','failed','abandoned','refunded','redirected')),
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','live')),
  stripe_session_id text,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_contributions_fund_idx ON public.job_contributions (fund_id, created_at DESC);
CREATE INDEX job_contributions_user_idx ON public.job_contributions (user_id) WHERE user_id IS NOT NULL;

GRANT SELECT ON public.job_contributions TO authenticated;
GRANT ALL ON public.job_contributions TO service_role;
ALTER TABLE public.job_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Givers, posters and leaders see contributions"
ON public.job_contributions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.can_manage_need(need_id, auth.uid()));

CREATE TRIGGER update_job_contributions_updated_at BEFORE UPDATE ON public.job_contributions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Keep the pool total honest: paid money minus anything sent back.
CREATE OR REPLACE FUNCTION public.sync_job_fund_total()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _fund uuid := COALESCE(NEW.fund_id, OLD.fund_id); _sum integer; _backers integer; _goal integer; _status text;
BEGIN
  IF _fund IS NULL THEN RETURN NULL; END IF;
  SELECT COALESCE(SUM(amount_cents - COALESCE(refunded_cents,0)),0), COUNT(*)
    INTO _sum, _backers
    FROM public.job_contributions WHERE fund_id = _fund AND status = 'paid';
  SELECT goal_cents, status INTO _goal, _status FROM public.job_funds WHERE id = _fund;
  PERFORM set_config('app.system_write', '1', true);
  UPDATE public.job_funds
     SET raised_cents = _sum,
         backer_count = _backers,
         status = CASE WHEN _status = 'collecting' AND _sum >= _goal THEN 'funded' ELSE _status END,
         updated_at = now()
   WHERE id = _fund;
  PERFORM set_config('app.system_write', '0', true);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_job_fund_total() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER job_contributions_sync AFTER INSERT OR UPDATE OF status, amount_cents, refunded_cents ON public.job_contributions
FOR EACH ROW EXECUTE FUNCTION public.sync_job_fund_total();

-- ============ faith-based reviews on the people who do the work ============
CREATE TABLE public.worker_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id uuid NOT NULL REFERENCES public.needs(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  reviewer_role text NOT NULL DEFAULT 'poster' CHECK (reviewer_role IN ('poster','leader')),
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 1000),
  donated boolean NOT NULL DEFAULT false,
  hours numeric(7,2) CHECK (hours IS NULL OR (hours > 0 AND hours <= 1000)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (need_id, reviewer_id)
);
CREATE INDEX worker_reviews_worker_idx ON public.worker_reviews (worker_id, created_at DESC);

GRANT SELECT ON public.worker_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.worker_reviews TO authenticated;
GRANT ALL ON public.worker_reviews TO service_role;
ALTER TABLE public.worker_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are public"
ON public.worker_reviews FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Posters and leaders review finished work"
ON public.worker_reviews FOR INSERT TO authenticated
WITH CHECK (
  reviewer_id = auth.uid()
  AND worker_id <> auth.uid()
  AND private.can_manage_need(need_id, auth.uid())
  AND EXISTS (SELECT 1 FROM public.needs n WHERE n.id = need_id AND n.status = 'completed')
);

CREATE POLICY "Reviewers edit their own review"
ON public.worker_reviews FOR UPDATE TO authenticated
USING (reviewer_id = auth.uid())
WITH CHECK (reviewer_id = auth.uid() AND worker_id <> auth.uid());

CREATE POLICY "Reviewers and admins remove a review"
ON public.worker_reviews FOR DELETE TO authenticated
USING (reviewer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_worker_reviews_updated_at BEFORE UPDATE ON public.worker_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ unfinished / no-show marks ============
CREATE TABLE public.worker_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id uuid NOT NULL REFERENCES public.needs(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('unfinished','no_show','left_early')),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 500),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (need_id, worker_id, kind)
);
CREATE INDEX worker_marks_worker_idx ON public.worker_marks (worker_id, created_at DESC);

GRANT SELECT ON public.worker_marks TO anon, authenticated;
GRANT INSERT, DELETE ON public.worker_marks TO authenticated;
GRANT ALL ON public.worker_marks TO service_role;
ALTER TABLE public.worker_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Marks are public"
ON public.worker_marks FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Posters and leaders record a mark"
ON public.worker_marks FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND worker_id <> auth.uid()
  AND private.can_manage_need(need_id, auth.uid())
);

CREATE POLICY "Whoever recorded a mark, or an admin, can remove it"
ON public.worker_marks FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============ public reputation summary (system-maintained) ============
CREATE TABLE public.worker_reputation (
  user_id uuid PRIMARY KEY,
  stars_avg numeric(3,2) NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  donated_count integer NOT NULL DEFAULT 0,
  mark_count integer NOT NULL DEFAULT 0,
  jobs_paid integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.worker_reputation TO anon, authenticated;
GRANT ALL ON public.worker_reputation TO service_role;
ALTER TABLE public.worker_reputation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reputation is public"
ON public.worker_reputation FOR SELECT TO anon, authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.sync_worker_reputation(_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF _user IS NULL THEN RETURN; END IF;
  INSERT INTO public.worker_reputation (user_id, stars_avg, review_count, donated_count, mark_count, jobs_paid, updated_at)
  VALUES (
    _user,
    COALESCE((SELECT ROUND(AVG(stars)::numeric, 2) FROM public.worker_reviews WHERE worker_id = _user), 0),
    COALESCE((SELECT COUNT(*) FROM public.worker_reviews WHERE worker_id = _user), 0),
    COALESCE((SELECT COUNT(*) FROM public.worker_reviews WHERE worker_id = _user AND donated), 0),
    COALESCE((SELECT COUNT(*) FROM public.worker_marks WHERE worker_id = _user), 0),
    COALESCE((SELECT COUNT(*) FROM public.job_funds WHERE worker_id = _user AND status = 'released'), 0),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    stars_avg = EXCLUDED.stars_avg,
    review_count = EXCLUDED.review_count,
    donated_count = EXCLUDED.donated_count,
    mark_count = EXCLUDED.mark_count,
    jobs_paid = EXCLUDED.jobs_paid,
    updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.sync_worker_reputation(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.on_worker_signal_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.sync_worker_reputation(COALESCE(NEW.worker_id, OLD.worker_id));
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.on_worker_signal_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER worker_reviews_reputation AFTER INSERT OR UPDATE OR DELETE ON public.worker_reviews
FOR EACH ROW EXECUTE FUNCTION public.on_worker_signal_change();
CREATE TRIGGER worker_marks_reputation AFTER INSERT OR DELETE ON public.worker_marks
FOR EACH ROW EXECUTE FUNCTION public.on_worker_signal_change();
CREATE TRIGGER job_funds_reputation AFTER UPDATE OF status ON public.job_funds
FOR EACH ROW EXECUTE FUNCTION public.on_worker_signal_change();