ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS witness_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pay_method text NOT NULL DEFAULT 'card';

ALTER TABLE public.fund_gifts
  ADD COLUMN IF NOT EXISTS witness_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pay_method text NOT NULL DEFAULT 'card';

ALTER TABLE public.donations DROP CONSTRAINT IF EXISTS donations_pay_method_check;
ALTER TABLE public.donations
  ADD CONSTRAINT donations_pay_method_check CHECK (pay_method IN ('card','bank'));

ALTER TABLE public.fund_gifts DROP CONSTRAINT IF EXISTS fund_gifts_pay_method_check;
ALTER TABLE public.fund_gifts
  ADD CONSTRAINT fund_gifts_pay_method_check CHECK (pay_method IN ('card','bank'));