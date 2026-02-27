-- ═══════════════════════════════════════════════════════════
-- PATCH v5 — Relax mandatory constraints
-- Run in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Make date_of_birth and medical_exam_date optional in cvs
ALTER TABLE cvs DROP CONSTRAINT IF EXISTS valid_worker_age;
ALTER TABLE cvs ALTER COLUMN date_of_birth     DROP NOT NULL;
ALTER TABLE cvs ALTER COLUMN medical_exam_date DROP NOT NULL;

-- 2. Drop the FK that forces passport_number in orders to exist in cvs
--    (allows creating orders without uploading CVs first)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_passport_number_fkey;

-- Done ✅
