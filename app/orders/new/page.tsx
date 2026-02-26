"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import AuthLayout from "@/components/ui/AuthLayout";
import PageHeader from "@/components/ui/PageHeader";
import { useRouter } from "next/navigation";
import { NATIONALITIES, PROFESSIONS, ORDER_STATUSES } from "@/lib/constants";
import { toast } from "sonner";
import { Save, Search, UserCheck, X, List, ChevronDown } from "lucide-react";

interface AvailableCV {
  id: string;
  worker_name: string;
  passport_number: string;
  nationality: string;
  profession: string;
  salary: number;
  new_or_experienced: string;
  office_name?: string;
  external_office_id: string;
}

const NATIONALITY_FLAGS: Record<string, string> = {
  ethiopia: "🇪🇹", kenya: "🇰🇪", uganda: "🇺🇬", philippines: "🇵🇭", india: "🇮🇳",
};

export default function NewOrderPage() {
  const supabase = createClient();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [cities, setCities] = useState<{ name_ar: string }[]>([]);
  const [passportSearch, setPassportSearch] = useState("");
  const [workerFound, setWorkerFound] = useState(false);

  // Picker state
  const [showPicker, setShowPicker] = useState(false);
  const [pickerWorkers, setPickerWorkers] = useState<AvailableCV[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerNationality, setPickerNationality] = useState("");
  const [pickerProfession, setPickerProfession] = useState("");

  const [form, setForm] = useState({
    client_name: "",
    phone: "",
    date_of_birth: "",
    national_id: "",
    visa_number: "",
    nationality: "ethiopia",
    profession: "housemaid",
    passport_number: "",
    worker_name: "",
    external_office: "",
    contract_number: "",
    order_type: "by_specs",
    contract_date: "",
    order_status: "selected",
    travel_date: "",
    arrival_date: "",
    client_city: "",
    delivery_method: "pickup_from_office",
    notes: "",
  });

  useEffect(() => { fetchCities(); }, []);

  useEffect(() => {
    if (form.nationality === "india") {
      setForm((f) => ({ ...f, profession: "private_driver" }));
    }
  }, [form.nationality]);

  async function fetchCities() {
    const { data } = await supabase.from("saudi_cities").select("name_ar").order("id");
    if (data) setCities(data);
  }

  // ── Passport search ────────────────────────────────────────────
  async function searchPassport() {
    if (!passportSearch.trim()) { toast.error("أدخل رقم الجواز"); return; }

    const { data, error } = await supabase
      .from("cvs")
      .select("*, external_offices(office_name)")
      .eq("passport_number", passportSearch.trim())
      .single();

    if (error || !data) { toast.error("لم يتم العثور على عاملة بهذا الجواز"); setWorkerFound(false); return; }

    const { count } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("passport_number", data.passport_number)
      .not("order_status", "in", '("arrived","cancelled")');

    if (count && count > 0) { toast.error("هذه العاملة مرتبطة بطلب نشط بالفعل"); return; }

    selectWorker({
      id: data.id,
      worker_name: data.worker_name,
      passport_number: data.passport_number,
      nationality: data.nationality,
      profession: data.profession,
      salary: data.salary,
      new_or_experienced: data.new_or_experienced,
      office_name: data.external_offices?.office_name,
      external_office_id: data.external_office_id,
    });
    toast.success(`تم العثور على: ${data.worker_name}`);
  }

  // ── Picker: load available workers ────────────────────────────
  async function openPicker() {
    setShowPicker(true);
    if (pickerWorkers.length > 0) return; // already loaded
    setPickerLoading(true);

    const { data } = await supabase
      .from("available_workers")
      .select("id, worker_name, passport_number, nationality, profession, salary, new_or_experienced, office_name, external_office_id")
      .eq("availability", "available")
      .order("worker_name");

    setPickerWorkers(data ?? []);
    setPickerLoading(false);
  }

  // ── Select worker (shared by both passport search and picker) ──
  function selectWorker(cv: AvailableCV) {
    setForm((f) => ({
      ...f,
      passport_number: cv.passport_number,
      worker_name: cv.worker_name,
      external_office: cv.office_name || "",
      nationality: cv.nationality as typeof form.nationality,
      profession: cv.profession as typeof form.profession,
    }));
    setWorkerFound(true);
    setShowPicker(false);
    setPickerSearch("");
  }

  function clearWorker() {
    setForm((f) => ({ ...f, passport_number: "", worker_name: "", external_office: "" }));
    setPassportSearch("");
    setWorkerFound(false);
  }

  // ── Filtered picker list ───────────────────────────────────────
  const filteredWorkers = pickerWorkers.filter((w) => {
    const q = pickerSearch.toLowerCase();
    const matchSearch = !q ||
      w.worker_name.toLowerCase().includes(q) ||
      w.passport_number.toLowerCase().includes(q) ||
      (w.office_name ?? "").toLowerCase().includes(q);
    const matchNat = !pickerNationality || w.nationality === pickerNationality;
    const matchProf = !pickerProfession || w.profession === pickerProfession;
    return matchSearch && matchNat && matchProf;
  });

  // ── Submit ─────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    if (form.visa_number) {
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("visa_number", form.visa_number);
      if (count && count > 0) { toast.error("رقم التأشيرة مستخدم بالفعل"); setSaving(false); return; }
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("orders").insert({
      ...form,
      passport_number: form.passport_number || null,
      visa_number: form.visa_number || null,
      contract_number: form.contract_number || null,
      contract_date: form.contract_date || null,
      travel_date: form.travel_date || null,
      arrival_date: form.arrival_date || null,
      date_of_birth: form.date_of_birth || null,
      created_by: user?.id,
    });

    if (error) { toast.error("حدث خطأ: " + error.message); }
    else { toast.success("تم إضافة الطلب بنجاح"); router.push("/orders"); }
    setSaving(false);
  }

  const updateField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <AuthLayout>
      <PageHeader title="طلب جديد" subtitle="إضافة طلب استقدام جديد" />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">

        {/* ── Worker Selection ──────────────────────────────────── */}
        <div className="card border-2 border-navy-200">
          <h3 className="font-bold text-navy-500 mb-4 flex items-center gap-2">
            <UserCheck size={20} /> اختيار العاملة
          </h3>

          {workerFound ? (
            /* Selected worker banner */
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-lg">
                  {NATIONALITY_FLAGS[form.nationality] ?? "👤"}
                </div>
                <div>
                  <p className="font-bold text-emerald-800">{form.worker_name}</p>
                  <p className="text-xs text-emerald-600">
                    جواز: <span className="font-mono">{form.passport_number}</span>
                    {form.external_office && ` · مكتب: ${form.external_office}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearWorker}
                className="text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 text-xs"
              >
                <X size={16} /> تغيير
              </button>
            </div>
          ) : (
            /* Search + pick */
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="ابحث برقم الجواز مباشرة..."
                  value={passportSearch}
                  onChange={(e) => setPassportSearch(e.target.value)}
                  className="flex-1"
                  dir="ltr"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchPassport())}
                />
                <button type="button" onClick={searchPassport} className="btn-secondary flex items-center gap-1 text-sm px-3">
                  <Search size={15} /> بحث
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400">أو</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              <button
                type="button"
                onClick={openPicker}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-navy-300 hover:border-navy-500 hover:bg-navy-50 text-navy-500 font-bold rounded-xl py-3 transition-all text-sm"
              >
                <List size={18} />
                اختر من قائمة العاملات المتاحة
                <ChevronDown size={16} />
              </button>
            </div>
          )}
        </div>

        {/* ── Client Info ───────────────────────────────────────── */}
        <div className="card">
          <h3 className="font-bold text-navy-500 mb-4">بيانات العميل</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">اسم العميل *</label>
              <input type="text" required value={form.client_name} onChange={(e) => updateField("client_name", e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm mb-1">رقم الجوال *</label>
              <input type="tel" required value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className="w-full" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm mb-1">تاريخ الميلاد</label>
              <input type="date" value={form.date_of_birth} onChange={(e) => updateField("date_of_birth", e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm mb-1">رقم الهوية *</label>
              <input type="text" required value={form.national_id} onChange={(e) => updateField("national_id", e.target.value)} className="w-full" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm mb-1">مدينة العميل</label>
              <select value={form.client_city} onChange={(e) => updateField("client_city", e.target.value)} className="w-full">
                <option value="">اختر المدينة</option>
                {cities.map((c) => <option key={c.name_ar} value={c.name_ar}>{c.name_ar}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">طريقة الاستلام</label>
              <select value={form.delivery_method} onChange={(e) => updateField("delivery_method", e.target.value)} className="w-full">
                <option value="pickup_from_office">من المكتب</option>
                <option value="send_to_client">إرسال للعميل</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Order Details ─────────────────────────────────────── */}
        <div className="card">
          <h3 className="font-bold text-navy-500 mb-4">بيانات الطلب</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">الجنسية *</label>
              <select value={form.nationality} onChange={(e) => updateField("nationality", e.target.value)} className="w-full">
                {NATIONALITIES.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">المهنة *</label>
              <select value={form.profession} onChange={(e) => updateField("profession", e.target.value)} className="w-full" disabled={form.nationality === "india"}>
                {form.nationality === "india"
                  ? <option value="private_driver">سائق خاص</option>
                  : PROFESSIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">نوع الطلب *</label>
              <select value={form.order_type} onChange={(e) => updateField("order_type", e.target.value)} className="w-full">
                <option value="by_specs">حسب المواصفات</option>
                <option value="named_worker">معين بالاسم</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">حالة الطلب</label>
              <select value={form.order_status} onChange={(e) => updateField("order_status", e.target.value)} className="w-full">
                {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">رقم التأشيرة</label>
              <input type="text" value={form.visa_number} onChange={(e) => updateField("visa_number", e.target.value)} className="w-full" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm mb-1">رقم العقد</label>
              <input type="text" value={form.contract_number} onChange={(e) => updateField("contract_number", e.target.value)} className="w-full" dir="ltr" placeholder="يُنشئ سجل عقد تلقائياً" />
            </div>
            <div>
              <label className="block text-sm mb-1">تاريخ العقد (تاريخ الدفع على مساند)</label>
              <input type="date" value={form.contract_date} onChange={(e) => updateField("contract_date", e.target.value)} className="w-full" />
            </div>
          </div>
        </div>

        {/* ── Dates ─────────────────────────────────────────────── */}
        <div className="card">
          <h3 className="font-bold text-navy-500 mb-4">المواعيد</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">تاريخ السفر</label>
              <input type="datetime-local" value={form.travel_date} onChange={(e) => updateField("travel_date", e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm mb-1">تاريخ الوصول</label>
              <input type="datetime-local" value={form.arrival_date} onChange={(e) => updateField("arrival_date", e.target.value)} className="w-full" />
            </div>
          </div>
        </div>

        {/* ── Notes ─────────────────────────────────────────────── */}
        <div className="card">
          <label className="block text-sm mb-1">ملاحظات</label>
          <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={3} className="w-full" placeholder="أي ملاحظات إضافية..." />
        </div>

        {/* ── Submit ────────────────────────────────────────────── */}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={18} />}
            حفظ الطلب
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">إلغاء</button>
        </div>
      </form>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* Worker Picker Modal                                       */}
      {/* ══════════════════════════════════════════════════════════ */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:rounded-2xl sm:max-w-2xl flex flex-col max-h-[92vh] sm:max-h-[80vh]">

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="font-bold text-navy-500 text-lg">اختر عاملة من القائمة</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {filteredWorkers.length} عاملة متاحة
                </p>
              </div>
              <button onClick={() => setShowPicker(false)} className="text-gray-400 hover:text-gray-600">
                <X size={22} />
              </button>
            </div>

            {/* Filters */}
            <div className="p-3 border-b border-gray-100 space-y-2 shrink-0">
              <input
                type="text"
                placeholder="ابحث بالاسم أو الجواز أو المكتب..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="w-full text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <select
                  value={pickerNationality}
                  onChange={(e) => setPickerNationality(e.target.value)}
                  className="flex-1 text-sm"
                >
                  <option value="">كل الجنسيات</option>
                  {NATIONALITIES.map((n) => (
                    <option key={n.value} value={n.value}>{n.label}</option>
                  ))}
                </select>
                <select
                  value={pickerProfession}
                  onChange={(e) => setPickerProfession(e.target.value)}
                  className="flex-1 text-sm"
                >
                  <option value="">كل المهن</option>
                  {PROFESSIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1">
              {pickerLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredWorkers.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <UserCheck size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold">لا توجد عاملات تطابق البحث</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredWorkers.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => selectWorker(w)}
                      className="w-full flex items-center gap-3 p-4 hover:bg-navy-50 text-right transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl shrink-0">
                        {NATIONALITY_FLAGS[w.nationality] ?? "👤"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 text-sm">{w.worker_name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {NATIONALITIES.find((n) => n.value === w.nationality)?.label}
                          {" · "}
                          {PROFESSIONS.find((p) => p.value === w.profession)?.label}
                          {w.office_name ? ` · ${w.office_name}` : ""}
                        </p>
                      </div>
                      <div className="text-left shrink-0">
                        <p className="font-mono text-xs text-gray-500">{w.passport_number}</p>
                        <p className="text-xs text-emerald-600 font-bold mt-0.5">{w.salary} USD</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </AuthLayout>
  );
}
