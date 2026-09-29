CREATE TABLE public.platform_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('church', 'professional')),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  pro_id UUID REFERENCES public.pro_profiles(id) ON DELETE CASCADE,
  headline TEXT NOT NULL CHECK (char_length(headline) BETWEEN 4 AND 120),
  story TEXT NOT NULL CHECK (char_length(story) BETWEEN 40 AND 2000),
  outcome TEXT NOT NULL CHECK (char_length(outcome) BETWEEN 4 AND 180),
  photo_url TEXT,
  consent_confirmed BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'changes_requested', 'removed')),
  review_note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_testimonials_subject_check CHECK (
    (subject_type = 'church' AND org_id IS NOT NULL AND pro_id IS NULL)
    OR (subject_type = 'professional' AND pro_id IS NOT NULL AND org_id IS NULL)
  )
);

GRANT SELECT ON public.platform_testimonials TO anon;
GRANT SELECT, INSERT, UPDATE ON public.platform_testimonials TO authenticated;
GRANT ALL ON public.platform_testimonials TO service_role;

ALTER TABLE public.platform_testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved testimonials are public"
ON public.platform_testimonials
FOR SELECT
TO anon, authenticated
USING (status = 'approved');

CREATE POLICY "Authors see their testimonials"
ON public.platform_testimonials
FOR SELECT
TO authenticated
USING (author_id = auth.uid());

CREATE POLICY "Admins see all testimonials"
ON public.platform_testimonials
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Eligible owners submit testimonials"
ON public.platform_testimonials
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND status = 'pending'
  AND consent_confirmed = true
  AND (
    (
      subject_type = 'professional'
      AND EXISTS (
        SELECT 1 FROM public.pro_profiles p
        WHERE p.id = pro_id
          AND p.user_id = auth.uid()
          AND p.status = 'approved'
      )
    )
    OR (
      subject_type = 'church'
      AND EXISTS (
        SELECT 1 FROM public.organization_members m
        WHERE m.org_id = platform_testimonials.org_id
          AND m.user_id = auth.uid()
          AND m.role IN ('owner', 'leader')
      )
    )
  )
);

CREATE POLICY "Authors revise unapproved testimonials"
ON public.platform_testimonials
FOR UPDATE
TO authenticated
USING (author_id = auth.uid() AND status IN ('pending', 'changes_requested'))
WITH CHECK (
  author_id = auth.uid()
  AND status = 'pending'
  AND consent_confirmed = true
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
  AND review_note IS NULL
  AND (
    (
      subject_type = 'professional'
      AND EXISTS (
        SELECT 1 FROM public.pro_profiles p
        WHERE p.id = pro_id
          AND p.user_id = auth.uid()
          AND p.status = 'approved'
      )
    )
    OR (
      subject_type = 'church'
      AND EXISTS (
        SELECT 1 FROM public.organization_members m
        WHERE m.org_id = platform_testimonials.org_id
          AND m.user_id = auth.uid()
          AND m.role IN ('owner', 'leader')
      )
    )
  )
);

CREATE POLICY "Admins review testimonials"
ON public.platform_testimonials
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX platform_testimonials_public_idx
ON public.platform_testimonials(status, created_at DESC);
CREATE INDEX platform_testimonials_author_idx
ON public.platform_testimonials(author_id, created_at DESC);
CREATE INDEX platform_testimonials_org_idx
ON public.platform_testimonials(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX platform_testimonials_pro_idx
ON public.platform_testimonials(pro_id) WHERE pro_id IS NOT NULL;

CREATE TRIGGER platform_testimonials_updated_at
BEFORE UPDATE ON public.platform_testimonials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();