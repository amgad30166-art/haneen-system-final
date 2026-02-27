-- ═══════════════════════════════════════════════════════════
-- PATCH v5 — Remove age constraint from cvs table
-- Run this in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Drop the age range check (was restricting workers to 25–45 years old)
ALTER TABLE cvs DROP CONSTRAINT IF EXISTS valid_worker_age;

-- Also ensure date columns are plain DATE (not timestamptz)
-- Run these only if you see "time required" errors on date_of_birth or medical_exam_date
ALTER TABLE cvs ALTER COLUMN date_of_birth     TYPE DATE USING date_of_birth::DATE;
ALTER TABLE cvs ALTER COLUMN medical_exam_date TYPE DATE USING medical_exam_date::DATE;

-- Done ✅
