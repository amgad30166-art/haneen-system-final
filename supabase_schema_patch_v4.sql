-- ═══════════════════════════════════════════════════════════
-- SCHEMA PATCH v4 — Status-Driven Financial Trigger System
-- Run this in Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════

-- A. Add 4 new order statuses
ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'runaway_within_90';
ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'return_within_90';
ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'runaway_after_90';
ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'return_after_90';

-- B. Add FORECAST transaction type
ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS 'EXTERNAL_COMMISSION_FORECAST';
