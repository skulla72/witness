DROP POLICY IF EXISTS "Need media follows the need's visibility" ON storage.objects;
CREATE POLICY "Need media follows the need's visibility"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'need-media'
  AND EXISTS (
    SELECT 1 FROM public.needs n
    WHERE n.id::text = (storage.foldername(objects.name))[1]
      AND (
        (n.is_public = true AND n.status <> 'closed')
        OR n.posted_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR (n.org_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.org_id = n.org_id
            AND om.user_id = auth.uid()
            AND om.role IN ('owner','leader')
        ))
      )
  )
);

DROP POLICY IF EXISTS "Starter adds members" ON conversation_members;
CREATE POLICY "Starter adds members"
ON public.conversation_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_members.conversation_id
      AND c.created_by = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.conversation_id = conversation_members.conversation_id
  )
);