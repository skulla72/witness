-- ============ Therapy mode ============
-- Providers, bookable times, sessions, therapist-only private notes,
-- and a signed care agreement that must exist before a session can start.

CREATE TABLE public.therapists (
  user_id uuid PRIMARY KEY,
  display_name text NOT NULL DEFAULT '',
  credentials text NOT NULL DEFAULT '',
  license_state text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  accepting boolean NOT NULL DEFAULT true,
  verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  verified_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.therapists TO authenticated;
GRANT ALL ON public.therapists TO service_role;
ALTER TABLE public.therapists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in people can see verified therapists"
  ON public.therapists FOR SELECT TO authenticated
  USING (verified = true OR user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Therapists manage their own listing"
  ON public.therapists FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Therapists update their own listing"
  ON public.therapists FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Only an admin may flip verification.
CREATE OR REPLACE FUNCTION public.therapists_guard_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verified IS DISTINCT FROM OLD.verified AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only an admin can verify a therapist';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER therapists_guard_verification
  BEFORE UPDATE ON public.therapists
  FOR EACH ROW EXECUTE FUNCTION public.therapists_guard_verification();

-- ---- Bookable times ----
CREATE TABLE public.therapy_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL,
  starts_at timestamptz NOT NULL,
  minutes integer NOT NULL DEFAULT 50,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (therapist_id, starts_at)
);
CREATE INDEX therapy_slots_open_idx ON public.therapy_slots (therapist_id, starts_at) WHERE status = 'open';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.therapy_slots TO authenticated;
GRANT ALL ON public.therapy_slots TO service_role;
ALTER TABLE public.therapy_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in people can see bookable times"
  ON public.therapy_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Therapists add their own times"
  ON public.therapy_slots FOR INSERT TO authenticated
  WITH CHECK (therapist_id = auth.uid());
CREATE POLICY "Therapists change their own times"
  ON public.therapy_slots FOR UPDATE TO authenticated
  USING (therapist_id = auth.uid()) WITH CHECK (therapist_id = auth.uid());
CREATE POLICY "Therapists remove their own open times"
  ON public.therapy_slots FOR DELETE TO authenticated
  USING (therapist_id = auth.uid() AND status = 'open');

-- ---- The signed care agreement ----
CREATE TABLE public.therapy_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  party text NOT NULL DEFAULT 'client',
  version text NOT NULL,
  signed_name text NOT NULL DEFAULT '',
  signed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, party, version)
);

GRANT SELECT, INSERT ON public.therapy_agreements TO authenticated;
GRANT ALL ON public.therapy_agreements TO service_role;
ALTER TABLE public.therapy_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "People see their own signed agreement"
  ON public.therapy_agreements FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "People sign for themselves"
  ON public.therapy_agreements FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND length(btrim(signed_name)) > 1);

CREATE OR REPLACE FUNCTION private.has_therapy_agreement(_user_id uuid, _party text, _version text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.therapy_agreements a
    WHERE a.user_id = _user_id AND a.party = _party AND a.version = _version
  )
$$;
REVOKE ALL ON FUNCTION private.has_therapy_agreement(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_therapy_agreement(uuid, text, text) TO authenticated, service_role;

-- ---- Sessions ----
CREATE TABLE public.therapy_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL,
  client_id uuid NOT NULL,
  slot_id uuid REFERENCES public.therapy_slots(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  minutes integer NOT NULL DEFAULT 50,
  status text NOT NULL DEFAULT 'booked',
  reason text NOT NULL DEFAULT '',
  conversation_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX therapy_sessions_client_idx ON public.therapy_sessions (client_id, starts_at DESC);
CREATE INDEX therapy_sessions_therapist_idx ON public.therapy_sessions (therapist_id, starts_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.therapy_sessions TO authenticated;
GRANT ALL ON public.therapy_sessions TO service_role;
ALTER TABLE public.therapy_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only the two people in a session can see it"
  ON public.therapy_sessions FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR therapist_id = auth.uid());
CREATE POLICY "Clients book their own sessions"
  ON public.therapy_sessions FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid() AND therapist_id <> auth.uid());
CREATE POLICY "Either person can update their session"
  ON public.therapy_sessions FOR UPDATE TO authenticated
  USING (client_id = auth.uid() OR therapist_id = auth.uid())
  WITH CHECK (client_id = auth.uid() OR therapist_id = auth.uid());

-- Booking rules: verified therapist, signed client agreement, open slot.
CREATE OR REPLACE FUNCTION public.therapy_sessions_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version text;
  v_slot public.therapy_slots;
BEGIN
  SELECT value INTO v_version FROM public.app_settings WHERE key = 'therapy_agreement_version';

  IF NOT EXISTS (SELECT 1 FROM public.therapists t WHERE t.user_id = NEW.therapist_id AND t.verified) THEN
    RAISE EXCEPTION 'That therapist is not available for sessions yet';
  END IF;

  IF NOT private.has_therapy_agreement(NEW.client_id, 'client', v_version) THEN
    RAISE EXCEPTION 'The care agreement must be signed before booking a session';
  END IF;

  IF NEW.slot_id IS NOT NULL THEN
    SELECT * INTO v_slot FROM public.therapy_slots WHERE id = NEW.slot_id FOR UPDATE;
    IF v_slot.id IS NULL OR v_slot.status <> 'open' OR v_slot.therapist_id <> NEW.therapist_id THEN
      RAISE EXCEPTION 'That time is no longer open';
    END IF;
    UPDATE public.therapy_slots SET status = 'booked' WHERE id = NEW.slot_id;
    NEW.starts_at := v_slot.starts_at;
    NEW.minutes := v_slot.minutes;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER therapy_sessions_before_insert
  BEFORE INSERT ON public.therapy_sessions
  FOR EACH ROW EXECUTE FUNCTION public.therapy_sessions_before_insert();

-- A session may only move to in_progress when both parties have signed.
CREATE OR REPLACE FUNCTION public.therapy_sessions_before_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version text;
BEGIN
  IF NEW.status = 'in_progress' AND OLD.status <> 'in_progress' THEN
    SELECT value INTO v_version FROM public.app_settings WHERE key = 'therapy_agreement_version';
    IF NOT private.has_therapy_agreement(NEW.client_id, 'client', v_version)
       OR NOT private.has_therapy_agreement(NEW.therapist_id, 'therapist', v_version) THEN
      RAISE EXCEPTION 'Both people must sign the care agreement before the session starts';
    END IF;
    IF NEW.started_at IS NULL THEN NEW.started_at := now(); END IF;
  END IF;

  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' AND NEW.slot_id IS NOT NULL THEN
    UPDATE public.therapy_slots SET status = 'open' WHERE id = NEW.slot_id;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER therapy_sessions_before_update
  BEFORE UPDATE ON public.therapy_sessions
  FOR EACH ROW EXECUTE FUNCTION public.therapy_sessions_before_update();

-- ---- Private session notes: the therapist only, never the client, never an admin ----
CREATE TABLE public.therapy_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.therapy_sessions(id) ON DELETE CASCADE,
  therapist_id uuid NOT NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.therapy_notes TO authenticated;
GRANT ALL ON public.therapy_notes TO service_role;
ALTER TABLE public.therapy_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only the author therapist can read a note"
  ON public.therapy_notes FOR SELECT TO authenticated
  USING (therapist_id = auth.uid());
CREATE POLICY "Only the session therapist can write a note"
  ON public.therapy_notes FOR INSERT TO authenticated
  WITH CHECK (
    therapist_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.therapy_sessions s WHERE s.id = session_id AND s.therapist_id = auth.uid())
  );
CREATE POLICY "Only the author therapist can edit a note"
  ON public.therapy_notes FOR UPDATE TO authenticated
  USING (therapist_id = auth.uid()) WITH CHECK (therapist_id = auth.uid());
CREATE POLICY "Only the author therapist can delete a note"
  ON public.therapy_notes FOR DELETE TO authenticated
  USING (therapist_id = auth.uid());