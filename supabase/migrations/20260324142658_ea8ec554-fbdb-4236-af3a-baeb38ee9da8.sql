
-- Remove anonymous access from media-uploads storage policies
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;

-- Recreate with authenticated-only access
CREATE POLICY "Authenticated uploads only" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media-uploads');

CREATE POLICY "Authenticated reads only" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'media-uploads');
