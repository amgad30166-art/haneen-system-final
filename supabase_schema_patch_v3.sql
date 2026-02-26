-- ═══════════════════════════════════════════════════════════
-- PATCH v3: Add profile_photo column to cvs table
-- Run this in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Add profile_photo column
ALTER TABLE cvs ADD COLUMN IF NOT EXISTS profile_photo TEXT;

-- 2. Drop and recreate get_available_workers() to include profile_photo
DROP FUNCTION IF EXISTS get_available_workers();

CREATE OR REPLACE FUNCTION get_available_workers()
RETURNS TABLE (
  worker_name         TEXT,
  passport_number     TEXT,
  date_of_birth       DATE,
  religion            TEXT,
  photo_url           TEXT,
  profile_photo       TEXT,
  video_url           TEXT,
  nationality         TEXT,
  profession          TEXT,
  new_or_experienced  TEXT,
  marital_status      TEXT,
  children_count      INT,
  salary              NUMERIC,
  worker_age          INT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    aw.worker_name,
    aw.passport_number,
    aw.date_of_birth,
    aw.religion::TEXT,
    aw.photo_url,
    aw.profile_photo,
    aw.video_url,
    aw.nationality::TEXT,
    aw.profession::TEXT,
    aw.new_or_experienced::TEXT,
    aw.marital_status::TEXT,
    aw.children_count,
    aw.salary,
    EXTRACT(YEAR FROM AGE(aw.date_of_birth))::INT AS worker_age
  FROM cvs aw
  WHERE
    aw.internal_status        = 'accepted'
    AND aw.external_office_status = 'ready'
    AND NOT EXISTS (
      SELECT 1 FROM orders o
      WHERE o.passport_number = aw.passport_number
        AND o.order_status NOT IN ('arrived', 'cancelled')
    );
END;
$$;
