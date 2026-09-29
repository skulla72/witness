-- ===== Tiers (two ledgers, never combined) =====
CREATE TABLE public.tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger text NOT NULL CHECK (ledger IN ('sender','goer')),
  threshold numeric NOT NULL CHECK (threshold > 0),
  name text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  gifts boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ledger, threshold)
);
GRANT SELECT ON public.tiers TO anon;
GRANT SELECT ON public.tiers TO authenticated;
GRANT ALL ON public.tiers TO service_role;
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tiers are public" ON public.tiers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage tiers" ON public.tiers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
GRANT INSERT, UPDATE, DELETE ON public.tiers TO authenticated;
CREATE TRIGGER update_tiers_updated_at BEFORE UPDATE ON public.tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Gift options: A, B, and C ("Send it to the mission instead") =====
CREATE TABLE public.gift_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id uuid NOT NULL REFERENCES public.tiers(id) ON DELETE CASCADE,
  slot text NOT NULL CHECK (slot IN ('A','B','C')),
  label text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  image_url text,
  fmv numeric(10,2) NOT NULL DEFAULT 0 CHECK (fmv >= 0),
  est_cost_to_org numeric(10,2) NOT NULL DEFAULT 0 CHECK (est_cost_to_org >= 0),
  impact_copy text NOT NULL DEFAULT '',
  requires_shipping boolean NOT NULL DEFAULT false,
  requires_size boolean NOT NULL DEFAULT false,
  requires_engraving boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tier_id, slot)
);
GRANT SELECT ON public.gift_options TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gift_options TO authenticated;
GRANT ALL ON public.gift_options TO service_role;
ALTER TABLE public.gift_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gift options are public" ON public.gift_options FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage gift options" ON public.gift_options FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_gift_options_updated_at BEFORE UPDATE ON public.gift_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX gift_options_tier_idx ON public.gift_options (tier_id);

-- Every gift tier gets its three slots the moment it exists.
CREATE OR REPLACE FUNCTION public.seed_gift_slots()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.gifts THEN
    INSERT INTO public.gift_options (tier_id, slot, label, description, active)
    VALUES
      (NEW.id, 'A', 'Gift A', '', false),
      (NEW.id, 'B', 'Gift B', '', false),
      (NEW.id, 'C', 'Send it to the mission instead', 'Skip the gift. What it would have cost goes straight back into the work.', true)
    ON CONFLICT (tier_id, slot) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.seed_gift_slots() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER tiers_seed_slots AFTER INSERT ON public.tiers
  FOR EACH ROW EXECUTE FUNCTION public.seed_gift_slots();

-- ===== Selections: one per unlocked tier per person =====
CREATE TABLE public.selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ledger text NOT NULL CHECK (ledger IN ('sender','goer')),
  earned_tier_id uuid NOT NULL REFERENCES public.tiers(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.tiers(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.gift_options(id) ON DELETE RESTRICT,
  slot text NOT NULL CHECK (slot IN ('A','B','C')),
  anonymous boolean NOT NULL DEFAULT false,
  shipping_name text,
  address_1 text,
  address_2 text,
  city text,
  state text,
  zip text,
  size text,
  engraving_text text,
  fmv_at_selection numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ordered','shipped','declined')),
  qualified_at timestamptz NOT NULL,
  locks_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, earned_tier_id)
);
GRANT SELECT ON public.selections TO authenticated;
GRANT ALL ON public.selections TO service_role;
ALTER TABLE public.selections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "People see their own selections; admins see all" ON public.selections FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_selections_updated_at BEFORE UPDATE ON public.selections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX selections_user_idx ON public.selections (user_id);
CREATE INDEX selections_status_idx ON public.selections (status, created_at);

-- ===== The public wall =====
CREATE TABLE public.gift_wall (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_id uuid NOT NULL UNIQUE REFERENCES public.selections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL,
  ledger text NOT NULL CHECK (ledger IN ('sender','goer')),
  kind text NOT NULL CHECK (kind IN ('candle','gift')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gift_wall TO anon;
GRANT SELECT ON public.gift_wall TO authenticated;
GRANT ALL ON public.gift_wall TO service_role;
ALTER TABLE public.gift_wall ENABLE ROW LEVEL SECURITY;
CREATE POLICY "The wall is public" ON public.gift_wall FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX gift_wall_created_idx ON public.gift_wall (created_at DESC);

-- ===== Seed the ladders =====
INSERT INTO public.tiers (ledger, threshold, name, sort_order, gifts) VALUES
  ('sender', 25, 'Spark', 1, false),
  ('sender', 100, 'Ember', 2, true),
  ('sender', 250, 'Candle', 3, true),
  ('sender', 500, 'Lantern', 4, true),
  ('sender', 1000, 'Torch', 5, true),
  ('sender', 2500, 'Beacon', 6, true),
  ('sender', 5000, 'Hearth', 7, true),
  ('sender', 10000, 'Lighthouse', 8, true),
  ('sender', 25000, 'Dawn', 9, true),
  ('sender', 100000, 'Daybreak', 10, true),
  ('sender', 1000000, 'Noon', 11, true),
  ('goer', 5, 'First shift', 1, true),
  ('goer', 10, 'Regular', 2, true),
  ('goer', 20, 'Steady hands', 3, true),
  ('goer', 40, 'A week given', 4, true),
  ('goer', 80, 'Two weeks given', 5, true),
  ('goer', 160, 'A month given', 6, true);