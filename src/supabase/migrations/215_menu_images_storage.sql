-- Migration: 215_menu_images_storage
-- Description: Create Supabase Storage bucket for menu item images with RLS policies
-- Date: 2026-03-15

-- CONTEXT: Web-winter site is ready to display dish photos via item.image_url.
-- This migration creates the storage bucket and access policies for uploading
-- menu item images from the backoffice admin panel.

-- NOTE: Write policies use TO authenticated (not role-specific) — consistent with codebase pattern.
-- App-level role checks (admin/manager) are enforced in the Vue UI layer.
-- Thumbnail naming convention: items/{id}_thumb.webp (derived from main path, not stored in DB).

-- 1. Create the bucket (public, max 512KB per file, webp/png/jpeg only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('menu-images', 'menu-images', true, 524288, ARRAY['image/webp', 'image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- 2. RLS policies for the bucket

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload menu images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'menu-images');

-- Authenticated users can update (replace images)
CREATE POLICY "Authenticated users can update menu images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'menu-images');

-- Authenticated users can delete
CREATE POLICY "Authenticated users can delete menu images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'menu-images');

-- Public read access (bucket is public)
CREATE POLICY "Public read access for menu images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'menu-images');
