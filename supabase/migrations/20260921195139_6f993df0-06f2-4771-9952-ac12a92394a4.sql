CREATE POLICY "No member access to reminder cron key"
ON public.reminder_cron_key
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);