-- Migration: 291_production_photos_storage
-- Description: Create Supabase Storage bucket for production task photos with RLS policies
-- Date: 2026-04-09

-- CONTEXT: Phase 3 of Kitchen Production Control — photo verification.
-- Cooks must take a photo of the finished preparation + label before completing a task.
-- Photos are uploaded to 'production-photos' bucket, 7-day retention.
-- Path convention: {department}/{date}/{preparationId}_{timestamp}.webp

-- 1. Create the bucket (public read, max 5MB per file, jpeg/png/webp)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'production-photos',
  'production-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS policies

-- Idempotent: drop first in case of re-run
DROP POLICY IF EXISTS "Staff can upload production photos" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update production photos" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete production photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for production photos" ON storage.objects;

-- Staff can upload (is_staff() check — not just authenticated)
CREATE POLICY "Staff can upload production photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'production-photos' AND public.is_staff());

-- Staff can update (replace)
CREATE POLICY "Staff can update production photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'production-photos' AND public.is_staff());

-- Staff can delete (cleanup)
CREATE POLICY "Staff can delete production photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'production-photos' AND public.is_staff());

-- Public read access (bucket is public)
CREATE POLICY "Public read access for production photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'production-photos');
