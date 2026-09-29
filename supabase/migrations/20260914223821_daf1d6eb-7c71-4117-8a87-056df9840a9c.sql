CREATE OR REPLACE FUNCTION private.member_cards(_ids uuid[])
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  bio text,
  has_given boolean,
  giver_mark boolean,
  serving_public boolean,
  business_name text,
  business_line text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.has_given,
    p.giver_mark,
    p.serving_public,
    CASE WHEN p.serving_public THEN p.business_name ELSE '' END,
    CASE WHEN p.serving_public THEN p.business_line ELSE '' END
  FROM public.profiles p
  WHERE p.user_id = ANY (_ids)
    AND auth.uid() IS NOT NULL
$$;

REVOKE ALL ON FUNCTION private.member_cards(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.member_cards(uuid[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.member_cards(_ids uuid[])
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  bio text,
  has_given boolean,
  giver_mark boolean,
  serving_public boolean,
  business_name text,
  business_line text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT * FROM private.member_cards(_ids)
$$;

REVOKE ALL ON FUNCTION public.member_cards(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_cards(uuid[]) TO authenticated, service_role;