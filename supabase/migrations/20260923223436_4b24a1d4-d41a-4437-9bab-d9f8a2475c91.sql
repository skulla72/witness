CREATE POLICY "Public reads attached profile media"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'profile-media'
  AND EXISTS (
    SELECT 1 FROM public.profile_media pm
    WHERE pm.storage_path = name
      AND pm.moderation_status = 'visible'
      AND (
        (pm.page_type = 'organization' AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = pm.page_id))
        OR (pm.page_type = 'professional' AND EXISTS (SELECT 1 FROM public.pro_profiles pp WHERE pp.id = pm.page_id AND pp.status = 'approved'))
        OR (pm.page_type = 'counselor' AND EXISTS (SELECT 1 FROM public.counselor_profiles cp WHERE cp.id = pm.page_id AND cp.status = 'approved'))
        OR pm.owner_id = auth.uid()
      )
  )
);

CREATE POLICY "Members upload own profile media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Members update own profile media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-media' AND owner_id = auth.uid()::text)
WITH CHECK (bucket_id = 'profile-media' AND owner_id = auth.uid()::text);

CREATE POLICY "Members remove own profile media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-media' AND owner_id = auth.uid()::text);