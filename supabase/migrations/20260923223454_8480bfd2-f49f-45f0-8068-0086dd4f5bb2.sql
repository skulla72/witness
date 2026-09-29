DROP POLICY "Public reads attached profile media" ON storage.objects;

CREATE POLICY "Public reads service page media"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'profile-media' AND (
    EXISTS (
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
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.logo_url = name OR o.cover_path = name
    )
    OR EXISTS (
      SELECT 1 FROM public.pro_profiles pp
      WHERE pp.photo_url = name AND (pp.status = 'approved' OR pp.user_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.counselor_profiles cp
      WHERE cp.photo_url = name AND (cp.status = 'approved' OR cp.user_id = auth.uid())
    )
  )
);