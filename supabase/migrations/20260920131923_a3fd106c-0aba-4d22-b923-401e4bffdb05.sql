-- One reminder nudge per person per day.
ALTER TABLE public.notification_prefs ADD COLUMN last_reminder_date date;

-- Private key the scheduled job presents when it calls the reminder endpoint.
CREATE TABLE public.reminder_cron_key (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.reminder_cron_key TO service_role;
ALTER TABLE public.reminder_cron_key ENABLE ROW LEVEL SECURITY;
-- No policies: nobody using the app can ever read the key.
INSERT INTO public.reminder_cron_key (key) VALUES ('e580ee79498c38d8551e19e4a964eff1601fd6acff36d248c3307cc869e89df3');

-- Scheduled jobs + outbound web calls.
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Hourly: fire the reminder endpoint; it decides who is due.
SELECT cron.schedule(
  'witness-daily-reminders',
  '7 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://id-preview--a7830fd8-7532-4f74-925f-84c5861fae77.lovable.app/api/public/push/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Reminder-Key', (SELECT key FROM public.reminder_cron_key ORDER BY id LIMIT 1)
    ),
    body := jsonb_build_object('trigger', 'cron')::text
  );
  $$
);