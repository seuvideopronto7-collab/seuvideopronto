-- Remove public SELECT policies from private buckets
DROP POLICY IF EXISTS "Public read images all" ON storage.objects;
DROP POLICY IF EXISTS "Public read videos all" ON storage.objects;
DROP POLICY IF EXISTS "Public read audio all" ON storage.objects;

-- Also remove any other overly permissive policies on these buckets
DROP POLICY IF EXISTS "public_read_images" ON storage.objects;
DROP POLICY IF EXISTS "public_read_videos" ON storage.objects;
DROP POLICY IF EXISTS "public_read_audio" ON storage.objects;

-- Ensure owner-scoped SELECT policies exist for each private bucket
-- Using folder-based ownership: first folder = user ID

-- IMAGES bucket
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Owner read own images'
  ) THEN
    CREATE POLICY "Owner read own images"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Owner upload own images'
  ) THEN
    CREATE POLICY "Owner upload own images"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Owner update own images'
  ) THEN
    CREATE POLICY "Owner update own images"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Owner delete own images'
  ) THEN
    CREATE POLICY "Owner delete own images"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

-- VIDEOS bucket
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Owner read own videos'
  ) THEN
    CREATE POLICY "Owner read own videos"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Owner upload own videos'
  ) THEN
    CREATE POLICY "Owner upload own videos"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Owner update own videos'
  ) THEN
    CREATE POLICY "Owner update own videos"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Owner delete own videos'
  ) THEN
    CREATE POLICY "Owner delete own videos"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

-- AUDIO bucket
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Owner read own audio'
  ) THEN
    CREATE POLICY "Owner read own audio"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Owner upload own audio'
  ) THEN
    CREATE POLICY "Owner upload own audio"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Owner update own audio'
  ) THEN
    CREATE POLICY "Owner update own audio"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Owner delete own audio'
  ) THEN
    CREATE POLICY "Owner delete own audio"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

-- MEDIA-UPLOADS bucket (same pattern)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Owner read own media-uploads'
  ) THEN
    CREATE POLICY "Owner read own media-uploads"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'media-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Owner upload own media-uploads'
  ) THEN
    CREATE POLICY "Owner upload own media-uploads"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'media-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Owner update own media-uploads'
  ) THEN
    CREATE POLICY "Owner update own media-uploads"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'media-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Owner delete own media-uploads'
  ) THEN
    CREATE POLICY "Owner delete own media-uploads"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'media-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

-- Service role full access on all storage (for edge functions)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Service role full storage access'
  ) THEN
    CREATE POLICY "Service role full storage access"
    ON storage.objects FOR ALL TO service_role
    USING (true) WITH CHECK (true);
  END IF;
END $$;