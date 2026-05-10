-- Remove broad bucket-only INSERT policies that override owner-scoped ones
DROP POLICY IF EXISTS "Authenticated uploads only" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload images" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload audio" ON storage.objects;