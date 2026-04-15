
-- ============================================
-- CAMADA 1: SUBSCRIPTIONS — só service_role pode mutar
-- ============================================

DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;

-- ============================================
-- CAMADA 2: STORAGE — owner-scoped policies
-- ============================================

-- Remove all existing broad policies on storage.objects for our buckets
DROP POLICY IF EXISTS "Public read videos" ON storage.objects;
DROP POLICY IF EXISTS "Public read images" ON storage.objects;
DROP POLICY IF EXISTS "Public read audio" ON storage.objects;
DROP POLICY IF EXISTS "Public read media-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload media-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update media-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete media-uploads" ON storage.objects;
-- Also drop any "anon" read policies
DROP POLICY IF EXISTS "anon read videos" ON storage.objects;
DROP POLICY IF EXISTS "anon read images" ON storage.objects;
DROP POLICY IF EXISTS "anon read audio" ON storage.objects;

-- ---- VIDEOS ----
CREATE POLICY "Owner read videos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner insert videos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner update videos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner delete videos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Service role needs full access for edge functions
CREATE POLICY "Service role full videos"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'videos') WITH CHECK (bucket_id = 'videos');

-- ---- IMAGES ----
CREATE POLICY "Owner read images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner insert images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner update images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner delete images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Service role full images"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'images') WITH CHECK (bucket_id = 'images');

-- ---- AUDIO ----
CREATE POLICY "Owner read audio"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner insert audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner update audio"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner delete audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Service role full audio"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'audio') WITH CHECK (bucket_id = 'audio');

-- ---- MEDIA-UPLOADS ----
CREATE POLICY "Owner read media-uploads"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'media-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner insert media-uploads"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner update media-uploads"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner delete media-uploads"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Service role full media-uploads"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'media-uploads') WITH CHECK (bucket_id = 'media-uploads');

-- Make buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('videos', 'images', 'audio', 'media-uploads');
