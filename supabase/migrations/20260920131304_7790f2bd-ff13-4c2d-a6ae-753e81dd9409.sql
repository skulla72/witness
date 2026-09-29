ALTER TABLE public.notification_prefs
  ADD COLUMN IF NOT EXISTS reminders boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_hour smallint;
ALTER TABLE public.notification_prefs
  ADD CONSTRAINT notification_prefs_reminder_hour_range CHECK (reminder_hour IS NULL OR (reminder_hour >= 0 AND reminder_hour <= 23));