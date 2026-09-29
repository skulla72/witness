CREATE TABLE public.nonprofit_spotlights (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_of date NOT NULL UNIQUE,
  name text NOT NULL,
  lane text NOT NULL,
  city text NOT NULL,
  tagline text NOT NULL,
  story text NOT NULL,
  quote text NOT NULL DEFAULT '',
  quote_by text NOT NULL DEFAULT '',
  buys text[] NOT NULL DEFAULT '{}',
  to_program integer NOT NULL DEFAULT 85,
  tier text NOT NULL DEFAULT 'growing',
  website text NOT NULL DEFAULT '',
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nonprofit_spotlights TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nonprofit_spotlights TO authenticated;
GRANT ALL ON public.nonprofit_spotlights TO service_role;
ALTER TABLE public.nonprofit_spotlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Spotlights are viewable by everyone" ON public.nonprofit_spotlights FOR SELECT USING (true);
CREATE POLICY "Admins can add spotlights" ON public.nonprofit_spotlights FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update spotlights" ON public.nonprofit_spotlights FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete spotlights" ON public.nonprofit_spotlights FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_nonprofit_spotlights_updated_at BEFORE UPDATE ON public.nonprofit_spotlights FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.nonprofit_spotlights (week_of, name, lane, city, tagline, story, quote, quote_by, buys, to_program, tier, website) VALUES
('2026-08-31', 'No Trash Bags', 'foster', 'Kansas City, MO', 'A real suitcase on placement night, instead of a garbage bag.', 'A caseworker told the founder that most kids arrive at a new home carrying their life in a trash bag. Four years later, every child placed in three counties leaves with a real suitcase, a week of clothes that fit, pajamas, a toothbrush and one new thing that is theirs alone. Volunteers pack on Thursday nights. Placement calls come at 11pm, and someone always answers.', 'He asked if he could keep the bag. Not what was in it. The bag.', 'Renae, placement volunteer', ARRAY['A packed suitcase for one child — $45','A placement night on call — $300','A month of warehouse rent — $1,900'], 92, 'growing', 'notrashbags.org'),
('2026-09-07', 'Second Mile Homes', 'recovery', 'Denver, CO', 'Sober beds and a work program for men leaving detox.', 'Detox is five days. What breaks a man is day six, when there is nowhere to go. Second Mile keeps 22 beds, a house rhythm, and a work crew that pays the same week you arrive. Men stay an average of nine months. Two bedrooms are still unfinished — four more beds waiting on drywall and a weekend of framing help.', 'I had ninety days clean and no address. Both of those matter.', 'Marcus, resident, second year', ARRAY['One night in a sober bed — $38','A week of work-crew wages — $420','Finishing one bedroom — $2,600'], 87, 'audited', 'secondmilehomes.org'),
('2026-09-14', 'After the Casseroles', 'grief', 'Nashville, TN', 'Month two through month twenty-four, when everyone else has gone home.', 'The meals stop around week three. The calls stop by month two. This team starts there: a standing monthly visit, help with the paperwork nobody warns you about, yard work, and counseling paid for outright. They walk with 140 widows and widowers, and they do not stop at the first anniversary.', 'The first year people carry you. The second year you find out who stayed.', 'Delores, widowed 2024', ARRAY['One counseling session — $110','A month of standing visits — $60','A burial-cost gap — $1,400'], 88, 'growing', 'afterthecasseroles.org');

CREATE TABLE public.store_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text,
  price_cents integer NOT NULL CHECK (price_cents >= 100 AND price_cents <= 500000),
  sizes text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_store_products_org ON public.store_products(org_id);
GRANT SELECT ON public.store_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_products TO authenticated;
GRANT ALL ON public.store_products TO service_role;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store items are viewable by everyone" ON public.store_products FOR SELECT USING (true);
CREATE POLICY "Leaders can add store items" ON public.store_products FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = store_products.org_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['owner','leader'])));
CREATE POLICY "Leaders can update store items" ON public.store_products FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = store_products.org_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['owner','leader']))) WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = store_products.org_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['owner','leader'])));
CREATE POLICY "Leaders can delete store items" ON public.store_products FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = store_products.org_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['owner','leader'])));
CREATE TRIGGER update_store_products_updated_at BEFORE UPDATE ON public.store_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.store_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  status text NOT NULL DEFAULT 'pending',
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  stripe_session_id text UNIQUE,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_store_orders_org ON public.store_orders(org_id);
CREATE INDEX idx_store_orders_user ON public.store_orders(user_id);
GRANT SELECT ON public.store_orders TO authenticated;
GRANT ALL ON public.store_orders TO service_role;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers can see their own orders" ON public.store_orders FOR SELECT TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = store_orders.org_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['owner','leader'])));
CREATE TRIGGER update_store_orders_updated_at BEFORE UPDATE ON public.store_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.store_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.store_products(id) ON DELETE SET NULL,
  name text NOT NULL,
  size text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 50),
  unit_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_store_order_items_order ON public.store_order_items(order_id);
GRANT SELECT ON public.store_order_items TO authenticated;
GRANT ALL ON public.store_order_items TO service_role;
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order lines follow the order" ON public.store_order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.store_orders o WHERE o.id = store_order_items.order_id AND (o.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = o.org_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['owner','leader'])))));

INSERT INTO public.store_products (org_id, name, description, price_cents, sizes, sort)
SELECT o.id, v.name, v.description, v.price_cents, v.sizes, v.sort
FROM public.organizations o
CROSS JOIN (VALUES
  ('Logo tee', 'Heavyweight cotton tee with the house mark on the chest. Every dollar over cost stays here.', 2800, ARRAY['S','M','L','XL','2XL'], 1),
  ('Dad hat', 'Unstructured six-panel, brass eyelets, embroidered mark.', 3200, ARRAY['One size'], 2),
  ('Hoodie', 'Midweight fleece hoodie for cold mornings in the parking lot.', 5800, ARRAY['S','M','L','XL','2XL'], 3),
  ('Enamel mug', '12oz camp mug. Holds coffee through a long meeting.', 1800, ARRAY['One size'], 4)
) AS v(name, description, price_cents, sizes, sort)
WHERE o.kind = 'church';