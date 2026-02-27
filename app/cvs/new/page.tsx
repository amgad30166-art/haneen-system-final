"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import AuthLayout from "@/components/ui/AuthLayout";
import PageHeader from "@/components/ui/PageHeader";
import { useRouter } from "next/navigation";
import { NATIONALITIES, PROFESSIONS, RELIGIONS, MARITAL_STATUSES, MIN_WORKER_AGE, MAX_WORKER_AGE } from "@/lib/constants";
import { ExternalOffice } from "@/lib/types";
import { toast } from "sonner";
import { Save, Upload, X, Video } from "lucide-react";

export default function NewCVPage() {
  const supabase = createClient();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [offices, setOffices] = useState<ExternalOffice[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");

  const [form, setForm] = useState({
    worker_name: "",
    passport_number: "",
    date_of_birth: "",
    religion: "muslim",
    video_url: "",
    medical_exam_date: "",
    musaned_status: "not_uploaded",
    external_office_status: "not_available",
    internal_status: "rejected",
    new_or_experienced: "new",
    nationality: "ethiopia",
    profession: "housemaid",
    external_office_id: "",
    broker_name: "",
    marital_status: "single",
    children_count: "0",
    salary: "",
  });

  useEffect(() => { fetchOffices(); }, []);

  useEffect(() => {
    if (form.nationality === "india") {
      setForm((f) => ({ ...f, profession: "private_driver" }));
    }
  }, [form.nationality]);

  async function fetchOffices() {
    const { data } = await supabase.from("external_offices").select("*").order("office_name");
    if (data) setOffices(data);
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
    if (!form.date_of_birth) return false;
    const dob = new Date(form.date_of_birth);
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 86400000));
    if (age < MIN_WORKER_AGE || age > MAX_WORKER_AGE) {
      toast.error(`عمر العاملة يجب أن يكون بين ${MIN_WORKER_AGE} و ${MAX_WORKER_AGE} سنة. العمر الحالي: ${age}`);
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateAge()) return;
    if (!form.external_office_id) {
      toast.error("اختر المكتب الخارجي");
      return;
    }

    setSaving(true);

    // Check passport uniqueness
    const { count } = await supabase
      .from("cvs")
      .select("*", { count: "exact", head: true })
      .eq("passport_number", form.passport_number);

    if (count && count > 0) {
      toast.error("رقم الجواز مستخدم بالفعل");
      setSaving(false);
      return;
    }

    // Upload full-body photo
    let photo_url = "";
    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const path = `${form.passport_number}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("worker-photos").upload(path, photoFile, { upsert: true });
      if (uploadErr) { toast.error("خطأ في رفع الصورة: " + uploadErr.message); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("worker-photos").getPublicUrl(path);
      photo_url = urlData.publicUrl;
    }

    // Upload profile photo (head & shoulders)
    let profile_photo = "";
    if (profilePhotoFile) {
      const ext = profilePhotoFile.name.split(".").pop();
      const path = `profile_${form.passport_number}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("worker-photos").upload(path, profilePhotoFile, { upsert: true });
      if (uploadErr) { toast.error("خطأ في رفع صورة الوجه: " + uploadErr.message); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("worker-photos").getPublicUrl(path);
      profile_photo = urlData.publicUrl;
    }

    const { error } = await supabase.from("cvs").insert({
      worker_name: form.worker_name,
      passport_number: form.passport_number,
      date_of_birth: form.date_of_birth || null,
      religion: form.religion,
      photo_url: photo_url || null,
      profile_photo: profile_photo || null,
      video_url: form.video_url || null,
      medical_exam_date: form.medical_exam_date || null,
      musaned_status: form.musaned_status,
      external_office_status: form.external_office_status,
      internal_status: form.internal_status,
      new_or_experienced: form.new_or_experienced,
      nationality: form.nationality,
      profession: form.profession,
      external_office_id: form.external_office_id,
      broker_name: form.broker_name || null,
      marital_status: form.marital_status || null,
      children_count: parseInt(form.children_count) || 0,
      salary: parseFloat(form.salary) || 0,
    });

    if (error) {
      toast.error("خطأ: " + error.message);
    } else {
      toast.success("تم إضافة السيرة الذاتية بنجاح");
      router.push("/cvs");
    }
    setSaving(false);
  }

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <AuthLayout>
      <PageHeader title="إضافة عاملة جديدة" subtitle="سيرة ذاتية جديدة" />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* Photos + Video */}
        <div className="card">
          <h3 className="font-bold text-navy-500 mb-4">الصور والفيديو</h3>
          <div className="flex flex-wrap gap-6 items-start">

            {/* Profile photo — head & shoulders */}
            <div>
              <label className="block text-sm font-bold mb-1">صورة الوجه والكتفين</label>
              <p className="text-xs text-gray-400 mb-2">تظهر على بطاقة العاملة للعملاء</p>
              {profilePhotoPreview ? (
                <div className="relative w-36 h-36">
                  <img src={profilePhotoPreview} alt="" className="w-full h-full object-cover object-top rounded-xl border border-gray-200" />
                  <button type="button" onClick={() => { setProfilePhotoFile(null); setProfilePhotoPreview(""); }}
                    className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                    <X size={14} />
                  </button>
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
              {photoPreview ? (
                <div className="relative w-36 h-52">
                  <img src={photoPreview} alt="" className="w-full h-full object-cover rounded-xl border border-gray-200" />
                  <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(""); }}
                    className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                    <X size={14} />
                  </button>
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
                <Video size={20} className="text-gray-400" />
                <input type="url" value={form.video_url}
                  onChange={(e) => update("video_url", e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="flex-1" dir="ltr" />
              </div>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="card">
          <h3 className="font-bold text-navy-500 mb-4">البيانات الشخصية</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">اسم العاملة *</label>
              <input type="text" required value={form.worker_name} onChange={(e) => update("worker_name", e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm mb-1">رقم الجواز *</label>
              <input type="text" required value={form.passport_number} onChange={(e) => update("passport_number", e.target.value)} className="w-full" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm mb-1">تاريخ الميلاد</label>
              <input type="date" value={form.date_of_birth} onChange={(e) => update("date_of_birth", e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm mb-1">الديانة *</label>
              <select value={form.religion} onChange={(e) => update("religion", e.target.value)} className="w-full">
                {RELIGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">الجنسية *</label>
              <select value={form.nationality} onChange={(e) => update("nationality", e.target.value)} className="w-full">
                {NATIONALITIES.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">المهنة *</label>
              <select value={form.profession} onChange={(e) => update("profession", e.target.value)} className="w-full" disabled={form.nationality === "india"}>
                {form.nationality === "india"
                  ? <option value="private_driver">سائق خاص</option>
                  : PROFESSIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)
                }
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">الحالة الاجتماعية</label>
              <select value={form.marital_status} onChange={(e) => update("marital_status", e.target.value)} className="w-full">
                {MARITAL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">عدد الأطفال</label>
              <input type="number" min="0" value={form.children_count} onChange={(e) => update("children_count", e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm mb-1">الراتب (ريال) *</label>
              <input type="number" required min="0" step="0.01" value={form.salary} onChange={(e) => update("salary", e.target.value)} className="w-full" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm mb-1">جديدة / سبق لها العمل *</label>
              <select value={form.new_or_experienced} onChange={(e) => update("new_or_experienced", e.target.value)} className="w-full">
                <option value="new">جديدة</option>
                <option value="experienced">سبق لها العمل</option>
              </select>
            </div>
          </div>
        </div>

        {/* Office & Status */}
        <div className="card">
          <h3 className="font-bold text-navy-500 mb-4">المكتب والحالة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">المكتب الخارجي *</label>
              <select required value={form.external_office_id} onChange={(e) => update("external_office_id", e.target.value)} className="w-full">
                <option value="">اختر المكتب</option>
                {offices.map((o) => <option key={o.id} value={o.id}>{o.office_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">اسم السمسار</label>
              <input type="text" value={form.broker_name} onChange={(e) => update("broker_name", e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm mb-1">تاريخ الفحص الطبي</label>
              <input type="date" value={form.medical_exam_date} onChange={(e) => update("medical_exam_date", e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm mb-1">حالة مساند *</label>
              <select value={form.musaned_status} onChange={(e) => update("musaned_status", e.target.value)} className="w-full">
                <option value="uploaded">مرفوعة</option>
                <option value="not_uploaded">غير مرفوعة</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">تحديث المكتب الخارجي *</label>
              <select value={form.external_office_status} onChange={(e) => update("external_office_status", e.target.value)} className="w-full">
                <option value="ready">جاهزة (Ready)</option>
                <option value="cancel">ملغية (Cancel)</option>
                <option value="not_available">غير متاحة</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">قبول حنين الشرق *</label>
              <select value={form.internal_status} onChange={(e) => update("internal_status", e.target.value)} className="w-full">
                <option value="accepted">مقبولة (Accepted)</option>
                <option value="rejected">مرفوضة (Rejected)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={18} />}
            حفظ السيرة الذاتية
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">إلغاء</button>
        </div>
      </form>
    </AuthLayout>
  );
}
