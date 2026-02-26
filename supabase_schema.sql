-- ═══════════════════════════════════════════════════════════════
-- HANEEN AL SHARQ RECRUITMENT SYSTEM — DATABASE SCHEMA v4.0
-- Supabase (PostgreSQL) — Contract-Centric Ledger Architecture
-- ═══════════════════════════════════════════════════════════════

-- ── ENUMS ──────────────────────────────────────────────────────

CREATE TYPE nationality_enum AS ENUM ('ethiopia', 'kenya', 'uganda', 'philippines', 'india');
CREATE TYPE profession_enum AS ENUM ('housemaid', 'private_driver');
CREATE TYPE religion_enum AS ENUM ('muslim', 'christian');
CREATE TYPE marital_status_enum AS ENUM ('single', 'married', 'divorced', 'widowed');
CREATE TYPE musaned_upload_enum AS ENUM ('uploaded', 'not_uploaded');
CREATE TYPE external_office_status_enum AS ENUM ('ready', 'cancel', 'not_available');
CREATE TYPE internal_status_enum AS ENUM ('accepted', 'rejected');
CREATE TYPE worker_experience_enum AS ENUM ('new', 'experienced');

CREATE TYPE order_status_enum AS ENUM (
  'selected', 'contracted', 'medical_exam', 'mol_approval',
  'needs_agency', 'agency_done', 'embassy_submitted',
  'visa_issued', 'ticket_booked', 'arrived', 'cancelled'
);

CREATE TYPE order_type_enum AS ENUM ('by_specs', 'named_worker');
CREATE TYPE delivery_method_enum AS ENUM ('pickup_from_office', 'send_to_client');

CREATE TYPE financial_status_enum AS ENUM (
  'under_masaned_hold', 'funds_received', 'cancelled_before_arrival',
  'under_guarantee', 'refunded_during_guarantee', 'settled'
);

CREATE TYPE musaned_fee_type_enum AS ENUM ('fixed_125_35', 'percent_2_4');

CREATE TYPE cancellation_status_enum AS ENUM ('none', 'within_5_days', 'after_5_days');

CREATE TYPE transaction_type_enum AS ENUM (
  'CONTRACT_REVENUE', 'MASANED_FEE', 'CLIENT_REFUND',
  'EXTERNAL_COMMISSION_PAYABLE', 'EXTERNAL_COMMISSION_REVERSAL',
  'AHMED_COMMISSION', 'WAJDI_COMMISSION', 'AGENCY_FEE',
  'POOL_COMMISSION', 'SADAQA', 'OTHER_EXPENSE', 'MANUAL_ADJUSTMENT'
);

CREATE TYPE transaction_direction_enum AS ENUM ('IN', 'OUT');
CREATE TYPE transaction_currency_enum AS ENUM ('SAR', 'USD');
CREATE TYPE transaction_party_enum AS ENUM ('client', 'musaned', 'external_office', 'internal');

CREATE TYPE office_type_enum AS ENUM ('office', 'person');
CREATE TYPE payment_type_enum AS ENUM ('worker_payment', 'advance', 'settlement');
CREATE TYPE payment_method_enum AS ENUM ('bank_transfer', 'cash');

-- ── USER ROLES ─────────────────────────────────────────────────

CREATE TYPE user_role_enum AS ENUM ('admin', 'data_entry', 'check_user', 'driver', 'owner');

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role user_role_enum NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── EXTERNAL OFFICES (Master) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS external_offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_name TEXT UNIQUE NOT NULL,
  type office_type_enum NOT NULL DEFAULT 'office',
  country nationality_enum NOT NULL,
  code TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── WORKER CVs ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_name TEXT NOT NULL,
  passport_number TEXT UNIQUE NOT NULL,
  date_of_birth DATE NOT NULL,
  religion religion_enum NOT NULL,
  photo_url TEXT,
  video_url TEXT,
  medical_exam_date DATE NOT NULL,
  musaned_status musaned_upload_enum NOT NULL DEFAULT 'not_uploaded',
  external_office_status external_office_status_enum NOT NULL DEFAULT 'not_available',
  internal_status internal_status_enum NOT NULL DEFAULT 'rejected',
  new_or_experienced worker_experience_enum NOT NULL DEFAULT 'new',
  nationality nationality_enum NOT NULL,
  profession profession_enum NOT NULL,
  external_office_id UUID NOT NULL REFERENCES external_offices(id),
  broker_name TEXT,
  marital_status marital_status_enum,
  children_count INTEGER DEFAULT 0,
  salary NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Computed columns handled via views/functions
  CONSTRAINT valid_worker_age CHECK (
    date_of_birth <= CURRENT_DATE - INTERVAL '25 years'
    AND date_of_birth >= CURRENT_DATE - INTERVAL '45 years'
  ),
  CONSTRAINT valid_india_driver CHECK (
    NOT (nationality = 'india' AND profession != 'private_driver')
  )
);

CREATE INDEX idx_cvs_passport ON cvs(passport_number);
CREATE INDEX idx_cvs_nationality ON cvs(nationality);
CREATE INDEX idx_cvs_office ON cvs(external_office_id);

-- ── ORDERS ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_of_birth DATE,
  national_id TEXT NOT NULL,
  visa_number TEXT UNIQUE,
  nationality nationality_enum NOT NULL,
  profession profession_enum NOT NULL,
  passport_number TEXT REFERENCES cvs(passport_number),
  worker_name TEXT,
  external_office TEXT,
  contract_number TEXT UNIQUE,
  order_type order_type_enum NOT NULL,
  contract_date DATE,
  order_status order_status_enum NOT NULL DEFAULT 'selected',
  travel_date TIMESTAMPTZ,
  arrival_date TIMESTAMPTZ,
  return_date TIMESTAMPTZ,
  client_city TEXT,
  delivery_method delivery_method_enum,
  notes TEXT,
  delay_reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_contract ON orders(contract_number);
CREATE INDEX idx_orders_phone ON orders(phone);
CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_orders_passport ON orders(passport_number);
CREATE INDEX idx_orders_visa ON orders(visa_number);

-- ── CONTRACTS (Financial) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT UNIQUE NOT NULL,
  order_id UUID REFERENCES orders(id),
  client_name TEXT,
  contract_date DATE,
  client_payment NUMERIC(10,2) DEFAULT 0,
  musaned_fee_type musaned_fee_type_enum DEFAULT 'fixed_125_35',
  musaned_fee_value NUMERIC(10,2) DEFAULT 0,
  expected_from_musaned NUMERIC(10,2) DEFAULT 0,
  actual_from_musaned NUMERIC(10,2),
  musaned_transfer_date DATE,
  tax_base NUMERIC(10,2),
  tax_15_percent NUMERIC(10,2),
  external_commission_usd NUMERIC(10,2) DEFAULT 0,
  external_commission_sar NUMERIC(10,2) DEFAULT 0,
  ahmed_commission NUMERIC(10,2) DEFAULT 0,
  wajdi_commission NUMERIC(10,2) DEFAULT 0,
  agency_fee NUMERIC(10,2) DEFAULT 136,
  pool_commission NUMERIC(10,2) DEFAULT 0,
  sadaqa NUMERIC(10,2) DEFAULT 0,
  other_expenses NUMERIC(10,2) DEFAULT 0,
  total_expenses NUMERIC(10,2) DEFAULT 0,
  approx_profit NUMERIC(10,2) DEFAULT 0,
  cancellation_status cancellation_status_enum DEFAULT 'none',
  refund_amount NUMERIC(10,2),
  refund_date DATE,
  cancellation_notes TEXT,
  financial_status financial_status_enum DEFAULT 'under_masaned_hold',
  guarantee_expiry DATE,
  closed_date DATE,
  magic_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_contracts_token ON contracts(magic_token);
CREATE INDEX idx_contracts_number ON contracts(contract_number);
CREATE INDEX idx_contracts_status ON contracts(financial_status);

-- ── TRANSACTIONS (Ledger) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id),
  transaction_type transaction_type_enum NOT NULL,
  direction transaction_direction_enum NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency transaction_currency_enum NOT NULL DEFAULT 'SAR',
  related_party transaction_party_enum NOT NULL,
  passport_number TEXT,
  external_office_id UUID REFERENCES external_offices(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- IMMUTABILITY: No UPDATE or DELETE on transactions
CREATE INDEX idx_transactions_contract ON transactions(contract_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);

-- ── EXTERNAL ACCOUNTS (Payments to offices) ────────────────────

CREATE TABLE IF NOT EXISTS external_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_office_id UUID NOT NULL REFERENCES external_offices(id),
  payment_date DATE NOT NULL,
  amount_usd NUMERIC(10,2) NOT NULL,
  amount_sar NUMERIC(10,2) GENERATED ALWAYS AS (amount_usd * 3.75) STORED,
  payment_type payment_type_enum NOT NULL,
  payment_method payment_method_enum NOT NULL,
  description TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ext_accounts_office ON external_accounts(external_office_id);

-- ── SAUDI CITIES (Reference) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS saudi_cities (
  id SERIAL PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL
);

INSERT INTO saudi_cities (name_ar, name_en) VALUES
  ('الرياض', 'Riyadh'), ('جدة', 'Jeddah'), ('مكة المكرمة', 'Makkah'),
  ('المدينة المنورة', 'Madinah'), ('الدمام', 'Dammam'), ('الخبر', 'Khobar'),
  ('الظهران', 'Dhahran'), ('تبوك', 'Tabuk'), ('بريدة', 'Buraidah'),
  ('حائل', 'Hail'), ('أبها', 'Abha'), ('الطائف', 'Taif'),
  ('نجران', 'Najran'), ('جازان', 'Jazan'), ('ينبع', 'Yanbu'),
  ('خميس مشيط', 'Khamis Mushait'), ('القطيف', 'Qatif'), ('الجبيل', 'Jubail'),
  ('حفر الباطن', 'Hafar Al Batin'), ('الأحساء', 'Al Ahsa'),
  ('عرعر', 'Arar'), ('سكاكا', 'Sakaka'), ('القصيم', 'Qassim'),
  ('الباحة', 'Al Bahah'), ('بيشة', 'Bisha'), ('أخرى', 'Other');


-- ═══════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════

-- ── Auto-update updated_at ─────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_cvs_updated_at BEFORE UPDATE ON cvs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ext_offices_updated_at BEFORE UPDATE ON external_offices FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Auto-create contract when contract_number set on order ─────

CREATE OR REPLACE FUNCTION auto_create_contract()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_number IS NOT NULL AND OLD.contract_number IS NULL THEN
    INSERT INTO contracts (contract_number, order_id, client_name, contract_date)
    VALUES (NEW.contract_number, NEW.id, NEW.client_name, NEW.contract_date)
    ON CONFLICT (contract_number) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_create_contract
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.contract_number IS DISTINCT FROM OLD.contract_number)
  EXECUTE FUNCTION auto_create_contract();

-- Also handle INSERT with contract_number already set
CREATE OR REPLACE FUNCTION auto_create_contract_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_number IS NOT NULL THEN
    INSERT INTO contracts (contract_number, order_id, client_name, contract_date)
    VALUES (NEW.contract_number, NEW.id, NEW.client_name, NEW.contract_date)
    ON CONFLICT (contract_number) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_create_contract_insert
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_contract_on_insert();

-- ── Auto-calculate contract fields ─────────────────────────────

CREATE OR REPLACE FUNCTION calc_contract_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Musaned fee
  IF NEW.musaned_fee_type = 'fixed_125_35' THEN
    NEW.musaned_fee_value := 125.35;
  ELSIF NEW.musaned_fee_type = 'percent_2_4' THEN
    NEW.musaned_fee_value := ROUND(NEW.client_payment * 0.024, 2);
  END IF;

  -- Expected from Musaned
  NEW.expected_from_musaned := NEW.client_payment - COALESCE(NEW.musaned_fee_value, 0);

  -- Tax
  NEW.tax_15_percent := ROUND(COALESCE(NEW.tax_base, 0) * 0.15, 2);

  -- External commission SAR
  NEW.external_commission_sar := ROUND(COALESCE(NEW.external_commission_usd, 0) * 3.75, 2);

  -- Total expenses
  NEW.total_expenses := COALESCE(NEW.tax_15_percent, 0)
    + COALESCE(NEW.external_commission_sar, 0)
    + COALESCE(NEW.ahmed_commission, 0)
    + COALESCE(NEW.wajdi_commission, 0)
    + COALESCE(NEW.agency_fee, 136)
    + COALESCE(NEW.pool_commission, 0)
    + COALESCE(NEW.sadaqa, 0)
    + COALESCE(NEW.other_expenses, 0);

  -- Approx profit (REFERENCE ONLY)
  NEW.approx_profit := COALESCE(NEW.actual_from_musaned, NEW.expected_from_musaned, 0) - NEW.total_expenses;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calc_contract
  BEFORE INSERT OR UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION calc_contract_fields();

-- ── Auto guarantee expiry on arrival ───────────────────────────

CREATE OR REPLACE FUNCTION set_guarantee_on_arrival()
RETURNS TRIGGER AS $$
DECLARE
  v_contract contracts%ROWTYPE;
BEGIN
  IF NEW.order_status = 'arrived' AND OLD.order_status != 'arrived' AND NEW.arrival_date IS NOT NULL THEN
    -- 90 days for ALL nationalities
    UPDATE contracts
    SET guarantee_expiry = (NEW.arrival_date + INTERVAL '90 days')::DATE,
        financial_status = 'under_guarantee'
    WHERE contract_number = NEW.contract_number;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_guarantee_on_arrival
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_guarantee_on_arrival();

-- ── Prevent transaction edits/deletes ──────────────────────────

CREATE OR REPLACE FUNCTION prevent_transaction_modify()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Transactions are immutable. Cannot % ledger records.', TG_OP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_no_update_transactions
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_transaction_modify();

CREATE TRIGGER trg_no_delete_transactions
  BEFORE DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_transaction_modify();

-- ═══════════════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════════════

-- ── CV Availability View ───────────────────────────────────────

CREATE OR REPLACE VIEW available_workers AS
SELECT
  c.*,
  eo.office_name AS office_name,
  -- Medical expiry calculation
  CASE
    WHEN c.nationality = 'ethiopia' THEN c.medical_exam_date + INTERVAL '90 days'
    ELSE c.medical_exam_date + INTERVAL '60 days'
  END AS medical_expiry,
  -- Medical status
  CASE
    WHEN c.nationality = 'ethiopia' AND (c.medical_exam_date + INTERVAL '90 days') >= CURRENT_DATE THEN 'FIT'
    WHEN c.nationality != 'ethiopia' AND (c.medical_exam_date + INTERVAL '60 days') >= CURRENT_DATE THEN 'FIT'
    ELSE 'EXPIRED'
  END AS medical_status,
  -- Worker age
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, c.date_of_birth))::INTEGER AS worker_age,
  -- Availability check
  CASE
    WHEN c.nationality = 'ethiopia' THEN
      CASE WHEN
        (c.medical_exam_date + INTERVAL '90 days') >= CURRENT_DATE
        AND c.musaned_status = 'uploaded'
        AND c.external_office_status = 'ready'
        AND c.internal_status = 'accepted'
        AND NOT EXISTS (
          SELECT 1 FROM orders o
          WHERE o.passport_number = c.passport_number
          AND o.order_status NOT IN ('cancelled', 'arrived')
        )
      THEN 'available' ELSE 'not_available' END
    ELSE
      CASE WHEN
        c.musaned_status = 'uploaded'
        AND c.external_office_status = 'ready'
        AND c.internal_status = 'accepted'
        AND NOT EXISTS (
          SELECT 1 FROM orders o
          WHERE o.passport_number = c.passport_number
          AND o.order_status NOT IN ('cancelled', 'arrived')
        )
      THEN 'available' ELSE 'not_available' END
  END AS availability
FROM cvs c
LEFT JOIN external_offices eo ON c.external_office_id = eo.id;

-- ── Contract Profit View (from Ledger) ─────────────────────────

CREATE OR REPLACE VIEW contract_profit AS
SELECT
  c.id,
  c.contract_number,
  c.client_name,
  c.contract_date,
  c.financial_status,
  c.closed_date,
  c.client_payment,
  c.expected_from_musaned,
  c.total_expenses,
  COALESCE(SUM(CASE WHEN t.direction = 'IN' THEN t.amount ELSE 0 END), 0) AS total_in,
  COALESCE(SUM(CASE WHEN t.direction = 'OUT' THEN t.amount ELSE 0 END), 0) AS total_out,
  COALESCE(SUM(CASE WHEN t.direction = 'IN' THEN t.amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN t.direction = 'OUT' THEN t.amount ELSE 0 END), 0) AS ledger_profit
FROM contracts c
LEFT JOIN transactions t ON t.contract_id = c.id
GROUP BY c.id, c.contract_number, c.client_name, c.contract_date,
         c.financial_status, c.closed_date, c.client_payment,
         c.expected_from_musaned, c.total_expenses;

-- ── External Office Balance View ───────────────────────────────

CREATE OR REPLACE VIEW external_office_balances AS
SELECT
  eo.id,
  eo.office_name,
  eo.country,
  COALESCE(SUM(t.amount) FILTER (
    WHERE t.transaction_type = 'EXTERNAL_COMMISSION_PAYABLE' AND t.currency = 'USD'
  ), 0) AS total_owed_usd,
  COALESCE(SUM(ea.amount_usd), 0) AS total_paid_usd,
  COALESCE(SUM(t.amount) FILTER (
    WHERE t.transaction_type = 'EXTERNAL_COMMISSION_PAYABLE' AND t.currency = 'USD'
  ), 0) - COALESCE(SUM(ea.amount_usd), 0) AS balance_usd,
  (COALESCE(SUM(t.amount) FILTER (
    WHERE t.transaction_type = 'EXTERNAL_COMMISSION_PAYABLE' AND t.currency = 'USD'
  ), 0) - COALESCE(SUM(ea.amount_usd), 0)) * 3.75 AS balance_sar
FROM external_offices eo
LEFT JOIN transactions t ON t.external_office_id = eo.id
LEFT JOIN external_accounts ea ON ea.external_office_id = eo.id
GROUP BY eo.id, eo.office_name, eo.country;

-- ── Delayed Contracts View ─────────────────────────────────────

CREATE OR REPLACE VIEW delayed_contracts AS
SELECT
  o.*,
  c.financial_status,
  c.contract_number AS cn,
  CURRENT_DATE - o.contract_date AS days_since_contract
FROM orders o
LEFT JOIN contracts c ON c.contract_number = o.contract_number
WHERE o.contract_date IS NOT NULL
  AND o.order_status NOT IN ('arrived', 'cancelled')
  AND (CURRENT_DATE - o.contract_date) > 30;

-- ── Client Tracking View (for magic token) ─────────────────────

CREATE OR REPLACE VIEW client_tracking AS
SELECT
  c.magic_token,
  c.contract_number,
  c.client_name,
  c.contract_date,
  c.financial_status,
  c.guarantee_expiry,
  o.order_status,
  o.arrival_date,
  o.travel_date,
  o.delay_reason,
  o.nationality,
  CURRENT_DATE - c.contract_date AS days_since_contract,
  CASE
    WHEN o.order_status = 'arrived' THEN
      GREATEST(0, 90 - (CURRENT_DATE - o.arrival_date::DATE)) 
    ELSE NULL
  END AS guarantee_days_remaining
FROM contracts c
LEFT JOIN orders o ON o.contract_number = c.contract_number;


-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_cities ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role_enum AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Policies: Admin (Ahmed) = full access ──────────────────────

-- Orders
CREATE POLICY "admin_all_orders" ON orders FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "data_entry_read_orders" ON orders FOR SELECT
  USING (get_user_role() = 'data_entry');

CREATE POLICY "data_entry_insert_orders" ON orders FOR INSERT
  WITH CHECK (get_user_role() = 'data_entry');

CREATE POLICY "owner_read_orders" ON orders FOR SELECT
  USING (get_user_role() = 'owner');

CREATE POLICY "check_read_orders" ON orders FOR SELECT
  USING (get_user_role() = 'check_user');

CREATE POLICY "driver_read_orders" ON orders FOR SELECT
  USING (get_user_role() = 'driver');

-- Contracts
CREATE POLICY "admin_all_contracts" ON contracts FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "owner_read_contracts" ON contracts FOR SELECT
  USING (get_user_role() = 'owner');

-- CVs
CREATE POLICY "admin_all_cvs" ON cvs FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "data_entry_read_cvs" ON cvs FOR SELECT
  USING (get_user_role() = 'data_entry');

CREATE POLICY "owner_read_cvs" ON cvs FOR SELECT
  USING (get_user_role() = 'owner');

-- Transactions (immutable — insert only for admin)
CREATE POLICY "admin_all_transactions" ON transactions FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "owner_read_transactions" ON transactions FOR SELECT
  USING (get_user_role() = 'owner');

-- External Offices
CREATE POLICY "admin_all_ext_offices" ON external_offices FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "data_entry_read_ext_offices" ON external_offices FOR SELECT
  USING (get_user_role() IN ('data_entry', 'owner'));

-- External Accounts
CREATE POLICY "admin_all_ext_accounts" ON external_accounts FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "owner_read_ext_accounts" ON external_accounts FOR SELECT
  USING (get_user_role() = 'owner');

-- User Profiles
CREATE POLICY "users_read_own_profile" ON user_profiles FOR SELECT
  USING (id = auth.uid() OR get_user_role() = 'admin');

-- Saudi Cities — readable by all authenticated
CREATE POLICY "all_read_cities" ON saudi_cities FOR SELECT
  USING (true);

-- ── Public access for tracking (anonymous) ─────────────────────

-- Allow anon to read tracking view via magic_token
-- We handle this through a Supabase function instead

CREATE OR REPLACE FUNCTION get_tracking_info(p_token UUID)
RETURNS TABLE (
  contract_number TEXT,
  client_name TEXT,
  contract_date DATE,
  order_status order_status_enum,
  arrival_date TIMESTAMPTZ,
  travel_date TIMESTAMPTZ,
  delay_reason TEXT,
  nationality nationality_enum,
  days_since_contract INTEGER,
  guarantee_days_remaining INTEGER,
  financial_status financial_status_enum,
  guarantee_expiry DATE
) AS $$
  SELECT
    ct.contract_number, ct.client_name, ct.contract_date,
    ct.order_status, ct.arrival_date, ct.travel_date,
    ct.delay_reason, ct.nationality,
    ct.days_since_contract::INTEGER,
    ct.guarantee_days_remaining::INTEGER,
    ct.financial_status, ct.guarantee_expiry
  FROM client_tracking ct
  WHERE ct.magic_token = p_token;
$$ LANGUAGE sql SECURITY DEFINER;

-- ── Public access for available workers ────────────────────────

CREATE OR REPLACE FUNCTION get_available_workers()
RETURNS TABLE (
  worker_name TEXT,
  passport_number TEXT,
  date_of_birth DATE,
  religion religion_enum,
  photo_url TEXT,
  video_url TEXT,
  nationality nationality_enum,
  profession profession_enum,
  new_or_experienced worker_experience_enum,
  marital_status marital_status_enum,
  children_count INTEGER,
  salary NUMERIC,
  worker_age INTEGER
) AS $$
  SELECT
    aw.worker_name, aw.passport_number, aw.date_of_birth,
    aw.religion, aw.photo_url, aw.video_url,
    aw.nationality, aw.profession, aw.new_or_experienced,
    aw.marital_status, aw.children_count, aw.salary,
    aw.worker_age
  FROM available_workers aw
  WHERE aw.availability = 'available';
$$ LANGUAGE sql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════════
-- STORAGE BUCKET FOR WORKER PHOTOS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public) VALUES ('worker-photos', 'worker-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "auth_upload_photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'worker-photos' AND auth.role() = 'authenticated');

CREATE POLICY "auth_update_photos" ON storage.objects FOR UPDATE
  USING (bucket_id = 'worker-photos' AND auth.role() = 'authenticated');

CREATE POLICY "public_read_photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'worker-photos');


-- ═══════════════════════════════════════════════════════════════
-- DONE ✅
-- ═══════════════════════════════════════════════════════════════
