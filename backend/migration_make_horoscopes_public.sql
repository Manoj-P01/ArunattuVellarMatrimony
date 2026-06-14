-- Run this in your Supabase SQL Editor to make existing uploaded horoscopes public
-- and allow public reads on them.

UPDATE storage.buckets
SET public = true
WHERE id = 'horoscopes';

DROP POLICY IF EXISTS "Public horoscopes readable" ON storage.objects;
CREATE POLICY "Public horoscopes readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'horoscopes');

-- Ensure the combined policy exists or is updated
DROP POLICY IF EXISTS "Public photos readable" ON storage.objects;
CREATE POLICY "Public photos readable"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('photos', 'horoscopes'));
