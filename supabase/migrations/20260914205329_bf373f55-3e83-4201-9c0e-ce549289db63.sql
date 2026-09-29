-- 1) Need updates follow the visibility of their need ------------------------
DROP POLICY IF EXISTS "Updates follow the need's visibility" ON public.need_updates;

CREATE POLICY "Public need updates are visible to everyone"
ON public.need_updates FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.needs n
  WHERE n.id = need_updates.need_id
    AND n.is_public = true
    AND n.status <> 'closed'
));

CREATE POLICY "Members see updates on needs they can see"
ON public.need_updates FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.needs n
  WHERE n.id = need_updates.need_id
    AND (
      (n.is_public = true AND n.status <> 'closed')
      OR n.posted_by = auth.uid()
      OR (n.org_id IS NOT NULL AND private.is_org_leader(n.org_id, auth.uid()))
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR (n.prayer_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.prayer_posts p WHERE p.id = n.prayer_id
         ))
    )
));

-- 2) Organization contact details are not public -----------------------------
REVOKE SELECT ON public.organizations FROM anon;
GRANT SELECT (
  id, owner_id, slug, name, kind, city, region, description,
  logo_url, website, verified, address, created_at, updated_at
) ON public.organizations TO anon;

-- 3) Full profile rows are owner-only; others read a limited member card -----
DROP POLICY IF EXISTS "Profiles are viewable by signed-in people" ON public.profiles;

CREATE POLICY "People see their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.member_cards
WITH (security_invoker = off) AS
SELECT
  p.user_id,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.has_given,
  p.giver_mark,
  p.serving_public,
  CASE WHEN p.serving_public THEN p.business_name ELSE '' END AS business_name,
  CASE WHEN p.serving_public THEN p.business_line ELSE '' END AS business_line
FROM public.profiles p;

REVOKE ALL ON public.member_cards FROM anon;
GRANT SELECT ON public.member_cards TO authenticated;
GRANT ALL ON public.member_cards TO service_role;