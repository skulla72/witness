CREATE TABLE public.witness_gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  email TEXT,
  donor_name TEXT,
  note TEXT NOT NULL DEFAULT '',
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  frequency TEXT NOT NULL DEFAULT 'once' CHECK (frequency IN ('once','monthly')),
  status TEXT NOT NULL DEFAULT 'pending',
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','live')),
  stripe_session_id TEXT,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  stripe_invoice_id TEXT,
  receipt_url TEXT,
  current_period_end TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.witness_gifts TO authenticated;
GRANT ALL ON public.witness_gifts TO service_role;

ALTER TABLE public.witness_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "People see their own gifts to Witness"
  ON public.witness_gifts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE UNIQUE INDEX witness_gifts_invoice_unique
  ON public.witness_gifts (stripe_invoice_id, environment)
  WHERE stripe_invoice_id IS NOT NULL;

CREATE INDEX witness_gifts_user_idx ON public.witness_gifts (user_id, created_at DESC);
CREATE INDEX witness_gifts_subscription_idx ON public.witness_gifts (stripe_subscription_id, environment);

CREATE TRIGGER update_witness_gifts_updated_at
  BEFORE UPDATE ON public.witness_gifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();