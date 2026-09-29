CREATE TABLE public.pro_lanes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pro_id UUID NOT NULL REFERENCES public.pro_profiles(id) ON DELETE CASCADE,
  lane TEXT NOT NULL,
  rate_cents INTEGER NOT NULL DEFAULT 0,
  rate_kind TEXT NOT NULL DEFAULT 'hourly' CHECK (rate_kind IN ('hourly','flat','quote')),
  serves_free BOOLEAN NOT NULL DEFAULT false,
  notes TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pro_id, lane)
);

GRANT SELECT ON public.pro_lanes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pro_lanes TO authenticated;
GRANT ALL ON public.pro_lanes TO service_role;
ALTER TABLE public.pro_lanes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved pages show their lanes" ON public.pro_lanes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.pro_profiles p WHERE p.id = pro_lanes.pro_id AND p.status = 'approved')
  );

CREATE POLICY "Owners manage their lanes" ON public.pro_lanes
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.pro_profiles p WHERE p.id = pro_lanes.pro_id AND p.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.pro_profiles p WHERE p.id = pro_lanes.pro_id AND p.user_id = auth.uid())
  );

CREATE TABLE public.service_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seeker_id UUID NOT NULL DEFAULT auth.uid(),
  lane TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  urgency TEXT NOT NULL DEFAULT 'whenever' CHECK (urgency IN ('whenever','this_week','urgent')),
  budget_cents INTEGER NOT NULL DEFAULT 0,
  rate_kind TEXT NOT NULL DEFAULT 'quote' CHECK (rate_kind IN ('hourly','flat','quote')),
  wants_donated BOOLEAN NOT NULL DEFAULT false,
  contact_note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','hired','completed','closed')),
  hired_pro_id UUID REFERENCES public.pro_profiles(id) ON DELETE SET NULL,
  hired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX service_requests_lane_idx ON public.service_requests (lane, status, created_at DESC);
CREATE INDEX service_requests_seeker_idx ON public.service_requests (seeker_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seekers manage their own requests" ON public.service_requests
  FOR ALL TO authenticated USING (seeker_id = auth.uid()) WITH CHECK (seeker_id = auth.uid());

CREATE POLICY "Matched professionals see open requests" ON public.service_requests
  FOR SELECT TO authenticated USING (
    (
      status = 'open'
      AND EXISTS (
        SELECT 1 FROM public.pro_lanes l
        JOIN public.pro_profiles p ON p.id = l.pro_id
        WHERE p.user_id = auth.uid()
          AND p.status = 'approved'
          AND l.active
          AND l.lane = service_requests.lane
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.pro_profiles p
      WHERE p.id = service_requests.hired_pro_id AND p.user_id = auth.uid()
    )
  );

CREATE TABLE public.service_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  pro_id UUID NOT NULL REFERENCES public.pro_profiles(id) ON DELETE CASCADE,
  pro_user_id UUID NOT NULL DEFAULT auth.uid(),
  rate_cents INTEGER NOT NULL DEFAULT 0,
  rate_kind TEXT NOT NULL DEFAULT 'hourly' CHECK (rate_kind IN ('hourly','flat','quote')),
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','accepted','declined','withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, pro_id)
);

CREATE INDEX service_offers_request_idx ON public.service_offers (request_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_offers TO authenticated;
GRANT ALL ON public.service_offers TO service_role;
ALTER TABLE public.service_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage their own offers" ON public.service_offers
  FOR ALL TO authenticated USING (
    pro_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.pro_profiles p WHERE p.id = service_offers.pro_id AND p.user_id = auth.uid())
  ) WITH CHECK (
    pro_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.pro_profiles p
      WHERE p.id = service_offers.pro_id AND p.user_id = auth.uid() AND p.status = 'approved' AND p.id_verified_at IS NOT NULL
    )
  );

CREATE POLICY "Seekers see offers on their requests" ON public.service_offers
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.service_requests r WHERE r.id = service_offers.request_id AND r.seeker_id = auth.uid())
  );

CREATE POLICY "Seekers answer offers on their requests" ON public.service_offers
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.service_requests r WHERE r.id = service_offers.request_id AND r.seeker_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.service_requests r WHERE r.id = service_offers.request_id AND r.seeker_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.service_offer_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND COALESCE(OLD.status, '') <> 'accepted' THEN
    UPDATE public.service_requests
      SET status = 'hired', hired_pro_id = NEW.pro_id, hired_at = now(), updated_at = now()
      WHERE id = NEW.request_id;
    UPDATE public.service_offers
      SET status = 'declined', updated_at = now()
      WHERE request_id = NEW.request_id AND id <> NEW.id AND status = 'sent';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.service_offer_accepted() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER service_offers_accepted
  AFTER UPDATE OF status ON public.service_offers
  FOR EACH ROW EXECUTE FUNCTION public.service_offer_accepted();

CREATE TRIGGER pro_lanes_touch BEFORE UPDATE ON public.pro_lanes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER service_requests_touch BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER service_offers_touch BEFORE UPDATE ON public.service_offers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();