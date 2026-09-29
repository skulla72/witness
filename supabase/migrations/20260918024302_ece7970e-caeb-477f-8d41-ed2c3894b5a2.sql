CREATE TABLE public.pro_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id uuid NOT NULL REFERENCES public.pro_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  plan text NOT NULL DEFAULT 'pro_page',
  status text NOT NULL DEFAULT 'pending',
  price_id text NOT NULL DEFAULT '',
  amount_cents integer NOT NULL DEFAULT 0,
  environment text NOT NULL DEFAULT 'sandbox',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_session_id text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pro_subscriptions_plan_check CHECK (plan IN ('pro_page')),
  CONSTRAINT pro_subscriptions_status_check CHECK (status IN ('pending','active','past_due','canceled','failed')),
  CONSTRAINT pro_subscriptions_once UNIQUE (pro_id, plan, environment)
);
CREATE INDEX pro_subscriptions_pro_idx ON public.pro_subscriptions (pro_id);
CREATE INDEX pro_subscriptions_stripe_idx ON public.pro_subscriptions (stripe_subscription_id);

GRANT SELECT, INSERT, UPDATE ON public.pro_subscriptions TO authenticated;
GRANT ALL ON public.pro_subscriptions TO service_role;
ALTER TABLE public.pro_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads their page fee"
ON public.pro_subscriptions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner starts their page fee"
ON public.pro_subscriptions FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.pro_profiles p WHERE p.id = pro_id AND p.user_id = auth.uid())
);

CREATE POLICY "Owner updates their page fee"
ON public.pro_subscriptions FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'))
WITH CHECK (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER pro_subscriptions_touch BEFORE UPDATE ON public.pro_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
