CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'church',
  city text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  logo_url text,
  website text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.organizations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  rhythm text NOT NULL DEFAULT 'weekly',
  open_to text NOT NULL DEFAULT 'anyone',
  accepting boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.organization_groups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_groups TO authenticated;
GRANT ALL ON public.organization_groups TO service_role;
ALTER TABLE public.organization_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.organization_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.group_members TO authenticated;
GRANT ALL ON public.group_members TO service_role;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  place text NOT NULL DEFAULT '',
  online_url text,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.organization_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_events TO authenticated;
GRANT ALL ON public.organization_events TO service_role;
ALTER TABLE public.organization_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_org_leader(_org_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = _org_id AND o.owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = _org_id AND m.user_id = _user_id AND m.role IN ('owner','leader')
  )
$$;

REVOKE ALL ON FUNCTION public.is_org_leader(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_leader(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "Organizations are viewable by everyone"
  ON public.organizations FOR SELECT USING (true);
CREATE POLICY "Signed-in people can create organizations"
  ON public.organizations FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Leaders can update their organization"
  ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_org_leader(id, auth.uid())) WITH CHECK (public.is_org_leader(id, auth.uid()));
CREATE POLICY "Owners can delete their organization"
  ON public.organizations FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "Members are viewable by signed-in people"
  ON public.organization_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "People can join an organization themselves"
  ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'member');
CREATE POLICY "Leaders can add members"
  ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (public.is_org_leader(org_id, auth.uid()));
CREATE POLICY "Leaders can change roles"
  ON public.organization_members FOR UPDATE TO authenticated
  USING (public.is_org_leader(org_id, auth.uid())) WITH CHECK (public.is_org_leader(org_id, auth.uid()));
CREATE POLICY "People can leave, leaders can remove"
  ON public.organization_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_org_leader(org_id, auth.uid()));

CREATE POLICY "Groups are viewable by everyone"
  ON public.organization_groups FOR SELECT USING (true);
CREATE POLICY "Leaders can create groups"
  ON public.organization_groups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.is_org_leader(org_id, auth.uid()));
CREATE POLICY "Leaders can update groups"
  ON public.organization_groups FOR UPDATE TO authenticated
  USING (public.is_org_leader(org_id, auth.uid())) WITH CHECK (public.is_org_leader(org_id, auth.uid()));
CREATE POLICY "Leaders can delete groups"
  ON public.organization_groups FOR DELETE TO authenticated
  USING (public.is_org_leader(org_id, auth.uid()));

CREATE POLICY "Group members are viewable by signed-in people"
  ON public.group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "People can join a group themselves"
  ON public.group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "People can leave a group"
  ON public.group_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_org_leader(
    (SELECT g.org_id FROM public.organization_groups g WHERE g.id = group_id), auth.uid()));

CREATE POLICY "Events are viewable by everyone"
  ON public.organization_events FOR SELECT USING (true);
CREATE POLICY "Leaders can post events"
  ON public.organization_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.is_org_leader(org_id, auth.uid()));
CREATE POLICY "Leaders can update events"
  ON public.organization_events FOR UPDATE TO authenticated
  USING (public.is_org_leader(org_id, auth.uid())) WITH CHECK (public.is_org_leader(org_id, auth.uid()));
CREATE POLICY "Leaders can delete events"
  ON public.organization_events FOR DELETE TO authenticated
  USING (public.is_org_leader(org_id, auth.uid()));

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_organization_groups_updated_at BEFORE UPDATE ON public.organization_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_organization_events_updated_at BEFORE UPDATE ON public.organization_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (org_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.add_owner_as_member() FROM anon, authenticated, PUBLIC;

CREATE TRIGGER organizations_add_owner AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.add_owner_as_member();

INSERT INTO public.organizations (owner_id, slug, name, kind, city, region, description, verified)
SELECT id, 'grace-chapel-denver', 'Grace Chapel', 'church', 'Denver', 'CO',
  'A neighbourhood church in Baker. Sunday gatherings at 9 and 11, and a prayer room open every weekday morning.', true
FROM auth.users ORDER BY created_at LIMIT 1;

INSERT INTO public.organizations (owner_id, slug, name, kind, city, region, description, verified)
SELECT id, 'open-table-collective', 'Open Table Collective', 'community', 'Aurora', 'CO',
  'Not a church. A weekly table for anyone carrying something heavy — believers, doubters, and people just passing through.', false
FROM auth.users ORDER BY created_at LIMIT 1;

INSERT INTO public.organizations (owner_id, slug, name, kind, city, region, description, verified)
SELECT id, 'northside-recovery-mission', 'Northside Recovery Mission', 'nonprofit', 'Denver', 'CO',
  'Beds, meals and long-haul recovery support on the north side. Audited annually.', true
FROM auth.users ORDER BY created_at LIMIT 1;

INSERT INTO public.organization_groups (org_id, created_by, name, description, rhythm, open_to)
SELECT o.id, o.owner_id, 'Weekday Prayer Room', 'Six to seven every weekday morning. Come and go; no one leads out loud.', 'daily', 'anyone'
FROM public.organizations o WHERE o.slug = 'grace-chapel-denver';

INSERT INTO public.organization_groups (org_id, created_by, name, description, rhythm, open_to)
SELECT o.id, o.owner_id, 'Fathers and Sons', 'Eight weeks for men working through what they inherited.', 'weekly', 'men'
FROM public.organizations o WHERE o.slug = 'grace-chapel-denver';

INSERT INTO public.organization_groups (org_id, created_by, name, description, rhythm, open_to)
SELECT o.id, o.owner_id, 'Thursday Table', 'One long table, a shared meal, and whatever you brought with you.', 'weekly', 'anyone'
FROM public.organizations o WHERE o.slug = 'open-table-collective';

INSERT INTO public.organization_events (org_id, created_by, title, description, starts_at, place)
SELECT o.id, o.owner_id, 'Night of Prayer', 'Two hours, mostly quiet, candles and scripture read aloud on the hour.',
  now() + interval '6 days', '212 S Broadway, Denver'
FROM public.organizations o WHERE o.slug = 'grace-chapel-denver';

INSERT INTO public.organization_events (org_id, created_by, title, description, starts_at, place)
SELECT o.id, o.owner_id, 'Shared Meal + Open Mic Testimony', 'Bring a dish. Anyone who wants five minutes gets five minutes.',
  now() + interval '11 days', 'Aurora Community Hall'
FROM public.organizations o WHERE o.slug = 'open-table-collective';

INSERT INTO public.organization_events (org_id, created_by, title, description, starts_at, place)
SELECT o.id, o.owner_id, 'Kitchen Shift + Tour', 'Serve dinner, then stay for a walk-through of how the mission works.',
  now() + interval '3 days', '1140 Navajo St, Denver'
FROM public.organizations o WHERE o.slug = 'northside-recovery-mission';