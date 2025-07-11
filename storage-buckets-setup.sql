-- =====================================================
-- STORAGE BUCKETS SETUP FOR JUAL DIGITAL MARKETPLACE
-- =====================================================

-- Note: Storage buckets need to be created through the Supabase Dashboard
-- This script provides the SQL policies for the buckets

-- =====================================================
-- PRODUCTS BUCKET POLICIES
-- =====================================================

-- Create products bucket policy for public read access
CREATE POLICY "Products bucket public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'products');

-- Create products bucket policy for authenticated users to upload
CREATE POLICY "Products bucket authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'products' 
    AND auth.role() = 'authenticated'
  );

-- Create products bucket policy for users to update their own files
CREATE POLICY "Products bucket user update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'products' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create products bucket policy for users to delete their own files
CREATE POLICY "Products bucket user delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'products' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- FILES BUCKET POLICIES
-- =====================================================

-- Create files bucket policy for authenticated users to read
CREATE POLICY "Files bucket authenticated read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'files' 
    AND auth.role() = 'authenticated'
  );

-- Create files bucket policy for authenticated users to upload
CREATE POLICY "Files bucket authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'files' 
    AND auth.role() = 'authenticated'
  );

-- Create files bucket policy for users to update their own files
CREATE POLICY "Files bucket user update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create files bucket policy for users to delete their own files
CREATE POLICY "Files bucket user delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- AVATARS BUCKET POLICIES
-- =====================================================

-- Create avatars bucket policy for public read access
CREATE POLICY "Avatars bucket public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Create avatars bucket policy for authenticated users to upload
CREATE POLICY "Avatars bucket authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
  );

-- Create avatars bucket policy for users to update their own avatar
CREATE POLICY "Avatars bucket user update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create avatars bucket policy for users to delete their own avatar
CREATE POLICY "Avatars bucket user delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- END OF STORAGE BUCKETS SETUP
-- ===================================================== 