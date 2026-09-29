CREATE TABLE public.nonprofit_lane_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lane text NOT NULL,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, lane)
);
CREATE INDEX nonprofit_lane_tags_org_idx ON public.nonprofit_lane_tags (org_id);
CREATE INDEX nonprofit_lane_tags_lane_idx ON public.nonprofit_lane_tags (lane);
GRANT SELECT, INSERT, DELETE ON public.nonprofit_lane_tags TO authenticated;
GRANT SELECT ON public.nonprofit_lane_tags TO anon;
GRANT ALL ON public.nonprofit_lane_tags TO service_role;
ALTER TABLE public.nonprofit_lane_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lane tags are public" ON public.nonprofit_lane_tags
  FOR SELECT USING (true);
CREATE POLICY "Signed-in members can tag a nonprofit" ON public.nonprofit_lane_tags
  FOR INSERT TO authenticated WITH CHECK (added_by = auth.uid());
CREATE POLICY "Taggers, org leaders and admins can remove a tag" ON public.nonprofit_lane_tags
  FOR DELETE TO authenticated USING (
    added_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.org_id = nonprofit_lane_tags.org_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'leader')
    )
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = nonprofit_lane_tags.org_id AND o.owner_id = auth.uid()
    )
  );

CREATE TABLE public.giving_choices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lane text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_id)
);
CREATE INDEX giving_choices_user_idx ON public.giving_choices (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.giving_choices TO authenticated;
GRANT ALL ON public.giving_choices TO service_role;
ALTER TABLE public.giving_choices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "People manage their own giving choices" ON public.giving_choices
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.nonprofit_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suggested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  cause text NOT NULL DEFAULT '',
  lane text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'declined')),
  review_note text NOT NULL DEFAULT '',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX nonprofit_suggestions_status_idx ON public.nonprofit_suggestions (status, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.nonprofit_suggestions TO authenticated;
GRANT ALL ON public.nonprofit_suggestions TO service_role;
ALTER TABLE public.nonprofit_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "See your own suggestions" ON public.nonprofit_suggestions
  FOR SELECT TO authenticated USING (suggested_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Suggest a nonprofit" ON public.nonprofit_suggestions
  FOR INSERT TO authenticated WITH CHECK (suggested_by = auth.uid() AND status = 'pending');
CREATE POLICY "The board records decisions" ON public.nonprofit_suggestions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER nonprofit_suggestions_updated_at
  BEFORE UPDATE ON public.nonprofit_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();