CREATE TABLE public.need_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id uuid NOT NULL UNIQUE REFERENCES public.needs(id) ON DELETE CASCADE,
  week_of date NOT NULL,
  videographer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  videographer_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','filming','published','canceled')),
  notes text NOT NULL DEFAULT '',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.story_shoots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.need_stories(id) ON DELETE CASCADE,
  phase text NOT NULL CHECK (phase IN ('before','during','after')),
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','captured','skipped')),
  note text NOT NULL DEFAULT '',
  update_id uuid REFERENCES public.need_updates(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, phase)
);

CREATE INDEX need_stories_week_idx ON public.need_stories (week_of DESC);
CREATE INDEX story_shoots_story_idx ON public.story_shoots (story_id, scheduled_for);

GRANT SELECT ON public.need_stories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.need_stories TO authenticated;
GRANT ALL ON public.need_stories TO service_role;
GRANT SELECT ON public.story_shoots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_shoots TO authenticated;
GRANT ALL ON public.story_shoots TO service_role;

ALTER TABLE public.need_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_shoots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stories follow the need's visibility" ON public.need_stories
FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.needs n WHERE n.id = need_stories.need_id));

CREATE POLICY "Need managers book stories" ON public.need_stories
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.needs n
  WHERE n.id = need_stories.need_id
    AND (n.posted_by = auth.uid()
      OR (n.org_id IS NOT NULL AND private.is_org_leader(n.org_id, auth.uid()))
      OR public.has_role(auth.uid(), 'admin'::app_role))
));

CREATE POLICY "Need managers edit stories" ON public.need_stories
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.needs n
  WHERE n.id = need_stories.need_id
    AND (n.posted_by = auth.uid()
      OR (n.org_id IS NOT NULL AND private.is_org_leader(n.org_id, auth.uid()))
      OR public.has_role(auth.uid(), 'admin'::app_role))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.needs n
  WHERE n.id = need_stories.need_id
    AND (n.posted_by = auth.uid()
      OR (n.org_id IS NOT NULL AND private.is_org_leader(n.org_id, auth.uid()))
      OR public.has_role(auth.uid(), 'admin'::app_role))
));

CREATE POLICY "Need managers cancel stories" ON public.need_stories
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.needs n
  WHERE n.id = need_stories.need_id
    AND (n.posted_by = auth.uid()
      OR (n.org_id IS NOT NULL AND private.is_org_leader(n.org_id, auth.uid()))
      OR public.has_role(auth.uid(), 'admin'::app_role))
));

CREATE POLICY "Shoots follow the story's visibility" ON public.story_shoots
FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.need_stories s WHERE s.id = story_shoots.story_id));

CREATE POLICY "Need managers add shoots" ON public.story_shoots
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.need_stories s JOIN public.needs n ON n.id = s.need_id
  WHERE s.id = story_shoots.story_id
    AND (n.posted_by = auth.uid()
      OR (n.org_id IS NOT NULL AND private.is_org_leader(n.org_id, auth.uid()))
      OR public.has_role(auth.uid(), 'admin'::app_role))
));

CREATE POLICY "Need managers edit shoots" ON public.story_shoots
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.need_stories s JOIN public.needs n ON n.id = s.need_id
  WHERE s.id = story_shoots.story_id
    AND (n.posted_by = auth.uid()
      OR (n.org_id IS NOT NULL AND private.is_org_leader(n.org_id, auth.uid()))
      OR public.has_role(auth.uid(), 'admin'::app_role))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.need_stories s JOIN public.needs n ON n.id = s.need_id
  WHERE s.id = story_shoots.story_id
    AND (n.posted_by = auth.uid()
      OR (n.org_id IS NOT NULL AND private.is_org_leader(n.org_id, auth.uid()))
      OR public.has_role(auth.uid(), 'admin'::app_role))
));

CREATE POLICY "Need managers remove shoots" ON public.story_shoots
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.need_stories s JOIN public.needs n ON n.id = s.need_id
  WHERE s.id = story_shoots.story_id
    AND (n.posted_by = auth.uid()
      OR (n.org_id IS NOT NULL AND private.is_org_leader(n.org_id, auth.uid()))
      OR public.has_role(auth.uid(), 'admin'::app_role))
));

CREATE OR REPLACE FUNCTION public.seed_story_shoots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _base timestamptz := (NEW.week_of + time '09:00') AT TIME ZONE 'UTC';
BEGIN
  INSERT INTO public.story_shoots (story_id, phase, scheduled_for)
  VALUES
    (NEW.id, 'before', _base),
    (NEW.id, 'during', _base + interval '3 days'),
    (NEW.id, 'after',  _base + interval '10 days')
  ON CONFLICT (story_id, phase) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER need_stories_seed_shoots
AFTER INSERT ON public.need_stories
FOR EACH ROW EXECUTE FUNCTION public.seed_story_shoots();

CREATE OR REPLACE FUNCTION public.feature_story_week()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'canceled' THEN
    UPDATE public.needs SET featured_week = NULL WHERE id = NEW.need_id;
  ELSE
    UPDATE public.needs SET featured_week = NEW.week_of WHERE id = NEW.need_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER need_stories_feature_week
AFTER INSERT OR UPDATE OF week_of, status ON public.need_stories
FOR EACH ROW EXECUTE FUNCTION public.feature_story_week();

CREATE TRIGGER update_need_stories_updated_at
BEFORE UPDATE ON public.need_stories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_story_shoots_updated_at
BEFORE UPDATE ON public.story_shoots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();