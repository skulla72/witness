CREATE TABLE public.fund_gifts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  donor_name text,
  note text NOT NULL DEFAULT '',
  scope text NOT NULL DEFAULT 'all' CHECK (scope IN ('all','lane')),
  lane text,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'usd',
  frequency text NOT NULL DEFAULT 'once' CHECK (frequency IN ('once','monthly')),
  status text NOT NULL DEFAULT 'pending',
  org_count integer NOT NULL DEFAULT 0,
  environment text NOT NULL DEFAULT 'sandbox',
  stripe_session_id text,
  stripe_subscription_id text,
  stripe_customer_id text,
  receipt_url text,
  canceled_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.fund_gifts TO authenticated;
GRANT ALL ON public.fund_gifts TO service_role;

ALTER TABLE public.fund_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Givers see their own spread gifts"
  ON public.fund_gifts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_fund_gifts_user ON public.fund_gifts(user_id, created_at DESC);
CREATE INDEX idx_fund_gifts_session ON public.fund_gifts(stripe_session_id);
CREATE INDEX idx_fund_gifts_subscription ON public.fund_gifts(stripe_subscription_id);

CREATE TRIGGER update_fund_gifts_updated_at
  BEFORE UPDATE ON public.fund_gifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.donations
  ADD COLUMN fund_gift_id uuid REFERENCES public.fund_gifts(id) ON DELETE SET NULL;

CREATE INDEX idx_donations_fund_gift ON public.donations(fund_gift_id);
