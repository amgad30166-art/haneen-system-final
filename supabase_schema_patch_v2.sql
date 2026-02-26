-- ═══════════════════════════════════════════════════════════════
-- HANEEN AL SHARQ — DB PATCH v2
-- Run this in Supabase Dashboard → SQL Editor
-- Fixes: external_office_balances view now correctly subtracts
--        EXTERNAL_COMMISSION_REVERSAL from the total owed to the
--        office (handles guarantee-period worker returns).
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW external_office_balances AS
SELECT
  eo.id,
  eo.office_name,
  eo.country,

  -- Gross owed (before any reversals)
  COALESCE(SUM(t.amount) FILTER (
    WHERE t.transaction_type = 'EXTERNAL_COMMISSION_PAYABLE' AND t.currency = 'USD'
  ), 0) AS gross_owed_usd,

  -- Reversals (commission returned due to guarantee / worker return)
  COALESCE(SUM(t.amount) FILTER (
    WHERE t.transaction_type = 'EXTERNAL_COMMISSION_REVERSAL' AND t.currency = 'USD'
  ), 0) AS total_reversal_usd,

  -- Net owed = gross - reversals
  COALESCE(SUM(t.amount) FILTER (
    WHERE t.transaction_type = 'EXTERNAL_COMMISSION_PAYABLE' AND t.currency = 'USD'
  ), 0)
  - COALESCE(SUM(t.amount) FILTER (
    WHERE t.transaction_type = 'EXTERNAL_COMMISSION_REVERSAL' AND t.currency = 'USD'
  ), 0) AS total_owed_usd,

  -- What we've actually paid the office (via external_accounts)
  COALESCE(SUM(ea.amount_usd), 0) AS total_paid_usd,

  -- Balance (positive = we still owe office | negative = office owes US)
  COALESCE(SUM(t.amount) FILTER (
    WHERE t.transaction_type = 'EXTERNAL_COMMISSION_PAYABLE' AND t.currency = 'USD'
  ), 0)
  - COALESCE(SUM(t.amount) FILTER (
    WHERE t.transaction_type = 'EXTERNAL_COMMISSION_REVERSAL' AND t.currency = 'USD'
  ), 0)
  - COALESCE(SUM(ea.amount_usd), 0) AS balance_usd,

  -- Balance in SAR
  (
    COALESCE(SUM(t.amount) FILTER (
      WHERE t.transaction_type = 'EXTERNAL_COMMISSION_PAYABLE' AND t.currency = 'USD'
    ), 0)
    - COALESCE(SUM(t.amount) FILTER (
      WHERE t.transaction_type = 'EXTERNAL_COMMISSION_REVERSAL' AND t.currency = 'USD'
    ), 0)
    - COALESCE(SUM(ea.amount_usd), 0)
  ) * 3.75 AS balance_sar

FROM external_offices eo
LEFT JOIN transactions t ON t.external_office_id = eo.id
LEFT JOIN external_accounts ea ON ea.external_office_id = eo.id
GROUP BY eo.id, eo.office_name, eo.country;
