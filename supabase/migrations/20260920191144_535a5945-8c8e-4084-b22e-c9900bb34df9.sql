ALTER TABLE public.need_stories
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS film_path text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS film_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS shared_at timestamptz;

CREATE TABLE IF NOT EXISTS public.videographers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name text NOT NULL,
  city text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  reel_url text NOT NULL DEFAULT '',
  about text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.videographers TO authenticated;
GRANT ALL ON public.videographers TO service_role;
ALTER TABLE public.videographers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved videographers are visible to members"
  ON public.videographers FOR SELECT TO authenticated
  USING (status = 'approved' OR user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "People add their own videographer profile"
  ON public.videographers FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "People edit their own profile, team edits any"
  ON public.videographers FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER videographers_updated_at
  BEFORE UPDATE ON public.videographers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Assigned videographers see their stories"
  ON public.need_stories FOR SELECT TO authenticated
  USING (videographer_id = auth.uid());

CREATE POLICY "Assigned videographers update their stories"
  ON public.need_stories FOR UPDATE TO authenticated
  USING (videographer_id = auth.uid())
  WITH CHECK (videographer_id = auth.uid());

CREATE POLICY "Assigned videographers see their visits"
  ON public.story_shoots FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.need_stories s WHERE s.id = story_shoots.story_id AND s.videographer_id = auth.uid()));

CREATE POLICY "Assigned videographers update their visits"
  ON public.story_shoots FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.need_stories s WHERE s.id = story_shoots.story_id AND s.videographer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.need_stories s WHERE s.id = story_shoots.story_id AND s.videographer_id = auth.uid()));