-- Add banner_url column to classes table
ALTER TABLE classes ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Add schedule_days column (stores array of days like ['monday', 'wednesday', 'friday'])
ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_days TEXT[];

-- Add schedule_time column (stores time like '18:00')
ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_time TEXT;

-- Add duration_minutes column (stores duration like 60, 90)
ALTER TABLE classes ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Optional: Drop the old schedule column if you want to remove it completely
-- ALTER TABLE classes DROP COLUMN schedule;

-- Create storage bucket for class banners (run this in Supabase Dashboard > Storage)
-- Bucket name: class-banners
-- Public: true
-- File size limit: 5MB
-- Allowed MIME types: image/*

-- Storage policies for class-banners bucket
-- Note: Drop policies first if they exist, then recreate them

-- Drop existing policies (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Public can view class banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload class banners" ON storage.objects;
DROP POLICY IF EXISTS "Users can update class banners" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete class banners" ON storage.objects;

-- Policy 1: Allow public read access
CREATE POLICY "Public can view class banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'class-banners');

-- Policy 2: Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload class banners"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'class-banners' AND auth.role() = 'authenticated');

-- Policy 3: Allow users to update their own uploads
CREATE POLICY "Users can update class banners"
ON storage.objects FOR UPDATE
USING (bucket_id = 'class-banners' AND auth.role() = 'authenticated');

-- Policy 4: Allow users to delete class banners
CREATE POLICY "Users can delete class banners"
ON storage.objects FOR DELETE
USING (bucket_id = 'class-banners' AND auth.role() = 'authenticated');
