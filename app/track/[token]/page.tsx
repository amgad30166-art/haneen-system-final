"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle, Clock, Plane, AlertCircle, Phone,
  MessageCircle, MapPin, Shield, Home,
} from "lucide-react";
import { NATIONALITIES, COMPANY_INFO } from "@/lib/constants";

interface TrackingInfo {
  contract_number: string;
  client_name: string;
  contract_date: string;
  order_status: string;
  arrival_date?: string;
  travel_date?: string;
  delay_reason?: string;
  nationality: string;
  days_since_contract: number;
  guarantee_days_remaining?: number;
  financial_status: string;
  guarantee_expiry?: string;
}

// All steps in order with their order_status values
const STEPS = [
  { key: "selected", label: "تم الاختيار", icon: "✓" },
  { key: "contracted", label: "تم التعاقد", icon: "📄" },
  { key: "medical_exam", label: "الفحص الطبي", icon: "🏥" },
  { key: "mol_approval", label: "موافقة العمل", icon: "🏛️" },
  { key: "needs_agency", label: "الوكالة", icon: "📋" },
  { key: "embassy_submitted", label: "السفارة", icon: "🏢" },
  { key: "visa_issued", label: "إصدار الفيزا", icon: "🛂" },
  { key: "ticket_booked", label: "حجز التذكرة", icon: "🎫" },
  { key: "arrived", label: "الوصول", icon: "🏠" },
] as const;

const STATUS_ORDER = STEPS.map((s) => s.key);

function getStepIndex(status: string) {
  const idx = STATUS_ORDER.indexOf(status as any);
  return idx >= 0 ? idx : 0;
}

function getSmartMessage(info: TrackingInfo): { text: string; color: string; icon: React.ReactNode } {
  const { order_status, days_since_contract, arrival_date, guarantee_days_remaining, financial_status } = info;

  if (order_status === "cancelled") {
    return {
      text: "تم إلغاء هذا الطلب. يرجى التواصل مع المكتب لمعرفة التفاصيل.",
      color: "text-red-600",
      icon: <AlertCircle size={20} className="text-red-600 shrink-0" />,
    };
  }

  if (order_status === "arrived") {
    if (guarantee_days_remaining && guarantee_days_remaining > 0) {
      return {
        text: `تم الوصول بنجاح! متبقي ${guarantee_days_remaining} يوم من فترة الضمان.`,
        color: "text-emerald-600",
        icon: <Shield size={20} className="text-emerald-600 shrink-0" />,
      };
    }
    return {
      text: "تم الوصول وانتهت فترة الضمان. نتمنى لكم التوفيق.",
      color: "text-emerald-600",
      icon: <CheckCircle size={20} className="text-emerald-600 shrink-0" />,
    };
  }

  if (order_status === "ticket_booked") {
    return {
      text: "تم حجز التذكرة! العاملة في طريقها إليكم قريباً.",
      color: "text-green-600",
      icon: <Plane size={20} className="text-green-600 shrink-0" />,
    };
  }

  if (days_since_contract > 45 && info.delay_reason) {
    return {
      text: `طلبكم يشهد تأخيراً نأسف لذلك. السبب: ${info.delay_reason}`,
      color: "text-orange-600",
      icon: <Clock size={20} className="text-orange-600 shrink-0" />,
    };
  }

  if (days_since_contract > 45) {
    return {
      text: "مضى أكثر من 45 يوماً على تقديم الطلب. نعمل بجد لإتمام إجراءاتكم في أقرب وقت.",
      color: "text-orange-600",
      icon: <Clock size={20} className="text-orange-600 shrink-0" />,
    };
  }

  if (order_status === "visa_issued") {
    return {
      text: "تم إصدار الفيزا بنجاح! نحن الآن بمرحلة حجز التذكرة.",
      color: "text-teal-600",
      icon: <CheckCircle size={20} className="text-teal-600 shrink-0" />,
    };
  }

  if (["medical_exam", "mol_approval", "needs_agency", "agency_done"].includes(order_status)) {
    return {
      text: "الطلب قيد المعالجة. الإجراءات تسير بشكل طبيعي.",
      color: "text-blue-600",
      icon: <Clock size={20} className="text-blue-600 shrink-0" />,
    };
  }

  return {
    text: "طلبكم قيد التنفيذ. سنُحدثكم عند كل مستجد.",
    color: "text-navy-500",
    icon: <Clock size={20} className="text-navy-500 shrink-0" />,
  };
}

export default function TrackingPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (token) fetchTracking(token);
  }, [token]);

  async function fetchTracking(t: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_tracking_info", { p_token: t });
      if (error || !data || data.length === 0) {
        setNotFound(true);
      } else {
        setInfo(data[0]);
      }
    } catch {
      setNotFound(true);
    }
    setLoading(false);
  }

  // ── Not Found ──────────────────────────────────────────────
  if (!loading && notFound) {
    return (
      <div
        className="min-h-screen bg-gradient-to-b from-navy-500 to-navy-700 flex items-center justify-center p-4 font-cairo"
        dir="rtl"
      >
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={36} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-navy-500 mb-2">رمز غير صحيح</h2>
          <p className="text-gray-500 mb-6">
            لم يتم العثور على طلب مرتبط بهذا الرمز. تأكد من صحة الرابط أو تواصل مع المكتب.
          </p>
          <a
            href={`https://wa.me/${COMPANY_INFO.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-600 transition-colors"
          >
            <MessageCircle size={18} />
            تواصل عبر واتساب
          </a>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="min-h-screen bg-gradient-to-b from-navy-500 to-navy-700 flex items-center justify-center font-cairo"
        dir="rtl"
      >
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-bold">جاري التحقق من طلبكم...</p>
        </div>
      </div>
    );
  }

  if (!info) return null;

  const currentStep = getStepIndex(info.order_status);
  const totalSteps = STEPS.length - 1;
  const progressPct = info.order_status === "cancelled" ? 0 : Math.round((currentStep / totalSteps) * 100);
  const smartMsg = getSmartMessage(info);
  const natLabel = NATIONALITIES.find((n) => n.value === info.nationality)?.label ?? info.nationality;
  const isCancelled = info.order_status === "cancelled";
  const isArrived = info.order_status === "arrived";

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-navy-500 via-navy-600 to-navy-700 font-cairo py-8 px-4"
      dir="rtl"
    >
      <div className="max-w-lg mx-auto">
        {/* ── Logo Header ────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <img src="/logo.png" alt="" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-white font-bold text-xl">حنين الشرق للاستقدام</h1>
          <p className="text-navy-200 text-sm">تتبع طلبك</p>
        </div>

        {/* ── Main Card ──────────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Card header */}
          <div
            className={`px-6 py-5 ${
              isCancelled
                ? "bg-red-50"
                : isArrived
                ? "bg-emerald-50"
                : "bg-navy-50"
            }`}
          >
            <p className="text-xs text-gray-500 font-bold mb-1">رقم العقد</p>
            <p className="text-2xl font-bold text-navy-500">{info.contract_number}</p>
            <p className="text-gray-600 mt-1">{info.client_name}</p>
            {info.contract_date && (
              <p className="text-xs text-gray-400 mt-1">
                تاريخ العقد: {new Date(info.contract_date).toLocaleDateString("en-US")}
                {" · "}
                منذ {info.days_since_contract} يوم
              </p>
            )}
          </div>

          <div className="p-6">
            {/* ── Smart Message ─────────────────────────────── */}
            <div
              className={`flex items-start gap-3 p-4 rounded-2xl mb-6 ${
                isCancelled
                  ? "bg-red-50 border border-red-100"
                  : isArrived
                  ? "bg-emerald-50 border border-emerald-100"
                  : info.days_since_contract > 45
                  ? "bg-orange-50 border border-orange-100"
                  : "bg-blue-50 border border-blue-100"
              }`}
            >
              {smartMsg.icon}
              <p className={`text-sm font-bold leading-relaxed ${smartMsg.color}`}>
                {smartMsg.text}
              </p>
            </div>

            {/* ── Delay Reason (if >45 days and has reason) ──── */}
            {info.days_since_contract > 45 && info.delay_reason && !isArrived && !isCancelled && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6">
                <p className="text-xs font-bold text-orange-600 mb-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  سبب التأخير
                </p>
                <p className="text-sm text-orange-700">{info.delay_reason}</p>
              </div>
            )}

            {/* ── Progress Bar ──────────────────────────────── */}
            {!isCancelled && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-gray-500">التقدم</span>
                  <span className="text-xs font-bold text-navy-500">{progressPct}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-1000 ${
                      isArrived ? "bg-emerald-500" : "bg-navy-500"
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* ── Steps ─────────────────────────────────────── */}
            {!isCancelled && (
              <div className="mb-6">
                <p className="text-xs font-bold text-gray-500 mb-3">مراحل الطلب</p>
                <div className="space-y-2">
                  {STEPS.map((step, i) => {
                    const isDone = i <= currentStep;
                    const isCurrent = i === currentStep;
                    return (
                      <div
                        key={step.key}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                          isCurrent
                            ? "bg-navy-50 border border-navy-200"
                            : isDone
                            ? "bg-gray-50"
                            : ""
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 transition-all ${
                            isDone
                              ? isCurrent
                                ? "bg-navy-500 text-white shadow-lg ring-4 ring-navy-100"
                                : "bg-emerald-100 text-emerald-600"
                              : "bg-gray-100 text-gray-300"
                          }`}
                        >
                          {isDone && !isCurrent ? "✓" : step.icon}
                        </div>
                        <span
                          className={`text-sm font-bold ${
                            isCurrent
                              ? "text-navy-500"
                              : isDone
                              ? "text-emerald-600"
                              : "text-gray-300"
                          }`}
                        >
                          {step.label}
                        </span>
                        {isCurrent && (
                          <span className="mr-auto text-xs bg-navy-100 text-navy-600 px-2 py-0.5 rounded-full font-bold">
                            الحالة الحالية
                          </span>
                        )}
                        {isDone && !isCurrent && i < currentStep && (
                          <CheckCircle size={14} className="text-emerald-500 mr-auto" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Arrival & Guarantee Info ───────────────────── */}
            {isArrived && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                  <Home size={20} className="text-emerald-600 mx-auto mb-1" />
                  <p className="text-xs font-bold text-gray-500 mb-1">تاريخ الوصول</p>
                  <p className="text-sm font-bold text-emerald-600">
                    {info.arrival_date
                      ? new Date(info.arrival_date).toLocaleDateString("en-US")
                      : "—"}
                  </p>
                </div>
                <div
                  className={`rounded-2xl p-4 text-center ${
                    (info.guarantee_days_remaining ?? 0) > 0
                      ? "bg-orange-50"
                      : "bg-gray-50"
                  }`}
                >
                  <Shield
                    size={20}
                    className={`mx-auto mb-1 ${
                      (info.guarantee_days_remaining ?? 0) > 0
                        ? "text-orange-600"
                        : "text-gray-400"
                    }`}
                  />
                  <p className="text-xs font-bold text-gray-500 mb-1">الضمان المتبقي</p>
                  <p
                    className={`text-sm font-bold ${
                      (info.guarantee_days_remaining ?? 0) > 0
                        ? "text-orange-600"
                        : "text-gray-400"
                    }`}
                  >
                    {(info.guarantee_days_remaining ?? 0) > 0
                      ? `${info.guarantee_days_remaining} يوم`
                      : "انتهى"}
                  </p>
                </div>
              </div>
            )}

            {/* ── Nationality tag ────────────────────────────── */}
            <div className="flex items-center gap-2 mb-6 p-3 bg-gray-50 rounded-xl">
              <MapPin size={14} className="text-gray-400" />
              <span className="text-sm text-gray-600">الجنسية: <strong>{natLabel}</strong></span>
            </div>

            {/* ── Contact Buttons ────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={`https://wa.me/${COMPANY_INFO.whatsapp}?text=${encodeURIComponent(`استفسار عن العقد رقم ${info.contract_number}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm transition-colors"
              >
                <MessageCircle size={16} />
                واتساب
              </a>
              <a
                href={`tel:${COMPANY_INFO.phones[0]}`}
                className="flex items-center justify-center gap-2 bg-navy-500 hover:bg-navy-600 text-white py-3 rounded-xl font-bold text-sm transition-colors"
              >
                <Phone size={16} />
                اتصال
              </a>
            </div>
          </div>
        </div>

        {/* ── Footer info ─────────────────────────────────────── */}
        <div className="text-center mt-6 text-navy-200 text-xs">
          <p className="font-bold mb-1">{COMPANY_INFO.nameAr}</p>
          <p>{COMPANY_INFO.location}</p>
          <p className="mt-1">{COMPANY_INFO.workingHours}</p>
        </div>
      </div>
    </div>
  );
}
