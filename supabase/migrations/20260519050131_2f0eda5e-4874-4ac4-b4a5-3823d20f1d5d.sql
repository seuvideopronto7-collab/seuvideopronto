
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-videos', 'generated-videos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can read own generated videos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'generated-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload own generated videos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'generated-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own generated videos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'generated-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own generated videos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'generated-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
