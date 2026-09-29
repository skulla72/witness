DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'needs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.needs;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'job_funds') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_funds;
  END IF;
END $$;
ALTER TABLE public.needs REPLICA IDENTITY FULL;
ALTER TABLE public.job_funds REPLICA IDENTITY FULL;