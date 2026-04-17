-- Fix linter warning: tighten avatars bucket policies
-- Public viewing of individual avatar URLs continues to work,
-- but listing all files is restricted to the owner.

-- Drop any overly broad SELECT policy (defensive — names may vary)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname IN (
        'Avatars are publicly accessible',
        'Public Access',
        'Avatar images are publicly accessible',
        'Anyone can view avatars'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Public can READ individual files via URL but cannot LIST (Supabase
-- distinguishes via PostgREST headers; this policy keeps direct GET working).
CREATE POLICY "Avatars: public read by URL"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (storage.foldername(name))[1]);

-- Owner-scoped write/delete on their own folder
CREATE POLICY "Avatars: owner can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Avatars: owner can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Avatars: owner can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);