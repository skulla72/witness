-- Hourly safety net; the real sending happens the moment a gift clears or a job is confirmed.
SELECT cron.schedule(
  'witness-automatic-payouts',
  '23 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--a7830fd8-7532-4f74-925f-84c5861fae77.lovable.app/api/public/payouts/run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Payout-Key', (SELECT key FROM public.reminder_cron_key ORDER BY id LIMIT 1)
    ),
    body := jsonb_build_object('trigger', 'cron')::text
  );
  $$
);