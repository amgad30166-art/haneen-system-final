-- ═══════════════════════════════════════════════════════════════════
-- CV BULK INSERT TEMPLATE — Haneen Al Sharq
-- How to use:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Copy this file content
--   3. Replace the sample values with your real data
--   4. Click "Run"
--
-- ALLOWED VALUES (copy exactly, case-sensitive):
--   nationality        : ethiopia | kenya | uganda | philippines | india
--   profession         : housemaid | private_driver
--   religion           : muslim | christian
--   marital_status     : single | married | divorced | widowed
--   new_or_experienced : new | experienced
--   musaned_status     : uploaded | not_uploaded
--   internal_status    : accepted | rejected
--   external_office_status : ready | cancel | not_available
--   office_name        : must match EXACTLY what you entered in external_offices table
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO cvs (
  worker_name,
  passport_number,
  date_of_birth,        -- optional, format: 'YYYY-MM-DD' or NULL
  nationality,
  profession,
  religion,
  marital_status,       -- optional
  children_count,       -- optional, default 0
  salary,
  new_or_experienced,
  medical_exam_date,    -- optional, format: 'YYYY-MM-DD' or NULL
  musaned_status,
  internal_status,
  external_office_status,
  external_office_id,   -- auto-looked up by office name below
  broker_name           -- optional
)
SELECT
  v.worker_name, v.passport_number, v.date_of_birth::DATE,
  v.nationality::nationality_enum, v.profession::profession_enum,
  v.religion::religion_enum, v.marital_status::marital_status_enum,
  v.children_count::INT, v.salary::NUMERIC,
  v.new_or_experienced::worker_experience_enum,
  v.medical_exam_date::DATE,
  v.musaned_status::musaned_upload_enum,
  v.internal_status::internal_status_enum,
  v.external_office_status::external_office_status_enum,
  (SELECT id FROM external_offices WHERE office_name = v.office_name),
  v.broker_name
FROM (VALUES
  -- ↓↓↓ ADD YOUR DATA HERE — one row per worker ↓↓↓
  -- (worker_name, passport_number, date_of_birth, nationality, profession, religion, marital_status, children_count, salary, new_or_experienced, medical_exam_date, musaned_status, internal_status, external_office_status, office_name, broker_name)
  ('أميرة تيفيري',    'EP1234567', '1998-03-15', 'ethiopia',    'housemaid',      'christian', 'single',  '0', '1200', 'new',        '2025-01-10', 'uploaded',     'accepted', 'ready',         'مكتب النور - أديس أبابا', ''),
  ('ماريا سانتوس',   'PP9876543', '1996-07-22', 'philippines', 'housemaid',      'christian', 'married', '2', '1400', 'experienced','2025-02-01', 'uploaded',     'accepted', 'ready',         'مكتب مانيلا',             ''),
  ('أماني موكوبي',   'KE5551234', '',           'kenya',       'housemaid',      'christian', 'single',  '0', '1100', 'new',        '',           'not_uploaded', 'rejected', 'not_available', 'مكتب نيروبي',             'سمسار A'),
  -- ↑↑↑ copy the line above and change values for each new worker ↑↑↑
  ('WORKER_NAME',    'PASSPORT',  '',           'ethiopia',    'housemaid',      'muslim',    'single',  '0', '1200', 'new',        '',           'not_uploaded', 'rejected', 'not_available', 'OFFICE_NAME',             '')
) AS v(worker_name, passport_number, date_of_birth, nationality, profession, religion, marital_status, children_count, salary, new_or_experienced, medical_exam_date, musaned_status, internal_status, external_office_status, office_name, broker_name)
WHERE (SELECT id FROM external_offices WHERE office_name = v.office_name) IS NOT NULL
ON CONFLICT (passport_number) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- After running, check how many were inserted:
-- SELECT COUNT(*) FROM cvs;
--
-- If a row was skipped (duplicate passport or office not found),
-- no error — it's silently ignored (ON CONFLICT DO NOTHING).
-- To see which offices exist:
-- SELECT id, office_name FROM external_offices ORDER BY office_name;
-- ═══════════════════════════════════════════════════════════════════
