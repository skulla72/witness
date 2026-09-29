-- 1. therapy_slots: only open future times, your own times, or a time you booked
DROP POLICY IF EXISTS "Signed-in people can see bookable times" ON public.therapy_slots;
CREATE POLICY "People see open times, their own, or ones they booked"
ON public.therapy_slots FOR SELECT TO authenticated
USING (
  therapist_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    status = 'open'
    AND EXISTS (
      SELECT 1 FROM public.therapists t
      WHERE t.user_id = therapy_slots.therapist_id AND t.verified AND t.accepting
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.therapy_sessions s
    WHERE s.slot_id = therapy_slots.id AND s.client_id = auth.uid()
  )
);

-- 2. worker_reviews: public only for workers with a public serving badge
DROP POLICY IF EXISTS "Reviews are public" ON public.worker_reviews;
CREATE POLICY "Reviews show on public badges or to the people involved"
ON public.worker_reviews FOR SELECT TO anon, authenticated
USING (
  EXISTS (SELECT 1 FROM public.serving_badges b WHERE b.user_id = worker_reviews.worker_id AND b.is_public)
  OR worker_id = auth.uid()
  OR reviewer_id = auth.uid()
  OR private.can_manage_need(need_id, auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 3. worker_reputation: same rule
DROP POLICY IF EXISTS "Reputation is public" ON public.worker_reputation;
CREATE POLICY "Reputation shows on public badges or to the worker"
ON public.worker_reputation FOR SELECT TO anon, authenticated
USING (
  EXISTS (SELECT 1 FROM public.serving_badges b WHERE b.user_id = worker_reputation.user_id AND b.is_public)
  OR user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 4. worker_marks: never public; only the worker, the people running the job, admins
DROP POLICY IF EXISTS "Marks are public" ON public.worker_marks;
CREATE POLICY "Marks are visible to the worker and the job's leaders"
ON public.worker_marks FOR SELECT TO authenticated
USING (
  worker_id = auth.uid()
  OR created_by = auth.uid()
  OR private.can_manage_need(need_id, auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 5. platform_settings: only the team reads settings (servers use the service role)
DROP POLICY IF EXISTS "Anyone signed in can read settings" ON public.platform_settings;

-- 6. storage: testimony media tied to who may see the prayer it belongs to
DROP POLICY IF EXISTS "Members read authorized testimony media" ON storage.objects;
CREATE POLICY "Members read authorized testimony media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'testimony-media'
  AND (
    owner_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.prayer_media pm
      JOIN public.prayer_posts p ON p.id = pm.prayer_id
      WHERE pm.storage_path = objects.name
        AND (p.author_id = auth.uid() OR p.privacy <> 'private')
    )
    OR EXISTS (
      SELECT 1 FROM public.intercessions i
      JOIN public.prayer_posts p ON p.id = i.prayer_id
      WHERE i.media_path = objects.name
        AND (i.sender_id = auth.uid() OR p.author_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.gratitude_entries g
      WHERE g.media_path = objects.name
        AND (g.author_id = auth.uid() OR g.privacy = 'community')
    )
  )
);