CREATE POLICY "Encouragement words visible with the prayer" ON public.intercessions FOR SELECT TO authenticated
  USING (kind IN ('tap','word') AND EXISTS (SELECT 1 FROM public.prayer_posts p WHERE p.id = intercessions.prayer_id));
CREATE POLICY "Moderators read all intercessions" ON public.intercessions FOR SELECT TO authenticated
  USING (public.is_moderator(auth.uid()));
CREATE POLICY "Moderators delete intercessions" ON public.intercessions FOR DELETE TO authenticated
  USING (public.is_moderator(auth.uid()));