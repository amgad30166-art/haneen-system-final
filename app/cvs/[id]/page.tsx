"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import AuthLayout from "@/components/ui/AuthLayout";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { useRouter, useParams } from "next/navigation";
import {
  NATIONALITIES, PROFESSIONS, RELIGIONS,
  MARITAL_STATUSES,
  ETHIOPIA_MEDICAL_VALIDITY, OTHER_MEDICAL_VALIDITY,
  MIN_WORKER_AGE, MAX_WORKER_AGE,
} from "@/lib/constants";
import { ExternalOffice, CV } from "@/lib/types";
import { toast } from "sonner";
import {
  Save, ArrowRight, Upload, X, Video, CheckCircle,
  AlertCircle, Clock, Link as LinkIcon,
} from "lucide-react";

interface LinkedOrder {
  id: string;
  client_name: string;
  order_status: string;
  contract_number?: string;
}

export default function CVEditPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const router = useRouter();

  const [cv, setCv] = useState<CV | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offices, setOffices] = useState<ExternalOffice[]>([]);
  const [linkedOrder, setLinkedOrder] = useState<LinkedOrder | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");

  useEffect(() => {
    fetchCV();
    fetchOffices();
  }, [id]);

  async function fetchOffices() {
    const { data } = await supabase.from("external_offices").select("*").order("office_name");
    if (data) setOffices(data);
  }

  async function fetchCV() {
    const { data } = await supabase
      .from("cvs")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setCv(data);
      // Fetch any active order linked to this passport
      const { data: orderData } = await supabase
        .from("orders")
        .select("id, client_name, order_status, contract_number")
        .eq("passport_number", data.passport_number)
        .not("order_status", "in", '("arrived","cancelled")')
        .maybeSingle();
      if (orderData) setLinkedOrder(orderData);
    }
    setLoading(false);
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("الصورة يجب أن تكون أقل من 5MB"); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function handleProfilePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("الصورة يجب أن تكون أقل من 5MB"); return; }
    setProfilePhotoFile(file);
    setProfilePhotoPreview(URL.createObjectURL(file));
  }

  function validateAge(): boolean {
    if (!cv?.date_of_birth) return true; // optional field
    const age = Math.floor((Date.now() - new Date(cv.date_of_birth).getTime()) / (365.25 * 86400000));
    if (age < MIN_WORKER_AGE || age > MAX_WORKER_AGE) {
      toast.error(`عمر العاملة يجب أن يكون بين ${MIN_WORKER_AGE} و ${MAX_WORKER_AGE} سنة. العمر الحالي: ${age}`);
      return false;
    }
    return true;
  }

  async function handleSave() {
    if (!cv) return;
    if (!cv.external_office_id) { toast.error("اختر المكتب الخارجي"); return; }
    if (!validateAge()) return;

    setSaving(true);

    // Upload full-body photo if changed
    let photo_url = cv.photo_url ?? "";
    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const path = `${cv.passport_number}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("worker-photos")
        .upload(path, photoFile, { upsert: true });
      if (uploadErr) { toast.error("خطأ في رفع الصورة: " + uploadErr.message); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("worker-photos").getPublicUrl(path);
      photo_url = `${urlData.publicUrl}?t=${Date.now()}`;
    }

    // Upload profile photo (head & shoulders) if changed
    let profile_photo = cv.profile_photo ?? "";
    if (profilePhotoFile) {
      const ext = profilePhotoFile.name.split(".").pop();
      const path = `profile_${cv.passport_number}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("worker-photos")
        .upload(path, profilePhotoFile, { upsert: true });
      if (uploadErr) { toast.error("خطأ في رفع صورة الوجه: " + uploadErr.message); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("worker-photos").getPublicUrl(path);
      profile_photo = `${urlData.publicUrl}?t=${Date.now()}`;
    }

    const { error } = await supabase
      .from("cvs")
      .update({
        worker_name: cv.worker_name,
        date_of_birth: cv.date_of_birth,
        religion: cv.religion,
        photo_url: photo_url || null,
        profile_photo: profile_photo || null,
        video_url: cv.video_url || null,
        medical_exam_date: cv.medical_exam_date,
        musaned_status: cv.musaned_status,
        external_office_status: cv.external_office_status,
        internal_status: cv.internal_status,
        new_or_experienced: cv.new_or_experienced,
        nationality: cv.nationality,
        profession: cv.profession,
        external_office_id: cv.external_office_id,
        broker_name: cv.broker_name || null,
        marital_status: cv.marital_status || null,
        children_count: cv.children_count ?? 0,
        salary: cv.salary,
      })
      .eq("id", cv.id);

    if (error) {
      toast.error("خطأ: " + error.message);
    } else {
      toast.success("تم حفظ التعديلات");
      setPhotoFile(null);
      setProfilePhotoFile(null);
      fetchCV();
    }
    setSaving(false);
  }

  const update = (key: keyof CV, value: any) =>
    setCv((c) => c ? { ...c, [key]: value } : null);

  // ── Computed values ────────────────────────────────────────
  function getMedicalStatus() {
    if (!cv) return { label: "—", ok: false, days: 0 };
    const validity = cv.nationality === "ethiopia"
      ? ETHIOPIA_MEDICAL_VALIDITY
      : OTHER_MEDICAL_VALIDITY;
    if (!cv.medical_exam_date) return { label: "—", ok: false, days: 0 };
    const expiry = new Date(cv.medical_exam_date);
    expiry.setDate(expiry.getDate() + validity);
    const today = new Date();
    const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
    const ok = days > 0;
    return {
      label: ok ? `صالح (${days} يوم متبقي)` : `منتهي (${Math.abs(days)} يوم مضى)`,
      ok,
      days,
    };
  }

  function getAvailabilityStatus(): "available" | "not_available" | "in_use" {
    if (!cv) return "not_available";
    if (linkedOrder) return "in_use";
    const med = getMedicalStatus();
    const isMedValid = cv.nationality === "ethiopia" ? med.ok : true;
    if (
      cv.internal_status === "accepted" &&
      cv.musaned_status === "uploaded" &&
      cv.external_office_status === "ready" &&
      (cv.nationality !== "ethiopia" || isMedValid)
    ) return "available";
    return "not_available";
  }

  const medStatus = cv ? getMedicalStatus() : null;
  const availability = cv ? getAvailabilityStatus() : null;

  if (loading) {
    return (
      <AuthLayout>
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthLayout>
    );
  }

  if (!cv) {
    return (
      <AuthLayout>
        <p className="text-center py-20 text-gray-400">لم يتم العثور على السيرة الذاتية</p>
      </AuthLayout>
    );
  }

  const currentPhoto = photoPreview || cv.photo_url || "";
  const currentProfilePhoto = profilePhotoPreview || cv.profile_photo || "";

  return (
    <AuthLayout>
      <PageHeader
        title={cv.worker_name}
        subtitle={`جواز: ${cv.passport_number}`}
      >
        <button
          onClick={() => router.push("/cvs")}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <ArrowRight size={16} /> رجوع
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save size={16} />
          )}
          حفظ التعديلات
        </button>
      </PageHeader>

      <div className="space-y-6 max-w-4xl">
        {/* ── Availability Status Banner ─────────────────────── */}
        <div className={`rounded-xl p-4 flex flex-wrap items-center gap-4 ${
          availability === "available"
            ? "bg-emerald-50 border border-emerald-200"
            : availability === "in_use"
            ? "bg-blue-50 border border-blue-200"
            : "bg-gray-50 border border-gray-200"
        }`}>
          <div className="flex items-center gap-2">
            {availability === "available" && (
              <CheckCircle size={20} className="text-emerald-600" />
            )}
            {availability === "in_use" && (
              <Clock size={20} className="text-blue-600" />
            )}
            {availability === "not_available" && (
              <AlertCircle size={20} className="text-gray-400" />
            )}
            <span className={`font-bold ${
              availability === "available"
                ? "text-emerald-700"
                : availability === "in_use"
                ? "text-blue-700"
                : "text-gray-500"
            }`}>
              {availability === "available"
                ? "متاحة للتعاقد"
                : availability === "in_use"
                ? "مرتبطة بطلب نشط"
                : "غير متاحة"}
            </span>
          </div>

          {/* Medical validity */}
          {medStatus && (
            <div className={`text-sm font-bold ${medStatus.ok ? "text-emerald-600" : "text-red-600"}`}>
              الفحص الطبي: {medStatus.label}
            </div>
          )}

          {/* Linked order */}
          {linkedOrder && (
            <div className="flex items-center gap-2 text-sm">
              <LinkIcon size={14} className="text-blue-500" />
              <span className="text-blue-700 font-bold">
                {linkedOrder.client_name}
                {linkedOrder.contract_number && ` — ${linkedOrder.contract_number}`}
              </span>
              <StatusBadge status={linkedOrder.order_status} type="order" />
            </div>
          )}
        </div>

        {/* ── Photos + Video ─────────────────────────────────── */}
        <div className="card">
          <h3 className="font-bold text-navy-500 mb-4">الصور والفيديو</h3>
          <div className="flex flex-wrap gap-6 items-start">

            {/* Profile photo — head & shoulders */}
            <div>
              <label className="block text-sm font-bold mb-1">صورة الوجه والكتفين</label>
              <p className="text-xs text-gray-400 mb-2">تظهر على بطاقة العاملة للعملاء</p>
              {currentProfilePhoto ? (
                <div className="relative w-36 h-36">
                  <img src={currentProfilePhoto} alt="" className="w-full h-full object-cover object-top rounded-xl border border-gray-200" />
                  <label className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold cursor-pointer hover:bg-white transition-colors flex items-center gap-1">
                    <Upload size={12} /> تغيير
                    <input type="file" accept="image/*" onChange={handleProfilePhoto} className="hidden" />
                  </label>
                </div>
              ) : (
                <label className="w-36 h-36 border-2 border-dashed border-navy-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-navy-50 transition-colors">
                  <Upload size={28} className="text-navy-400 mb-2" />
                  <span className="text-xs text-navy-400 font-bold text-center px-2">صورة الوجه</span>
                  <input type="file" accept="image/*" onChange={handleProfilePhoto} className="hidden" />
                </label>
              )}
            </div>

            {/* Full body photo */}
            <div>
              <label className="block text-sm font-bold mb-1">الصورة الكاملة</label>
              <p className="text-xs text-gray-400 mb-2">تظهر عند فتح السيرة الذاتية</p>
              {currentPhoto ? (
                <div className="relative w-36 h-52">
                  <img src={currentPhoto} alt={cv.worker_name} className="w-full h-full object-cover rounded-xl border border-gray-200" />
                  <label className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold cursor-pointer hover:bg-white transition-colors flex items-center gap-1">
                    <Upload size={12} /> تغيير
                    <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                  </label>
                </div>
              ) : (
                <label className="w-36 h-52 border-2 border-dashed border-navy-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-navy-50 transition-colors">
                  <Upload size={28} className="text-navy-400 mb-2" />
                  <span className="text-xs text-navy-400 font-bold text-center px-2">صورة كاملة</span>
                  <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                </label>
              )}
            </div>

            {/* Video URL */}
            <div className="flex-1 min-w-[250px]">
              <label className="block text-sm mb-1">رابط فيديو (YouTube / Vimeo)</label>
              <div className="flex items-center gap-2">
                <Video size={20} className="text-gray-400 shrink-0" />
                <input
                  type="url"
                  value={cv.video_url ?? ""}
                  onChange={(e) => update("video_url", e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="flex-1"
                  dir="ltr"
                />
              </div>
              {cv.video_url && (
                <button type="button" onClick={() => update("video_url", "")}
                  className="mt-1 text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                  <X size={12} /> حذف الفيديو
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Personal Info ──────────────────────────────────── */}
        <div className="card">
          <h3 className="font-bold text-navy-500 mb-4">البيانات الشخصية</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">اسم العاملة *</label>
              <input
                type="text"
                value={cv.worker_name}
                onChange={(e) => update("worker_name", e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">رقم الجواز (لا يمكن تغييره)</label>
              <input
                type="text"
                value={cv.passport_number}
                readOnly
                className="w-full bg-gray-50 text-gray-500"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">تاريخ الميلاد</label>
              <input
                type="date"
                value={cv.date_of_birth}
                onChange={(e) => update("date_of_birth", e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">الديانة *</label>
              <select
                value={cv.religion}
                onChange={(e) => update("religion", e.target.value as any)}
                className="w-full"
              >
                {RELIGIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">الجنسية *</label>
              <select
                value={cv.nationality}
                onChange={(e) => {
                  const nat = e.target.value as any;
                  update("nationality", nat);
                  if (nat === "india") update("profession", "private_driver");
                }}
                className="w-full"
              >
                {NATIONALITIES.map((n) => (
                  <option key={n.value} value={n.value}>{n.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">المهنة *</label>
              <select
                value={cv.profession}
                onChange={(e) => update("profession", e.target.value as any)}
                className="w-full"
                disabled={cv.nationality === "india"}
              >
                {cv.nationality === "india" ? (
                  <option value="private_driver">سائق خاص</option>
                ) : (
                  PROFESSIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">الحالة الاجتماعية</label>
              <select
                value={cv.marital_status ?? "single"}
                onChange={(e) => update("marital_status", e.target.value as any)}
                className="w-full"
              >
                {MARITAL_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">عدد الأطفال</label>
              <input
                type="number"
                min="0"
                value={cv.children_count ?? 0}
                onChange={(e) => update("children_count", parseInt(e.target.value) || 0)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">الراتب (ريال) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cv.salary}
                onChange={(e) => update("salary", parseFloat(e.target.value) || 0)}
                className="w-full"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">جديدة / سبق لها العمل *</label>
              <select
                value={cv.new_or_experienced}
                onChange={(e) => update("new_or_experienced", e.target.value as any)}
                className="w-full"
              >
                <option value="new">جديدة</option>
                <option value="experienced">سبق لها العمل</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Office, Medical & Status ───────────────────────── */}
        <div className="card">
          <h3 className="font-bold text-navy-500 mb-4">المكتب والحالة والفحص</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">المكتب الخارجي *</label>
              <select
                value={cv.external_office_id}
                onChange={(e) => update("external_office_id", e.target.value)}
                className="w-full"
              >
                <option value="">اختر المكتب</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>{o.office_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">اسم السمسار</label>
              <input
                type="text"
                value={cv.broker_name ?? ""}
                onChange={(e) => update("broker_name", e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">
                تاريخ الفحص الطبي *
                <span className="text-gray-400 font-normal mr-1 text-xs">
                  (صلاحية: {cv.nationality === "ethiopia" ? "90" : "60"} يوم)
                </span>
              </label>
              <input
                type="date"
                value={cv.medical_exam_date}
                onChange={(e) => update("medical_exam_date", e.target.value)}
                className={`w-full ${medStatus && !medStatus.ok ? "border-red-400 bg-red-50" : ""}`}
              />
              {medStatus && (
                <p className={`text-xs mt-1 font-bold ${medStatus.ok ? "text-emerald-600" : "text-red-600"}`}>
                  {medStatus.label}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm mb-1">حالة مساند *</label>
              <select
                value={cv.musaned_status}
                onChange={(e) => update("musaned_status", e.target.value as any)}
                className="w-full"
              >
                <option value="uploaded">مرفوعة ✓</option>
                <option value="not_uploaded">غير مرفوعة</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">تحديث المكتب الخارجي *</label>
              <select
                value={cv.external_office_status}
                onChange={(e) => update("external_office_status", e.target.value as any)}
                className="w-full"
              >
                <option value="ready">جاهزة (Ready) ✓</option>
                <option value="cancel">ملغية (Cancel)</option>
                <option value="not_available">غير متاحة</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">قبول حنين الشرق *</label>
              <select
                value={cv.internal_status}
                onChange={(e) => update("internal_status", e.target.value as any)}
                className="w-full"
              >
                <option value="accepted">مقبولة (Accepted) ✓</option>
                <option value="rejected">مرفوضة (Rejected)</option>
              </select>
            </div>
          </div>

          {/* Availability checklist */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <p className="font-bold text-sm text-gray-600 mb-3">شروط الإتاحة:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {[
                {
                  label: "مقبولة داخلياً",
                  ok: cv.internal_status === "accepted",
                },
                {
                  label: "مرفوعة على مساند",
                  ok: cv.musaned_status === "uploaded",
                },
                {
                  label: "المكتب الخارجي: جاهزة",
                  ok: cv.external_office_status === "ready",
                },
                {
                  label: "الفحص الطبي ساري",
                  ok: medStatus?.ok ?? false,
                  note: cv.nationality !== "ethiopia" ? "(إثيوبيا فقط)" : undefined,
                },
                {
                  label: "لا يوجد طلب نشط",
                  ok: !linkedOrder,
                },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-2">
                  {c.ok ? (
                    <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle size={14} className="text-red-400 shrink-0" />
                  )}
                  <span className={c.ok ? "text-emerald-700" : "text-red-500"}>
                    {c.label}
                    {c.note && <span className="text-gray-400 mr-1">{c.note}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Timestamps ────────────────────────────────────── */}
        <div className="card bg-gray-50">
          <div className="flex flex-wrap gap-6 text-sm text-gray-500">
            <div>
              <span className="font-bold">أُضيفت:</span>{" "}
              {new Date(cv.created_at).toLocaleDateString("en-US", {
                year: "numeric", month: "short", day: "numeric",
              })}
            </div>
            <div>
              <span className="font-bold">آخر تعديل:</span>{" "}
              {new Date(cv.updated_at).toLocaleDateString("en-US", {
                year: "numeric", month: "short", day: "numeric",
              })}
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
