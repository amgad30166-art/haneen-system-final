// ═══════════════════════════════════════════════════════════
// TYPE DEFINITIONS — Haneen Al Sharq Recruitment System
// ═══════════════════════════════════════════════════════════

export type UserRole = "admin" | "data_entry" | "check_user" | "driver" | "owner";

export type Nationality = "ethiopia" | "kenya" | "uganda" | "philippines" | "india";
export type Profession = "housemaid" | "private_driver";
export type Religion = "muslim" | "christian";
export type MaritalStatus = "single" | "married" | "divorced" | "widowed";
export type MusanedUpload = "uploaded" | "not_uploaded";
export type ExternalOfficeStatus = "ready" | "cancel" | "not_available";
export type InternalStatus = "accepted" | "rejected";
export type WorkerExperience = "new" | "experienced";

export type OrderStatus =
  | "selected" | "contracted" | "medical_exam" | "mol_approval"
  | "needs_agency" | "agency_done" | "embassy_submitted"
  | "visa_issued" | "ticket_booked" | "arrived" | "cancelled"
  | "runaway_within_90" | "return_within_90" | "runaway_after_90" | "return_after_90";

export type OrderType = "by_specs" | "named_worker";
export type DeliveryMethod = "pickup_from_office" | "send_to_client";

export type FinancialStatus =
  | "under_masaned_hold" | "funds_received" | "cancelled_before_arrival"
  | "under_guarantee" | "refunded_during_guarantee" | "settled";

export type MusanedFeeType = "fixed_125_35" | "percent_2_4";
export type CancellationStatus = "none" | "within_5_days" | "after_5_days";

export type TransactionType =
  | "CONTRACT_REVENUE" | "MASANED_FEE" | "CLIENT_REFUND"
  | "EXTERNAL_COMMISSION_PAYABLE" | "EXTERNAL_COMMISSION_REVERSAL"
  | "AHMED_COMMISSION" | "WAJDI_COMMISSION" | "AGENCY_FEE"
  | "POOL_COMMISSION" | "SADAQA" | "OTHER_EXPENSE" | "MANUAL_ADJUSTMENT";

export type TransactionDirection = "IN" | "OUT";

export interface UserProfile {
  id: string;
  display_name: string;
  role: UserRole;
  created_at: string;
}

export interface ExternalOffice {
  id: string;
  office_name: string;
  type: "office" | "person";
  country: Nationality;
  code?: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CV {
  id: string;
  worker_name: string;
  passport_number: string;
  date_of_birth: string;
  religion: Religion;
  photo_url?: string;
  profile_photo?: string;
  video_url?: string;
  medical_exam_date: string;
  musaned_status: MusanedUpload;
  external_office_status: ExternalOfficeStatus;
  internal_status: InternalStatus;
  new_or_experienced: WorkerExperience;
  nationality: Nationality;
  profession: Profession;
  external_office_id: string;
  broker_name?: string;
  marital_status?: MaritalStatus;
  children_count?: number;
  salary: number;
  created_at: string;
  updated_at: string;
  // Joined
  external_offices?: ExternalOffice;
}

export interface Order {
  id: string;
  client_name: string;
  phone: string;
  date_of_birth?: string;
  national_id: string;
  visa_number?: string;
  nationality: Nationality;
  profession: Profession;
  passport_number?: string;
  worker_name?: string;
  external_office?: string;
  contract_number?: string;
  order_type: OrderType;
  contract_date?: string;
  order_status: OrderStatus;
  travel_date?: string;
  arrival_date?: string;
  return_date?: string;
  client_city?: string;
  delivery_method?: DeliveryMethod;
  notes?: string;
  delay_reason?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  contract_number: string;
  order_id?: string;
  client_name?: string;
  contract_date?: string;
  client_payment: number;
  musaned_fee_type: MusanedFeeType;
  musaned_fee_value: number;
  expected_from_musaned: number;
  actual_from_musaned?: number;
  musaned_transfer_date?: string;
  tax_base?: number;
  tax_15_percent?: number;
  external_commission_usd: number;
  external_commission_sar: number;
  ahmed_commission: number;
  wajdi_commission: number;
  agency_fee: number;
  pool_commission: number;
  sadaqa: number;
  other_expenses: number;
  total_expenses: number;
  approx_profit: number;
  cancellation_status: CancellationStatus;
  refund_amount?: number;
  refund_date?: string;
  cancellation_notes?: string;
  financial_status: FinancialStatus;
  guarantee_expiry?: string;
  closed_date?: string;
  magic_token: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  contract_id: string;
  transaction_type: TransactionType;
  direction: TransactionDirection;
  amount: number;
  currency: "SAR" | "USD";
  related_party: "client" | "musaned" | "external_office" | "internal";
  passport_number?: string;
  external_office_id?: string;
  notes?: string;
  created_at: string;
}

export interface ExternalAccount {
  id: string;
  external_office_id: string;
  payment_date: string;
  amount_usd: number;
  amount_sar: number;
  payment_type: "worker_payment" | "advance" | "settlement";
  payment_method: "bank_transfer" | "cash";
  description?: string;
  receipt_url?: string;
  created_at: string;
  external_offices?: ExternalOffice;
}
