ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS fees_covered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fee_cents integer NOT NULL DEFAULT 0;

ALTER TABLE public.fund_gifts
  ADD COLUMN IF NOT EXISTS fees_covered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fee_cents integer NOT NULL DEFAULT 0;