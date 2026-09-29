ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
CREATE INDEX IF NOT EXISTS donations_payment_intent_idx ON public.donations (stripe_payment_intent_id);