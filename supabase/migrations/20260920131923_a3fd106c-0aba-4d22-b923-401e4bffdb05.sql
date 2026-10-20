-- One reminder nudge per person per day.
ALTER TABLE public.notification_prefs ADD COLUMN last_reminder_date date;

-- Legacy scheduled-job key storage. No credential is seeded from source.
-- Existing databases are unchanged by editing this historical migration.
CREATE TABLE public.reminder_cron_key (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.reminder_cron_key TO service_role;
ALTER TABLE public.reminder_cron_key ENABLE ROW LEVEL SECURITY;

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule only after an owner configures the live endpoint and secure
-- credential. Do not seed an old preview URL or exposed key into new projects.
-- See docs/OWNER-SETUP.md for the non-disruptive rotation sequence.
