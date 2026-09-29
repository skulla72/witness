-- Connected payout accounts for organizations and workers
CREATE TABLE public.connected_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  stripe_account_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'onboarding',
  payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  details_submitted BOOLEAN NOT NULL DEFAULT false,
  disabled_reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT connected_accounts_owner_one CHECK (
    (org_id IS NOT NULL AND user_id IS NULL) OR (org_id IS NULL AND user_id IS NOT NULL)
  )
);
CREATE UNIQUE INDEX connected_accounts_org_env ON public.connected_accounts (org_id, environment) WHERE org_id IS NOT NULL;
CREATE UNIQUE INDEX connected_accounts_user_env ON public.connected_accounts (user_id, environment) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX connected_accounts_stripe_id ON public.connected_accounts (stripe_account_id);

GRANT SELECT ON public.connected_accounts TO authenticated;
GRANT ALL ON public.connected_accounts TO service_role;
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "People see their own payout account"
ON public.connected_accounts FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Leaders see their organization payout account"
ON public.connected_accounts FOR SELECT TO authenticated
USING (
  org_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = connected_accounts.org_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'leader')
  )
);

CREATE POLICY "Team sees every payout account"
ON public.connected_accounts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Every automatic transfer we attempt, recorded once
CREATE TABLE public.payout_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_kind TEXT NOT NULL,
  source_id UUID NOT NULL,
  connected_account_id UUID REFERENCES public.connected_accounts(id) ON DELETE SET NULL,
  stripe_account_id TEXT NOT NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  environment TEXT NOT NULL DEFAULT 'sandbox',
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_transfer_id TEXT,
  failure_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payout_transfers_source_once
ON public.payout_transfers (source_kind, source_id, environment)
WHERE status IN ('pending', 'paid');
CREATE INDEX payout_transfers_org ON public.payout_transfers (org_id);
CREATE INDEX payout_transfers_user ON public.payout_transfers (user_id);

GRANT SELECT ON public.payout_transfers TO authenticated;
GRANT ALL ON public.payout_transfers TO service_role;
ALTER TABLE public.payout_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers see their own transfers"
ON public.payout_transfers FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Leaders see their organization transfers"
ON public.payout_transfers FOR SELECT TO authenticated
USING (
  org_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = payout_transfers.org_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'leader')
  )
);

CREATE POLICY "Team sees every transfer"
ON public.payout_transfers FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fund gifts gain the same honest payout trail donations already carry
ALTER TABLE public.fund_gifts
  ADD COLUMN IF NOT EXISTS payout_reference TEXT,
  ADD COLUMN IF NOT EXISTS paid_out_at TIMESTAMP WITH TIME ZONE;

CREATE TRIGGER connected_accounts_touch
BEFORE UPDATE ON public.connected_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER payout_transfers_touch
BEFORE UPDATE ON public.payout_transfers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();