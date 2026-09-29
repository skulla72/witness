ALTER TABLE public.content_reports
  DROP CONSTRAINT IF EXISTS content_reports_reason_check;

ALTER TABLE public.content_reports
  ADD CONSTRAINT content_reports_reason_check
  CHECK (reason IN ('safety','adult_content','harassment','privacy','spam','fraud','other'));