"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import AuthLayout from "@/components/ui/AuthLayout";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { useRouter, useParams } from "next/navigation";
import { NATIONALITIES, PROFESSIONS, ORDER_STATUSES, GUARANTEE_DAYS } from "@/lib/constants";
import { Order } from "@/lib/types";
import { toast } from "sonner";
import { Save, ArrowRight, Copy, Search, UserCheck, X, RotateCcw } from "lucide-react";

// Post-arrival statuses — only visible in dropdown when arrival_date exists
const POST_ARRIVAL_VALUES = new Set(["runaway_within_90", "return_within_90", "runaway_after_90", "return_after_90"]);

export default function OrderDetailPage() {
  const { id } = useParams();
  const supabase = createClient();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cities, setCities] = useState<{ name_ar: string }[]>([]);
  const [trackingUrl, setTrackingUrl] = useState("");
  const [passportSearch, setPassportSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [financialModal, setFinancialModal] = useState<
    null | "cancel_check" | "cancel_after_5" | "guarantee_event"
  >(null);
  const [refundInput, setRefundInput] = useState("");
  const [modalProcessing, setModalProcessing] = useState(false);
  const statusBeforeSave = useRef<string>("");
  const pendingOrderForModal = useRef<Order | null>(null);

  useEffect(() => {
    fetchOrder();
    fetchCities();
  }, [id]);

  async function fetchCities() {
    const { data } = await supabase.from("saudi_cities").select("name_ar").order("id");
    if (data) setCities(data);
  }

  async function fetchOrder() {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setOrder(data);
      if (data.contract_number) {
        const { data: contract } = await supabase
          .from("contracts")
          .select("magic_token")
          .eq("contract_number", data.contract_number)
          .single();
        if (contract?.magic_token) {
          setTrackingUrl(`${window.location.origin}/track/${contract.magic_token}`);
        }
      }
    }
    setLoading(false);
  }

  async function searchWorker() {
    if (!passportSearch.trim()) { toast.error("أدخل رقم الجواز"); return; }
    setSearching(true);

    const { data, error } = await supabase
      .from("cvs")
      .select("*, external_offices(office_name)")
      .eq("passport_number", passportSearch.trim())
      .single();

    if (error || !data) {
      toast.error("لم يتم العثور على عاملة بهذا الجواز");
      setSearching(false);
      return;
    }

    const { count } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("passport_number", data.passport_number)
      .not("order_status", "in", '("arrived","cancelled")')
      .neq("id", id as string);

    if (count && count > 0) {
      toast.error("هذه العاملة مرتبطة بطلب نشط بالفعل");
      setSearching(false);
      return;
    }

    update("passport_number", data.passport_number);
    update("worker_name", data.worker_name);
    update("external_office", data.external_offices?.office_name || "");
    setPassportSearch("");
    toast.success(`تم تغيير العاملة إلى: ${data.worker_name}`);
    setSearching(false);
  }

  async function handleSave() {
    if (!order) return;
    statusBeforeSave.current = order.order_status;

    if (order.order_status === "ticket_booked") {
      if (!order.travel_date) {
        toast.error("يجب إدخال تاريخ المغادرة عند تغيير الحالة إلى (تم حجز التذكرة)");
        return;
      }
      if (!order.arrival_date) {
        toast.error("يجب إدخال تاريخ الوصول المتوقع عند تغيير الحالة إلى (تم حجز التذكرة)");
        return;
      }
    }

    setSaving(true);

    if (order.visa_number) {
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("visa_number", order.visa_number)
        .neq("id", order.id);

      if (count && count > 0) {
        toast.error("رقم التأشيرة مستخدم بالفعل");
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from("orders")
      .update({
        client_name: order.client_name,
        phone: order.phone,
        date_of_birth: order.date_of_birth || null,
        national_id: order.national_id,
        visa_number: order.visa_number || null,
        nationality: order.nationality,
        profession: order.profession,
        passport_number: order.passport_number || null,
        worker_name: order.worker_name || null,
        external_office: order.external_office || null,
        contract_number: order.contract_number || null,
        order_type: order.order_type,
        contract_date: order.contract_date || null,
        order_status: order.order_status,
        travel_date: order.travel_date || null,
        arrival_date: order.arrival_date || null,
        return_date: order.return_date || null,
        client_city: order.client_city || null,
        delivery_method: order.delivery_method || null,
        notes: order.notes || null,
        delay_reason: order.delay_reason || null,
      })
      .eq("id", order.id);

    if (error) {
      toast.error("خطأ: " + error.message);
      setSaving(false);
      return;
    }

    toast.success("تم حفظ التعديلات");
    const oldStatus = statusBeforeSave.current;
    const newStatus = order.order_status;

    if (oldStatus !== "contracted" && newStatus === "contracted") {
      await handleContractIssuedAutomation(order);
      fetchOrder();
    } else if (oldStatus !== "arrived" && newStatus === "arrived") {
      await handleArrivalAutomation(order);
      fetchOrder();
    } else if (newStatus === "cancelled") {
      pendingOrderForModal.current = order;
      setFinancialModal("cancel_check");
      // fetchOrder() called after modal closes
    } else if (newStatus === "runaway_within_90" || newStatus === "return_within_90") {
      pendingOrderForModal.current = order;
      setRefundInput("");
      setFinancialModal("guarantee_event");
      // fetchOrder() called after modal closes
    } else {
      fetchOrder();
    }

    setSaving(false);
  }

  async function handleContractIssuedAutomation(savedOrder: Order) {
    if (!savedOrder.contract_number) return;

    const { data: contract } = await supabase
      .from("contracts")
      .select("id, external_commission_usd")
      .eq("contract_number", savedOrder.contract_number)
      .single();

    if (!contract) return;

    // Idempotency: skip if FORECAST (OUT) already exists
    const { count: existing } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("contract_id", contract.id)
      .eq("transaction_type", "EXTERNAL_COMMISSION_FORECAST")
      .eq("direction", "OUT");

    if (existing && existing > 0) return;

    if ((contract.external_commission_usd ?? 0) > 0) {
      const externalOfficeId = await getExternalOfficeId(savedOrder.passport_number);
      await supabase.from("transactions").insert({
        contract_id: contract.id,
        transaction_type: "EXTERNAL_COMMISSION_FORECAST",
        direction: "OUT",
        amount: contract.external_commission_usd,
        currency: "USD",
        related_party: "external_office",
        external_office_id: externalOfficeId,
        passport_number: savedOrder.passport_number || null,
        notes: `توقع عمولة مكتب خارجي — إصدار العقد${savedOrder.worker_name ? " — " + savedOrder.worker_name : ""}`,
      });
      toast.success("تم إنشاء توقع العمولة للمكتب الخارجي");
    }
  }

  async function handleArrivalAutomation(savedOrder: Order) {
    if (!savedOrder.contract_number) return;

    const { data: contract } = await supabase
      .from("contracts")
      .select("id, external_commission_usd, financial_status")
      .eq("contract_number", savedOrder.contract_number)
      .single();

    if (!contract) return;

    // Idempotency: skip if commission already recorded
    const { count: existing } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("contract_id", contract.id)
      .eq("transaction_type", "EXTERNAL_COMMISSION_PAYABLE");

    if (existing && existing > 0) return;

    const externalOfficeId = await getExternalOfficeId(savedOrder.passport_number);

    if ((contract.external_commission_usd ?? 0) > 0) {
      await supabase.from("transactions").insert({
        contract_id: contract.id,
        transaction_type: "EXTERNAL_COMMISSION_PAYABLE",
        direction: "OUT",
        amount: contract.external_commission_usd,
        currency: "USD",
        related_party: "external_office",
        external_office_id: externalOfficeId,
        passport_number: savedOrder.passport_number || null,
        notes: `عمولة مكتب خارجي — وصول العاملة${savedOrder.worker_name ? " — " + savedOrder.worker_name : ""}`,
      });
    }

    const guaranteeExpiry = savedOrder.arrival_date
      ? new Date(new Date(savedOrder.arrival_date).getTime() + GUARANTEE_DAYS * 86400000)
          .toISOString().split("T")[0]
      : null;

    await supabase
      .from("contracts")
      .update({ financial_status: "under_guarantee", guarantee_expiry: guaranteeExpiry })
      .eq("id", contract.id);

    toast.success("تم تسجيل عمولة المكتب الخارجي تلقائياً وتحديث العقد إلى (تحت الضمان)");
  }

  // ─── Helper: fetch external_office_id from CV ────────────────────────────────
  async function getExternalOfficeId(passportNumber: string | null | undefined): Promise<string | null> {
    if (!passportNumber) return null;
    const { data: cv } = await supabase
      .from("cvs")
      .select("external_office_id")
      .eq("passport_number", passportNumber)
      .single();
    return cv?.external_office_id ?? null;
  }

  async function getContractByNumber(contractNumber: string) {
    const { data } = await supabase
      .from("contracts")
      .select("id, external_commission_usd")
      .eq("contract_number", contractNumber)
      .single();
    return data;
  }

  // ─── Cancellation: within 5 days ─────────────────────────────────────────────
  async function handleCancelWithin5() {
    const savedOrder = pendingOrderForModal.current;
    if (!savedOrder?.contract_number) { setFinancialModal(null); fetchOrder(); return; }

    setModalProcessing(true);
    const contract = await getContractByNumber(savedOrder.contract_number);
    if (!contract) { toast.error("لم يتم العثور على العقد"); setModalProcessing(false); return; }

    const externalOfficeId = await getExternalOfficeId(savedOrder.passport_number);

    await supabase.from("contracts").update({
      cancellation_status: "within_5_days",
      financial_status: "cancelled_before_arrival",
    }).eq("id", contract.id);

    // Reverse FORECAST if it exists
    const { count: forecastExists } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("contract_id", contract.id)
      .eq("transaction_type", "EXTERNAL_COMMISSION_FORECAST")
      .eq("direction", "OUT");

    if (forecastExists && forecastExists > 0) {
      await supabase.from("transactions").insert({
        contract_id: contract.id,
        transaction_type: "EXTERNAL_COMMISSION_FORECAST",
        direction: "IN",
        amount: contract.external_commission_usd,
        currency: "USD",
        related_party: "external_office",
        external_office_id: externalOfficeId,
        passport_number: savedOrder.passport_number || null,
        notes: `عكس توقع العمولة — إلغاء العقد خلال 5 أيام${savedOrder.worker_name ? " — " + savedOrder.worker_name : ""}`,
      });
    }

    toast.success("تم إلغاء العقد وعكس التوقع المالي");
    setModalProcessing(false);
    setFinancialModal(null);
    fetchOrder();
  }

  // ─── Cancellation: after 5 days ──────────────────────────────────────────────
  async function handleCancelAfter5() {
    const savedOrder = pendingOrderForModal.current;
    if (!savedOrder?.contract_number) { setFinancialModal(null); fetchOrder(); return; }

    const refundSAR = parseFloat(refundInput) || 0;
    setModalProcessing(true);

    const contract = await getContractByNumber(savedOrder.contract_number);
    if (!contract) { toast.error("لم يتم العثور على العقد"); setModalProcessing(false); return; }

    const externalOfficeId = await getExternalOfficeId(savedOrder.passport_number);

    await supabase.from("contracts").update({
      cancellation_status: "after_5_days",
      financial_status: "cancelled_before_arrival",
    }).eq("id", contract.id);

    if (refundSAR > 0) {
      await supabase.from("transactions").insert({
        contract_id: contract.id,
        transaction_type: "CLIENT_REFUND",
        direction: "OUT",
        amount: refundSAR,
        currency: "SAR",
        related_party: "client",
        notes: `استرداد للكفيل — إلغاء العقد بعد 5 أيام${savedOrder.worker_name ? " — " + savedOrder.worker_name : ""}`,
      });
    }

    // Reverse FORECAST if it exists
    const { count: forecastExists } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("contract_id", contract.id)
      .eq("transaction_type", "EXTERNAL_COMMISSION_FORECAST")
      .eq("direction", "OUT");

    if (forecastExists && forecastExists > 0) {
      await supabase.from("transactions").insert({
        contract_id: contract.id,
        transaction_type: "EXTERNAL_COMMISSION_FORECAST",
        direction: "IN",
        amount: contract.external_commission_usd,
        currency: "USD",
        related_party: "external_office",
        external_office_id: externalOfficeId,
        passport_number: savedOrder.passport_number || null,
        notes: `عكس توقع العمولة — إلغاء العقد بعد 5 أيام${savedOrder.worker_name ? " — " + savedOrder.worker_name : ""}`,
      });
    }

    toast.success("تم إلغاء العقد وتسجيل مبالغ الاسترداد");
    setModalProcessing(false);
    setRefundInput("");
    setFinancialModal(null);
    fetchOrder();
  }

  // ─── Guarantee event (runaway/return within 90 + manual button) ──────────────
  async function handleGuaranteeEventFlow() {
    const savedOrder = pendingOrderForModal.current;
    if (!savedOrder?.contract_number) { setFinancialModal(null); fetchOrder(); return; }

    const refundSAR = parseFloat(refundInput) || 0;
    setModalProcessing(true);

    const contract = await getContractByNumber(savedOrder.contract_number);
    if (!contract) { toast.error("لم يتم العثور على العقد"); setModalProcessing(false); return; }

    // Idempotency: skip if reversal already recorded
    const { count: existing } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("contract_id", contract.id)
      .eq("transaction_type", "EXTERNAL_COMMISSION_REVERSAL");

    if (existing && existing > 0) {
      toast.error("تم تسجيل استرداد الضمان مسبقاً لهذا العقد");
      setModalProcessing(false);
      setFinancialModal(null);
      fetchOrder();
      return;
    }

    const externalOfficeId = await getExternalOfficeId(savedOrder.passport_number);

    if ((contract.external_commission_usd ?? 0) > 0) {
      await supabase.from("transactions").insert({
        contract_id: contract.id,
        transaction_type: "EXTERNAL_COMMISSION_REVERSAL",
        direction: "IN",
        amount: contract.external_commission_usd,
        currency: "USD",
        related_party: "external_office",
        external_office_id: externalOfficeId,
        passport_number: savedOrder.passport_number || null,
        notes: `استرداد عمولة — حدث ضمان${savedOrder.worker_name ? " — " + savedOrder.worker_name : ""}`,
      });
    }

    if (refundSAR > 0) {
      await supabase.from("transactions").insert({
        contract_id: contract.id,
        transaction_type: "CLIENT_REFUND",
        direction: "OUT",
        amount: refundSAR,
        currency: "SAR",
        related_party: "client",
        notes: `استرداد للكفيل — حدث ضمان${savedOrder.worker_name ? " — " + savedOrder.worker_name : ""}`,
      });
    }

    await supabase.from("contracts").update({
      financial_status: "refunded_during_guarantee",
    }).eq("id", contract.id);

    await supabase.from("orders").update({
      return_date: new Date().toISOString().split("T")[0],
    }).eq("id", savedOrder.id);

    toast.success("تم تسجيل حدث الضمان — استُرد مبلغ العمولة وتحديث حالة العقد");
    setModalProcessing(false);
    setRefundInput("");
    setFinancialModal(null);
    fetchOrder();
  }

  // Button handler — opens the same guarantee_event modal
  function openGuaranteeReturnModal() {
    if (!order) return;
    pendingOrderForModal.current = order;
    setRefundInput("");
    setFinancialModal("guarantee_event");
  }

  const update = (key: string, value: any) => {
    setOrder((o) => o ? { ...o, [key]: value } : null);
  };

  if (loading) {
    return (
      <AuthLayout>
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthLayout>
    );
  }

  if (!order) return <AuthLayout><p className="text-center py-20 text-gray-400">لم يتم العثور على الطلب</p></AuthLayout>;

  const daysToArrival = order.contract_date && order.arrival_date
    ? Math.ceil((new Date(order.arrival_date).getTime() - new Date(order.contract_date).getTime()) / 86400000)
    : null;

  const guaranteeDaysElapsed = order.arrival_date
    ? Math.min(GUARANTEE_DAYS, Math.ceil((Date.now() - new Date(order.arrival_date).getTime()) / 86400000))
    : null;

  const withinGuarantee =
    order.order_status === "arrived" &&
    !!order.arrival_date &&
    !order.return_date &&
    guaranteeDaysElapsed !== null &&
    guaranteeDaysElapsed <= GUARANTEE_DAYS;

  // Status options: post-arrival ones only shown when arrival_date exists (or already selected)
  const visibleStatuses = ORDER_STATUSES.filter(
    s => !POST_ARRIVAL_VALUES.has(s.value) || !!order.arrival_date || s.value === order.order_status
  );

  return (
    <AuthLayout>
      <PageHeader title={`طلب: ${order.client_name}`} subtitle={`رقم العقد: ${order.contract_number || "—"}`}>
        <button onClick={() => router.push("/orders")} className="btn-secondary flex items-center gap-2 text-sm">
          <ArrowRight size={16} /> رجوع
        </button>
        {withinGuarantee && (
          <button
            onClick={openGuaranteeReturnModal}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-bold bg-orange-100 text-orange-700 border border-orange-300 hover:bg-orange-200 transition-colors"
          >
            <RotateCcw size={16} />
            إرجاع خلال الضمان
          </button>
        )}
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
          حفظ
        </button>
      </PageHeader>

      <div className="space-y-6 max-w-4xl">
        {/* Status + Tracking */}
        <div className="card flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm mb-1">الحالة</label>
            <StatusBadge status={order.order_status} />
          </div>
          {trackingUrl && (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm mb-1">رابط متابعة العميل</label>
              <div className="flex gap-2">
                <input type="text" value={trackingUrl} readOnly className="flex-1 text-xs" dir="ltr" />
                <button
                  onClick={() => { navigator.clipboard.writeText(trackingUrl); toast.success("تم نسخ الرابط"); }}
                  className="btn-secondary flex items-center gap-1 text-xs px-3"
                >
                  <Copy size={14} /> نسخ
                </button>
              </div>
            </div>
          )}
          {daysToArrival !== null && (
            <div className="text-center">
              <label className="block text-sm mb-1">مدة العقد حتى الوصول</label>
              <p className="text-2xl font-bold text-navy-500">{daysToArrival} يوم</p>
            </div>
          )}
          {guaranteeDaysElapsed !== null && (
            <div className="text-center">
              <label className="block text-sm mb-1">أيام الضمان المنقضية</label>
              <p className={`text-2xl font-bold ${guaranteeDaysElapsed >= GUARANTEE_DAYS ? "text-red-600" : "text-orange-600"}`}>
                {guaranteeDaysElapsed} / {GUARANTEE_DAYS}
              </p>
            </div>
          )}
          {order.return_date && (
            <div className="text-center">
              <label className="block text-sm mb-1">تاريخ الإرجاع</label>
              <p className="text-sm font-bold text-red-600">{new Date(order.return_date).toLocaleDateString("en-US")}</p>
            </div>
          )}
        </div>

        {/* Client Info */}
        <div className="card">
          <h3 className="font-bold text-navy-500 mb-4">بيانات العميل</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">اسم العميل</label>
              <input type="text" value={order.client_name} onChange={(e) => update("client_name", e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm mb-1">الجوال</label>
              <input type="tel" value={order.phone} onChange={(e) => update("phone", e.target.value)} className="w-full" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm mb-1">تاريخ الميلاد</label>
              <input type="date" value={order.date_of_birth || ""} onChange={(e) => update("date_of_birth", e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm mb-1">رقم الهوية</label>
              <input type="text" value={order.national_id} onChange={(e) => update("national_id", e.target.value)} className="w-full" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm mb-1">المدينة</label>
              <select value={order.client_city || ""} onChange={(e) => update("client_city", e.target.value)} className="w-full">
                <option value="">اختر</option>
                {cities.map((c) => <option key={c.name_ar} value={c.name_ar}>{c.name_ar}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">طريقة الاستلام</label>
              <select value={order.delivery_method || ""} onChange={(e) => update("delivery_method", e.target.value)} className="w-full">
                <option value="pickup_from_office">من المكتب</option>
                <option value="send_to_client">إرسال</option>
              </select>
            </div>
          </div>
        </div>

        {/* Order Info */}
        <div className="card">
          <h3 className="font-bold text-navy-500 mb-4">بيانات الطلب</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">حالة الطلب</label>
              <select value={order.order_status} onChange={(e) => update("order_status", e.target.value)} className="w-full">
                {visibleStatuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">رقم التأشيرة</label>
              <input type="text" value={order.visa_number || ""} onChange={(e) => update("visa_number", e.target.value)} className="w-full" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm mb-1">رقم العقد</label>
              <input type="text" value={order.contract_number || ""} onChange={(e) => update("contract_number", e.target.value)} className="w-full" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm mb-1">تاريخ العقد</label>
              <input type="date" value={order.contract_date || ""} onChange={(e) => update("contract_date", e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm mb-1">الجنسية</label>
              <select value={order.nationality} onChange={(e) => update("nationality", e.target.value)} className="w-full">
                {NATIONALITIES.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">المهنة</label>
              <select value={order.profession} onChange={(e) => update("profession", e.target.value)} className="w-full">
                {PROFESSIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-2">العاملة المرتبطة</label>
              {order.passport_number ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-3">
                    <UserCheck size={18} className="text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-emerald-800 text-sm">{order.worker_name || "—"}</p>
                      <p className="text-xs text-emerald-600">
                        جواز: {order.passport_number} · مكتب: {order.external_office || "—"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { update("passport_number", ""); update("worker_name", ""); update("external_office", ""); }}
                    className="text-gray-400 hover:text-red-500 transition-colors text-xs flex items-center gap-1"
                    title="مسح العاملة"
                  >
                    <X size={16} /> مسح
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  لا توجد عاملة مرتبطة — ابحث أدناه لتعيين عاملة
                </p>
              )}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="ابحث برقم الجواز لتغيير العاملة..."
                  value={passportSearch}
                  onChange={(e) => setPassportSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchWorker())}
                  className="flex-1 text-sm"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={searchWorker}
                  disabled={searching}
                  className="btn-secondary flex items-center gap-1 text-sm px-3"
                >
                  {searching
                    ? <div className="w-4 h-4 border-2 border-navy-500 border-t-transparent rounded-full animate-spin" />
                    : <Search size={15} />}
                  بحث
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="card">
          <h3 className="font-bold text-navy-500 mb-4">المواعيد</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">تاريخ السفر</label>
              <input type="datetime-local" value={order.travel_date?.slice(0, 16) || ""} onChange={(e) => update("travel_date", e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm mb-1">تاريخ الوصول</label>
              <input type="datetime-local" value={order.arrival_date?.slice(0, 16) || ""} onChange={(e) => update("arrival_date", e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm mb-1">تاريخ الرجوع</label>
              <input type="datetime-local" value={order.return_date?.slice(0, 16) || ""} onChange={(e) => update("return_date", e.target.value)} className="w-full" />
            </div>
          </div>
        </div>

        {/* Delay Reason */}
        <div className="card">
          <label className="block text-sm mb-1">سبب التأخير (يظهر للعميل عبر رابط المتابعة)</label>
          <textarea
            value={order.delay_reason || ""}
            onChange={(e) => update("delay_reason", e.target.value)}
            rows={2}
            className="w-full"
            placeholder="يظهر تلقائياً إذا تجاوز العقد 45 يوم..."
          />
        </div>

        {/* Notes */}
        <div className="card">
          <label className="block text-sm mb-1">ملاحظات</label>
          <textarea value={order.notes || ""} onChange={(e) => update("notes", e.target.value)} rows={3} className="w-full" />
        </div>
      </div>

      {/* ── Modal: Cancellation type selector ────────────────────────────────── */}
      {financialModal === "cancel_check" && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-navy-500">تحديد نوع الإلغاء</h3>
            <p className="text-sm text-gray-600">حدد وقت إلغاء العقد بالنسبة لتاريخ الإصدار:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCancelWithin5}
                disabled={modalProcessing}
                className="p-4 rounded-xl border-2 border-green-300 bg-green-50 text-green-800 font-bold text-sm hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                خلال 5 أيام
                <p className="text-xs font-normal mt-1 text-green-600">بدون استرداد — عكس التوقع فقط</p>
              </button>
              <button
                onClick={() => { setRefundInput(""); setFinancialModal("cancel_after_5"); }}
                disabled={modalProcessing}
                className="p-4 rounded-xl border-2 border-orange-300 bg-orange-50 text-orange-800 font-bold text-sm hover:bg-orange-100 transition-colors disabled:opacity-50"
              >
                بعد 5 أيام
                <p className="text-xs font-normal mt-1 text-orange-600">إدخال مبلغ استرداد الكفيل</p>
              </button>
            </div>
            <button
              onClick={() => { setFinancialModal(null); fetchOrder(); }}
              disabled={modalProcessing}
              className="w-full btn-secondary text-sm"
            >
              تخطي (بدون إجراء مالي)
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: Cancellation after 5 days — refund input ──────────────────── */}
      {financialModal === "cancel_after_5" && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-navy-500">إلغاء بعد 5 أيام</h3>
            <div>
              <label className="block text-sm mb-1">مبلغ الاسترداد المُعاد للكفيل (ر.س)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={refundInput}
                onChange={(e) => setRefundInput(e.target.value)}
                placeholder="0.00"
                className="w-full"
                dir="ltr"
              />
              <p className="text-xs text-gray-400 mt-1">اتركه صفراً إذا لم يكن هناك استرداد</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancelAfter5}
                disabled={modalProcessing}
                className="flex-1 btn-primary text-sm"
              >
                {modalProcessing
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  : "تأكيد الإلغاء"}
              </button>
              <button
                onClick={() => setFinancialModal("cancel_check")}
                disabled={modalProcessing}
                className="btn-secondary text-sm"
              >
                رجوع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Guarantee event — commission reversal + optional client refund */}
      {financialModal === "guarantee_event" && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-navy-500">حدث ضمان — استرداد عمولة</h3>
            <p className="text-sm text-gray-600">سيتم عكس عمولة المكتب الخارجي تلقائياً في السجل المحاسبي.</p>
            <div>
              <label className="block text-sm mb-1">مبلغ الاسترداد المُعاد للكفيل (ر.س)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={refundInput}
                onChange={(e) => setRefundInput(e.target.value)}
                placeholder="0.00"
                className="w-full"
                dir="ltr"
              />
              <p className="text-xs text-gray-400 mt-1">اتركه صفراً إذا لم يكن هناك استرداد للكفيل</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleGuaranteeEventFlow}
                disabled={modalProcessing}
                className="flex-1 btn-primary text-sm"
              >
                {modalProcessing
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  : "تأكيد"}
              </button>
              <button
                onClick={() => { setFinancialModal(null); fetchOrder(); }}
                disabled={modalProcessing}
                className="btn-secondary text-sm"
              >
                تخطي
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
