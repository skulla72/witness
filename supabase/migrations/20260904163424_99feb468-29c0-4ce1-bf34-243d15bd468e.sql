CREATE TABLE public.user_survey (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  first_name TEXT NOT NULL DEFAULT '',
  seasons TEXT[] NOT NULL DEFAULT '{}',
  intensity TEXT NOT NULL DEFAULT 'steady',
  anonymous_first BOOLEAN NOT NULL DEFAULT true,
  mens_room BOOLEAN NOT NULL DEFAULT false,
  lanes TEXT[] NOT NULL DEFAULT '{}',
  serve TEXT[] NOT NULL DEFAULT '{}',
  processing TEXT NOT NULL DEFAULT 'write',
  contact TEXT NOT NULL DEFAULT 'steady',
  time_of_day TEXT NOT NULL DEFAULT 'night',
  group_size TEXT NOT NULL DEFAULT 'few',
  added_features TEXT[] NOT NULL DEFAULT '{}',
  removed_features TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_survey TO authenticated;
GRANT ALL ON public.user_survey TO service_role;

ALTER TABLE public.user_survey ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own survey" ON public.user_survey
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_survey_updated_at
  BEFORE UPDATE ON public.user_survey
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TYPE public.app_role AS ENUM ('admin', 'vetter', 'org_leader', 'user');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;