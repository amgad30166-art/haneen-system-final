// ═══════════════════════════════════════════════════════════
// SYSTEM CONSTANTS — Haneen Al Sharq Recruitment
// ═══════════════════════════════════════════════════════════

export const USD_TO_SAR = 3.75;
export const AGENCY_FEE = 136;
export const TAX_RATE = 0.15;
export const GUARANTEE_DAYS = 90;
export const ETHIOPIA_MEDICAL_VALIDITY = 90;
export const OTHER_MEDICAL_VALIDITY = 60;
export const DELAYED_THRESHOLD = 30;
export const MIN_WORKER_AGE = 21;
export const MAX_WORKER_AGE = 45;
export const MUSANED_HOLD_DAYS = 5;
export const MUSANED_FEE_FIXED = 125.35;
export const MUSANED_FEE_PERCENT = 0.024;
export const WHATSAPP_NUMBER = "966502355630";
export const REFUND_DIVISION_MONTHS = 24;

export const PRIMARY_COLOR = "#1B2B6B";
export const HOVER_COLOR = "#0F1D4A";

export const NATIONALITIES = [
  { value: "ethiopia", label: "إثيوبيا", labelEn: "Ethiopia" },
  { value: "kenya", label: "كينيا", labelEn: "Kenya" },
  { value: "uganda", label: "أوغندا", labelEn: "Uganda" },
  { value: "philippines", label: "الفلبين", labelEn: "Philippines" },
  { value: "india", label: "الهند", labelEn: "India" },
] as const;

export const PROFESSIONS = [
  { value: "housemaid", label: "عاملة منزلية", labelEn: "Housemaid" },
  { value: "private_driver", label: "سائق خاص", labelEn: "Private Driver" },
] as const;

export const RELIGIONS = [
  { value: "muslim", label: "مسلم/مسلمة" },
  { value: "christian", label: "مسيحي/مسيحية" },
] as const;

export const ORDER_STATUSES = [
  { value: "selected", label: "تم الاختيار", color: "bg-blue-100 text-blue-800" },
  { value: "contracted", label: "تم التعاقد", color: "bg-indigo-100 text-indigo-800" },
  { value: "medical_exam", label: "بانتظار الفحص", color: "bg-yellow-100 text-yellow-800" },
  { value: "mol_approval", label: "بانتظار موافقة العمل", color: "bg-orange-100 text-orange-800" },
  { value: "needs_agency", label: "يحتاج وكالة", color: "bg-purple-100 text-purple-800" },
  { value: "agency_done", label: "تمت الوكالة", color: "bg-purple-100 text-purple-800" },
  { value: "embassy_submitted", label: "تم الإدخال للسفارة", color: "bg-cyan-100 text-cyan-800" },
  { value: "visa_issued", label: "تم إصدار الفيزا", color: "bg-teal-100 text-teal-800" },
  { value: "ticket_booked", label: "تم حجز التذكرة", color: "bg-green-100 text-green-800" },
  { value: "arrived", label: "تم الوصول", color: "bg-emerald-100 text-emerald-800" },
  { value: "cancelled", label: "ملغي", color: "bg-red-100 text-red-800" },
  { value: "runaway_within_90", label: "هروب خلال الضمان", color: "bg-red-100 text-red-800" },
  { value: "return_within_90", label: "إرجاع خلال الضمان", color: "bg-orange-100 text-orange-800" },
  { value: "runaway_after_90", label: "هروب بعد الضمان", color: "bg-gray-100 text-gray-600" },
  { value: "return_after_90", label: "إرجاع بعد الضمان", color: "bg-gray-100 text-gray-600" },
] as const;

export const FINANCIAL_STATUSES = [
  { value: "under_masaned_hold", label: "محجوز عند مساند" },
  { value: "funds_received", label: "تم استلام المبلغ" },
  { value: "cancelled_before_arrival", label: "ملغي قبل الوصول" },
  { value: "under_guarantee", label: "تحت الضمان" },
  { value: "refunded_during_guarantee", label: "مسترد خلال الضمان" },
  { value: "settled", label: "تمت التسوية" },
] as const;

export const MARITAL_STATUSES = [
  { value: "single", label: "عزباء" },
  { value: "married", label: "متزوجة" },
  { value: "divorced", label: "مطلقة" },
  { value: "widowed", label: "أرملة" },
] as const;

export const COMPANY_INFO = {
  nameAr: "حنين الشرق للاستقدام",
  nameEn: "Haneen Al Sharq Recruitment",
  location: "الرياض، حي النهضة، شارع سلمان الفارسي",
  phones: ["0502355630", "0530554514", "0558826167", "0535018898", "0556742038"],
  email: "Haneenalsharq11@gmail.com",
  whatsapp: "966502355630",
  workingHours: "يومياً من 4 عصراً إلى 9 مساءً عدا الجمعة | الجوال/واتساب 24 ساعة",
  website: "https://haneenalsharq.net",
  staff: [
    { name: "مها",   whatsapp: "966530554514" },
    { name: "آيات",  whatsapp: "966558826167" },
    { name: "أحمد",  whatsapp: "966535018898" },
    { name: "نوف",   whatsapp: "966556742038" },
  ],
} as const;
