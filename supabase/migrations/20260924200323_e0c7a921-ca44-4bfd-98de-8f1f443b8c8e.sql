DROP POLICY IF EXISTS "Public reads service page media" ON storage.objects;
CREATE POLICY "Members read own profile media" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'profile-media' AND owner_id = (select auth.uid())::text);