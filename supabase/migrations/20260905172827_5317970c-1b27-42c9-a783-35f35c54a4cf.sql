ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS shipping_name text,
  ADD COLUMN IF NOT EXISTS shipping_address jsonb,
  ADD COLUMN IF NOT EXISTS fulfillment text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS tracking_url text,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS tax_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

ALTER TABLE public.store_orders
  ADD CONSTRAINT store_orders_fulfillment_check
  CHECK (fulfillment IN ('new','packing','shipped','delivered','canceled'));

CREATE INDEX IF NOT EXISTS idx_store_orders_payment_intent
  ON public.store_orders(stripe_payment_intent_id);

GRANT UPDATE ON public.store_orders TO authenticated;

CREATE POLICY "Leaders can update their organization's orders"
  ON public.store_orders FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = store_orders.org_id
      AND m.user_id = auth.uid()
      AND m.role = ANY (ARRAY['owner','leader'])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = store_orders.org_id
      AND m.user_id = auth.uid()
      AND m.role = ANY (ARRAY['owner','leader'])
  ));

ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id text,
  ADD COLUMN IF NOT EXISTS refunded_cents integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_invoice
  ON public.donations(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_donations_subscription
  ON public.donations(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;