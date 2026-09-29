CREATE OR REPLACE FUNCTION public.protect_job_fund()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF current_setting('app.system_write', true) IS DISTINCT FROM '1'
     AND current_user <> 'service_role' THEN
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