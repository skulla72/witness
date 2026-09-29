-- 1) Keep anonymous grant details out of public reads.
DROP POLICY IF EXISTS "Anyone can see received grants" ON public.daf_grants;
CREATE POLICY "Anyone can see received named grants"
  ON public.daf_grants FOR SELECT
  USING (status = 'received' AND anonymous = false);

-- Sanitized public read so anonymous gifts still count toward totals
-- without revealing who gave them.
CREATE OR REPLACE FUNCTION public.grants_for_org_public(_org_id uuid)
RETURNS TABLE (
  id uuid,
  org_id uuid,
  sponsor text,
  fund_name text,
  donor_name text,
  anonymous boolean,
  amount_cents integer,
  granted_on date,
  status text,
  note text,
  reference text,
  recorded_by uuid,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id,
         g.org_id,
         CASE WHEN g.anonymous THEN '' ELSE g.sponsor END,
         CASE WHEN g.anonymous THEN '' ELSE g.fund_name END,
         CASE WHEN g.anonymous THEN '' ELSE g.donor_name END,
         g.anonymous,
         g.amount_cents,
         g.granted_on,
         g.status,
         CASE WHEN g.anonymous THEN '' ELSE g.note END,
         ''::text,
         NULL::uuid,
         g.created_at
  FROM public.daf_grants g
  WHERE g.org_id = _org_id
    AND g.status = 'received'
  ORDER BY g.granted_on DESC
$$;

REVOKE ALL ON FUNCTION public.grants_for_org_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grants_for_org_public(uuid) TO anon, authenticated, service_role;

-- 2) Topic-scoped authorization for the private call signaling channels.
DROP POLICY IF EXISTS "Call participants can read call signals" ON realtime.messages;
CREATE POLICY "Call participants can read call signals"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.calls c
      JOIN public.conversation_members m ON m.conversation_id = c.conversation_id
      WHERE realtime.topic() = 'rtc-' || c.id::text
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Call participants can send call signals" ON realtime.messages;
CREATE POLICY "Call participants can send call signals"
  ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.calls c
      JOIN public.conversation_members m ON m.conversation_id = c.conversation_id
      WHERE realtime.topic() = 'rtc-' || c.id::text
        AND m.user_id = auth.uid()
    )
  );