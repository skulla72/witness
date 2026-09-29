ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS heads_up_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS heads_up_note TEXT NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.send_heads_up(_request_id UUID, _note TEXT)
RETURNS public.service_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.service_requests;
BEGIN
  UPDATE public.service_requests r
     SET heads_up_at = now(),
         heads_up_note = left(coalesce(_note, ''), 300),
         updated_at = now()
   WHERE r.id = _request_id
     AND r.status = 'hired'
     AND EXISTS (
       SELECT 1 FROM public.pro_profiles p
        WHERE p.id = r.hired_pro_id AND p.user_id = auth.uid()
     )
  RETURNING * INTO row;

  IF row.id IS NULL THEN
    RAISE EXCEPTION 'Only the hired professional can send a heads-up on this job';
  END IF;

  RETURN row;
END;
$$;

REVOKE ALL ON FUNCTION public.send_heads_up(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_heads_up(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.send_heads_up(UUID, TEXT) TO authenticated;