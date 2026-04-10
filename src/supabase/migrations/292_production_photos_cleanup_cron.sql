-- Migration: 292_production_photos_cleanup_cron
-- Description: Enable pg_cron and schedule 7-day cleanup for production photos
-- Date: 2026-04-09

-- CONTEXT: Production photos are temporary evidence — 7-day retention is sufficient.
-- Uses pg_cron to delete old photos daily at 03:00 UTC.

-- 1. Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Grant usage to postgres role (required for Supabase)
GRANT USAGE ON SCHEMA cron TO postgres;

-- 3. Unschedule first for idempotency (ignore if not exists)
SELECT cron.unschedule('cleanup-production-photos')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-production-photos');

-- 4. Schedule daily cleanup at 03:00 UTC
-- Deletes storage objects from 'production-photos' bucket older than 7 days
-- Also clears photo_url references in production_schedule for cleaned photos
SELECT cron.schedule(
  'cleanup-production-photos',
  '0 3 * * *',
  $$
    -- Delete old photo files from storage
    DELETE FROM storage.objects
    WHERE bucket_id = 'production-photos'
      AND created_at < NOW() - INTERVAL '7 days';

    -- Clear stale photo_url references in production_schedule
    UPDATE production_schedule
    SET photo_url = NULL, photo_uploaded_at = NULL
    WHERE photo_url IS NOT NULL
      AND photo_uploaded_at < NOW() - INTERVAL '7 days';
  $$
);
