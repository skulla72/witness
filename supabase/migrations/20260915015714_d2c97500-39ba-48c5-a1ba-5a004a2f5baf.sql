CREATE OR REPLACE FUNCTION private.search_people(_q text, _limit int)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, bio text, business_name text, business_line text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, p.display_name, p.avatar_url, p.bio, p.business_name, p.business_line
  FROM public.profiles p
  WHERE length(trim(_q)) >= 2
    AND (
      p.display_name ILIKE '%' || trim(_q) || '%'
      OR p.business_name ILIKE '%' || trim(_q) || '%'
    )
  ORDER BY p.display_name NULLS LAST
  LIMIT LEAST(GREATEST(_limit, 1), 25);
$$;

CREATE OR REPLACE FUNCTION public.search_people(_q text, _limit int DEFAULT 12)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, bio text, business_name text, business_line text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT * FROM private.search_people(_q, _limit)
  WHERE auth.uid() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.search_people(text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_people(text, int) TO authenticated, service_role;