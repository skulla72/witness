ALTER TABLE public.user_survey
ADD COLUMN IF NOT EXISTS faith_based BOOLEAN;

COMMENT ON COLUMN public.user_survey.faith_based IS
  'Whether the person chose faith-based wording; null means not yet chosen.';