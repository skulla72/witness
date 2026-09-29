CREATE TABLE public.notification_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  prayed_for_me BOOLEAN NOT NULL DEFAULT true,
  answers BOOLEAN NOT NULL DEFAULT true,
  messages BOOLEAN NOT NULL DEFAULT true,
  needs BOOLEAN NOT NULL DEFAULT true,
  weekly_story BOOLEAN NOT NULL DEFAULT false,
  quiet_start SMALLINT,
  quiet_end SMALLINT,
  time_zone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT quiet_start_hour CHECK (quiet_start IS NULL OR (quiet_start BETWEEN 0 AND 23)),
  CONSTRAINT quiet_end_hour CHECK (quiet_end IS NULL OR (quiet_end BETWEEN 0 AND 23))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_prefs TO authenticated;
GRANT ALL ON public.notification_prefs TO service_role;

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own notification prefs" ON public.notification_prefs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_notification_prefs_updated_at
  BEFORE UPDATE ON public.notification_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();