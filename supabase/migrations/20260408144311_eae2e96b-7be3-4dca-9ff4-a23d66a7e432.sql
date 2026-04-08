
-- Drop the authenticated-only SELECT policies
DROP POLICY IF EXISTS "Authenticated reads only" ON storage.objects;
DROP POLICY IF EXISTS "Auth read images" ON storage.objects;
DROP POLICY IF EXISTS "Auth read videos" ON storage.objects;
DROP POLICY IF EXISTS "Auth read audio" ON storage.objects;

-- Create public SELECT policies for all public buckets
CREATE POLICY "Public read media-uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'media-uploads');

CREATE POLICY "Public read images all"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

CREATE POLICY "Public read videos all"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

CREATE POLICY "Public read audio all"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio');
