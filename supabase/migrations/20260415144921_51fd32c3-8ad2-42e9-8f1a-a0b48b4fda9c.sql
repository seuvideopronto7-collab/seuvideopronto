
-- Drop restrictive SELECT policies that require user-id folder prefix
DROP POLICY IF EXISTS "Owner read videos" ON storage.objects;
DROP POLICY IF EXISTS "Owner read images" ON storage.objects;
DROP POLICY IF EXISTS "Owner read audio" ON storage.objects;
DROP POLICY IF EXISTS "Owner read media-uploads" ON storage.objects;

-- Create authenticated SELECT policies (file URLs are only known via RLS-protected video_jobs)
CREATE POLICY "Authenticated read media-uploads"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'media-uploads');

CREATE POLICY "Authenticated read videos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'videos');

CREATE POLICY "Authenticated read images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'images');

CREATE POLICY "Authenticated read audio"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'audio');
