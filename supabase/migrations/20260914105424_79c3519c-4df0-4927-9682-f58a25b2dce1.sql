CREATE TABLE public.app_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  survey_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  keep TEXT NOT NULL DEFAULT '',
  missing TEXT NOT NULL DEFAULT '',
  friction TEXT NOT NULL DEFAULT '',
  minutes_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX app_feedback_user_idx ON public.app_feedback (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.app_feedback TO authenticated;
GRANT ALL ON public.app_feedback TO service_role;

ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can leave their own feedback"
  ON public.app_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members read their own feedback"
  ON public.app_feedback FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins read all feedback"
  ON public.app_feedback FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));