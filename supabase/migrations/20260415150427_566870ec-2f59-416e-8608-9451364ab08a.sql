
-- Drop ALL existing SELECT policies on storage for these buckets
DROP POLICY IF EXISTS "Authenticated read media-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read audio" ON storage.objects;
DROP POLICY IF EXISTS "Owner read own media-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Owner read own videos" ON storage.objects;
DROP POLICY IF EXISTS "Owner read own images" ON storage.objects;
DROP POLICY IF EXISTS "Owner read own audio" ON storage.objects;
DROP POLICY IF EXISTS "Owner read media-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Owner read videos" ON storage.objects;
DROP POLICY IF EXISTS "Owner read images" ON storage.objects;
DROP POLICY IF EXISTS "Owner read audio" ON storage.objects;

-- Create owner-scoped SELECT policies
CREATE POLICY "Scoped read media-uploads"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'media-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Scoped read videos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Scoped read images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Scoped read audio"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Fix usuarios_planos: remove user DELETE, add admin-only DELETE
DROP POLICY IF EXISTS "Users can delete own plan" ON public.usuarios_planos;
DROP POLICY IF EXISTS "Only admins can delete plans" ON public.usuarios_planos;

CREATE POLICY "Only admins can delete plans"
ON public.usuarios_planos FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
