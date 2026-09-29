-- The current care agreement version lives in one place.
CREATE OR REPLACE FUNCTION private.therapy_agreement_version()
RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT '2026-09-1'::text $$;
REVOKE ALL ON FUNCTION private.therapy_agreement_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.therapy_agreement_version() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.therapy_sessions_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version text := private.therapy_agreement_version();
  v_slot public.therapy_slots;
BEGIN
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

CREATE OR REPLACE FUNCTION public.therapy_sessions_before_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version text := private.therapy_agreement_version();
BEGIN
  IF NEW.status = 'in_progress' AND OLD.status <> 'in_progress' THEN
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

-- Trigger functions should never be callable directly through the API.
REVOKE ALL ON FUNCTION public.therapy_sessions_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.therapy_sessions_before_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.therapists_guard_verification() FROM PUBLIC, anon, authenticated;

-- A small signed-in check the app can call for the agreement gate.
CREATE OR REPLACE FUNCTION public.therapy_agreement_signed(_party text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = private
AS $$
  SELECT private.has_therapy_agreement(auth.uid(), _party, private.therapy_agreement_version())
$$;
REVOKE ALL ON FUNCTION public.therapy_agreement_signed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.therapy_agreement_signed(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.therapy_agreement_version()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = private
AS $$ SELECT private.therapy_agreement_version() $$;
REVOKE ALL ON FUNCTION public.therapy_agreement_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.therapy_agreement_version() TO authenticated, service_role;