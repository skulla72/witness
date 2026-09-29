ALTER TABLE public.organizations ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE public.organization_groups ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.organization_events ALTER COLUMN created_by DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.organization_members (org_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT (org_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

INSERT INTO public.organizations (slug, name, kind, city, region, description, verified) VALUES
  ('grace-chapel-denver', 'Grace Chapel', 'church', 'Denver', 'CO', 'A neighbourhood church in Baker. Sunday gatherings at 9 and 11, and a prayer room open every weekday morning.', true),
  ('open-table-collective', 'Open Table Collective', 'community', 'Aurora', 'CO', 'Not a church. A weekly table for anyone carrying something heavy — believers, doubters, and people just passing through.', false),
  ('northside-recovery-mission', 'Northside Recovery Mission', 'nonprofit', 'Denver', 'CO', 'Beds, meals and long-haul recovery support on the north side. Audited annually.', true);

INSERT INTO public.organization_groups (org_id, name, description, rhythm, open_to)
SELECT o.id, v.name, v.description, v.rhythm, v.open_to
FROM public.organizations o
JOIN (VALUES
  ('grace-chapel-denver', 'Weekday Prayer Room', 'Six to seven every weekday morning. Come and go; no one leads out loud.', 'daily', 'anyone'),
  ('grace-chapel-denver', 'Fathers and Sons', 'Eight weeks for men working through what they inherited.', 'weekly', 'men'),
  ('open-table-collective', 'Thursday Table', 'One long table, a shared meal, and whatever you brought with you.', 'weekly', 'anyone'),
  ('northside-recovery-mission', 'Kitchen Crew', 'Dinner service Tuesdays and Fridays. Training on your first shift.', 'weekly', 'anyone')
) AS v(slug, name, description, rhythm, open_to) ON v.slug = o.slug;

INSERT INTO public.organization_events (org_id, title, description, starts_at, place)
SELECT o.id, v.title, v.description, now() + v.offset_days, v.place
FROM public.organizations o
JOIN (VALUES
  ('grace-chapel-denver', 'Night of Prayer', 'Two hours, mostly quiet, candles and scripture read aloud on the hour.', interval '6 days', '212 S Broadway, Denver'),
  ('open-table-collective', 'Shared Meal + Open Mic Testimony', 'Bring a dish. Anyone who wants five minutes gets five minutes.', interval '11 days', 'Aurora Community Hall'),
  ('northside-recovery-mission', 'Kitchen Shift + Tour', 'Serve dinner, then stay for a walk-through of how the mission works.', interval '3 days', '1140 Navajo St, Denver')
) AS v(slug, title, description, offset_days, place) ON v.slug = o.slug;