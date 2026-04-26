-- Make buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('owner-images','shop-images','trade-licenses','task-proofs');

-- Drop overly broad public read policies, replace with authenticated-only
DROP POLICY IF EXISTS "owner_images_read" ON storage.objects;
DROP POLICY IF EXISTS "shop_images_read" ON storage.objects;
DROP POLICY IF EXISTS "trade_licenses_read" ON storage.objects;
DROP POLICY IF EXISTS "task_proofs_read" ON storage.objects;

CREATE POLICY "owner_images_read_auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'owner-images');
CREATE POLICY "shop_images_read_auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'shop-images');
CREATE POLICY "trade_licenses_read_auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'trade-licenses');
CREATE POLICY "task_proofs_read_auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'task-proofs');