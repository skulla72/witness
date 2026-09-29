ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS charged_cents integer NOT NULL DEFAULT 0 CHECK (charged_cents >= 0),
  ADD COLUMN IF NOT EXISTS processing_fee_cents integer NOT NULL DEFAULT 0 CHECK (processing_fee_cents >= 0),
  ADD COLUMN IF NOT EXISTS recipient_cents integer NOT NULL DEFAULT 0 CHECK (recipient_cents >= 0),
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'awaiting_setup' CHECK (payout_status IN ('awaiting_setup','ready','processing','paid','failed','refunded')),
  ADD COLUMN IF NOT EXISTS payout_reference text,
  ADD COLUMN IF NOT EXISTS paid_out_at timestamptz;

ALTER TABLE public.fund_gifts
  ADD COLUMN IF NOT EXISTS charged_cents integer NOT NULL DEFAULT 0 CHECK (charged_cents >= 0),
  ADD COLUMN IF NOT EXISTS processing_fee_cents integer NOT NULL DEFAULT 0 CHECK (processing_fee_cents >= 0),
  ADD COLUMN IF NOT EXISTS recipient_cents integer NOT NULL DEFAULT 0 CHECK (recipient_cents >= 0),
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'awaiting_setup' CHECK (payout_status IN ('awaiting_setup','ready','processing','paid','failed','refunded'));

ALTER TABLE public.job_funds
  ADD COLUMN IF NOT EXISTS platform_fee_cents integer NOT NULL DEFAULT 0 CHECK (platform_fee_cents >= 0),
  ADD COLUMN IF NOT EXISTS worker_balance_cents integer NOT NULL DEFAULT 0 CHECK (worker_balance_cents >= 0),
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'awaiting_setup' CHECK (payout_status IN ('awaiting_setup','ready','processing','paid','failed','refunded')),
  ADD COLUMN IF NOT EXISTS payout_reference text,
  ADD COLUMN IF NOT EXISTS paid_out_at timestamptz;

ALTER TABLE public.witness_gifts
  ADD COLUMN IF NOT EXISTS pay_method text NOT NULL DEFAULT 'card' CHECK (pay_method IN ('card','bank'));

UPDATE public.donations
SET charged_cents = CASE WHEN charged_cents = 0 THEN amount_cents + fee_cents + tip_cents ELSE charged_cents END,
    recipient_cents = CASE WHEN recipient_cents = 0 THEN GREATEST(0, amount_cents - CASE WHEN fees_covered THEN 0 ELSE witness_fee_cents END) ELSE recipient_cents END
WHERE charged_cents = 0 OR recipient_cents = 0;

UPDATE public.fund_gifts
SET charged_cents = CASE WHEN charged_cents = 0 THEN amount_cents + fee_cents + tip_cents ELSE charged_cents END,
    recipient_cents = CASE WHEN recipient_cents = 0 THEN GREATEST(0, amount_cents - CASE WHEN fees_covered THEN 0 ELSE witness_fee_cents END) ELSE recipient_cents END
WHERE charged_cents = 0 OR recipient_cents = 0;

UPDATE public.job_funds
SET platform_fee_cents = FLOOR((raised_cents::numeric * platform_fee_bps) / 10000)::integer,
    worker_balance_cents = GREATEST(0, raised_cents - FLOOR((raised_cents::numeric * platform_fee_bps) / 10000)::integer),
    payout_status = CASE
      WHEN status = 'released' THEN 'paid'
      WHEN status = 'confirmed' THEN 'ready'
      WHEN status = 'refunded' THEN 'refunded'
      ELSE payout_status
    END;

CREATE OR REPLACE FUNCTION private.refresh_job_fund_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  target_fund uuid := COALESCE(NEW.fund_id, OLD.fund_id);
BEGIN
  UPDATE public.job_funds f
  SET raised_cents = totals.raised,
      backer_count = totals.backers,
      platform_fee_cents = FLOOR((totals.raised::numeric * f.platform_fee_bps) / 10000)::integer,
      worker_balance_cents = GREATEST(0, totals.raised - FLOOR((totals.raised::numeric * f.platform_fee_bps) / 10000)::integer),
      status = CASE
        WHEN f.status IN ('released','refunded','redirected','canceled','confirmed') THEN f.status
        WHEN totals.raised >= f.goal_cents THEN 'funded'
        ELSE 'collecting'
      END,
      updated_at = now()
  FROM (
    SELECT COALESCE(SUM(amount_cents) FILTER (WHERE status = 'paid'), 0)::integer AS raised,
           COUNT(*) FILTER (WHERE status = 'paid')::integer AS backers
    FROM public.job_contributions
    WHERE fund_id = target_fund
  ) totals
  WHERE f.id = target_fund;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS job_contributions_refresh_fund ON public.job_contributions;
CREATE TRIGGER job_contributions_refresh_fund
AFTER INSERT OR UPDATE OF status, amount_cents OR DELETE ON public.job_contributions
FOR EACH ROW EXECUTE FUNCTION private.refresh_job_fund_totals();