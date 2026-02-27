"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import AuthLayout from "@/components/ui/AuthLayout";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import { useRouter } from "next/navigation";
import { NATIONALITIES, PROFESSIONS } from "@/lib/constants";
import { CV } from "@/lib/types";
import { Plus, RefreshCw, FileSpreadsheet, Copy } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

/* ── "Available" = shown on public workers page ── */
const isAvailable = (c: CV) =>
  c.internal_status === "accepted" && c.external_office_status === "ready";

const INTERNAL_STATUSES = [
  { value: "accepted",  label: "مقبولة" },
  { value: "rejected",  label: "مرفوضة" },
];

const EXTERNAL_STATUSES = [
  { value: "ready",         label: "جاهزة" },
  { value: "cancel",        label: "ملغية" },
  { value: "not_available", label: "غير متاحة" },
];

const MUSANED_STATUSES = [
  { value: "uploaded",     label: "مرفوعة على مساند" },
  { value: "not_uploaded", label: "غير مرفوعة" },
];

export default function CVsPage() {
  const [allCVs, setAllCVs]         = useState<CV[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filterNat,      setFilterNat]      = useState("");
  const [filterOffice,   setFilterOffice]   = useState("");
  const [filterInternal, setFilterInternal] = useState("");
  const [filterExternal, setFilterExternal] = useState("");
  const [filterMusaned,  setFilterMusaned]  = useState("");
  const [filterSearch,   setFilterSearch]   = useState("");
  const supabase = createClient();
  const router   = useRouter();

  useEffect(() => { fetchCVs(); }, []);

  async function fetchCVs() {
    setLoading(true);
    const { data } = await supabase
      .from("cvs")
      .select("*, external_offices(office_name)")
      .order("created_at", { ascending: false });
    if (data) setAllCVs(data as any);
    setLoading(false);
  }

  /* available CVs — for pill counts */
  const allAvailable = useMemo(() => allCVs.filter(isAvailable), [allCVs]);

  /* nationality counts (from available only) */
  const natCounts = useMemo(() => {
    const c: Record<string, number> = {};
    allAvailable.forEach((cv) => { c[cv.nationality] = (c[cv.nationality] || 0) + 1; });
    return c;
  }, [allAvailable]);

  /* office counts (from available only) */
  const officeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    allAvailable.forEach((cv) => {
      const name = cv.external_offices?.office_name ?? cv.external_office_id;
      if (name) c[name] = (c[name] || 0) + 1;
    });
    return c;
  }, [allAvailable]);

  const uniqueOffices = useMemo(() => Object.keys(officeCounts).sort(), [officeCounts]);

  /* filtered — base is allCVs (pills just filter, not restrict to available) */
  const filtered = useMemo(() => {
    return allCVs.filter((cv) => {
      if (filterNat     && cv.nationality         !== filterNat)     return false;
      if (filterOffice) {
        const name = cv.external_offices?.office_name ?? cv.external_office_id;
        if (name !== filterOffice) return false;
      }
      if (filterInternal && cv.internal_status        !== filterInternal) return false;
      if (filterExternal && cv.external_office_status !== filterExternal) return false;
      if (filterMusaned  && cv.musaned_status          !== filterMusaned)  return false;
      if (filterSearch) {
        const s = filterSearch.toLowerCase();
        if (!cv.worker_name.toLowerCase().includes(s) && !cv.passport_number.includes(s)) return false;
      }
      return true;
    });
  }, [allCVs, filterNat, filterOffice, filterInternal, filterExternal, filterMusaned, filterSearch]);

  function clearFilters() {
    setFilterNat(""); setFilterOffice("");
    setFilterInternal(""); setFilterExternal(""); setFilterMusaned("");
    setFilterSearch("");
  }

  const hasFilter = filterNat || filterOffice || filterInternal || filterExternal || filterMusaned || filterSearch;

  /* ── Copy passports ── */
  function copyPassports() {
    const passports = filtered.map((cv) => cv.passport_number).join("\n");
    if (!passports) { toast.error("لا توجد جوازات"); return; }
    navigator.clipboard.writeText(passports);
    toast.success(`تم نسخ ${filtered.length} رقم جواز`);
  }

  /* ── Excel export ── */
  function downloadExcel() {
    const rows = filtered.map((cv) => ({
      "الاسم":                  cv.worker_name,
      "رقم الجواز":             cv.passport_number,
      "الجنسية":               NATIONALITIES.find((n) => n.value === cv.nationality)?.label ?? cv.nationality,
      "المهنة":                PROFESSIONS.find((p) => p.value === cv.profession)?.label ?? cv.profession,
      "الراتب (ر.س)":          cv.salary,
      "الديانة":               cv.religion === "muslim" ? "مسلمة" : "مسيحية",
      "الحالة الزوجية":         cv.marital_status ?? "",
      "عدد الأطفال":            cv.children_count ?? 0,
      "الخبرة":                cv.new_or_experienced === "experienced" ? "لديها خبرة" : "جديدة",
      "تاريخ الميلاد":         cv.date_of_birth ?? "",
      "تاريخ الفحص الطبي":     cv.medical_exam_date ?? "",
      "مساند":                 cv.musaned_status === "uploaded" ? "مرفوعة" : "غير مرفوعة",
      "حالة المكتب الخارجي":   EXTERNAL_STATUSES.find((s) => s.value === cv.external_office_status)?.label ?? cv.external_office_status,
      "القبول الداخلي":        cv.internal_status === "accepted" ? "مقبولة" : "مرفوضة",
      "المكتب الخارجي":        cv.external_offices?.office_name ?? "",
      "السمسار":               cv.broker_name ?? "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "السير الذاتية");
    XLSX.writeFile(wb, `cvs-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success(`تم تصدير ${rows.length} سيرة ذاتية`);
  }

  /* ── pill styles ── */
  const pill = (active: boolean) =>
    `shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
      active
        ? "bg-[#0F1C4D] text-white border-[#0F1C4D] shadow"
        : "bg-white text-slate-600 border-slate-200 hover:border-navy-400"
    }`;
  const badge = (active: boolean) =>
    `px-1.5 py-0.5 rounded-full text-[10px] ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`;

  const columns = [
    {
      key: "photo_url", label: "الصورة", width: "60px",
      render: (c: CV) => c.photo_url
        ? <img src={c.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
        : <div className="w-10 h-10 rounded-full bg-gray-200" />,
    },
    { key: "worker_name",    label: "الاسم",   sortable: true },
    { key: "passport_number", label: "الجواز", sortable: true },
    {
      key: "nationality", label: "الجنسية", sortable: true,
      render: (c: CV) => NATIONALITIES.find((n) => n.value === c.nationality)?.label || c.nationality,
    },
    {
      key: "profession", label: "المهنة",
      render: (c: CV) => PROFESSIONS.find((p) => p.value === c.profession)?.label || c.profession,
    },
    { key: "salary", label: "الراتب", render: (c: CV) => `${c.salary.toLocaleString("en-US")} ر.س` },
    {
      key: "musaned_status", label: "مساند",
      render: (c: CV) => (
        <span className={`status-badge ${c.musaned_status === "uploaded" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {c.musaned_status === "uploaded" ? "مرفوعة" : "غير مرفوعة"}
        </span>
      ),
    },
    {
      key: "internal_status", label: "القبول",
      render: (c: CV) => (
        <span className={`status-badge ${c.internal_status === "accepted" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {c.internal_status === "accepted" ? "مقبولة" : "مرفوضة"}
        </span>
      ),
    },
    {
      key: "external_office_status", label: "المكتب الخارجي",
      render: (c: CV) => {
        const map: Record<string, string> = { ready: "bg-green-100 text-green-800", cancel: "bg-red-100 text-red-800", not_available: "bg-gray-100 text-gray-800" };
        const labels: Record<string, string> = { ready: "جاهزة", cancel: "ملغية", not_available: "غير متاحة" };
        return <span className={`status-badge ${map[c.external_office_status]}`}>{labels[c.external_office_status]}</span>;
      },
    },
  ];

  return (
    <AuthLayout>
      <PageHeader title="السير الذاتية" subtitle={`${filtered.length} عاملة — ${allAvailable.length} متاحة`}>
        <button onClick={copyPassports} className="btn-secondary flex items-center gap-2 text-sm">
          <Copy size={16} /> نسخ أرقام الجوازات
        </button>
        <button onClick={downloadExcel} className="btn-secondary flex items-center gap-2 text-sm">
          <FileSpreadsheet size={16} /> تصدير Excel
        </button>
        <button onClick={() => router.push("/cvs/new")} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> إضافة عاملة
        </button>
      </PageHeader>

      {/* ── Nationality pills ── */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button onClick={() => setFilterNat("")} className={pill(!filterNat)}>
          الكل <span className={badge(!filterNat)}>{allAvailable.length}</span>
        </button>
        {NATIONALITIES.map((n) => (
          <button key={n.value} onClick={() => setFilterNat(filterNat === n.value ? "" : n.value)} className={pill(filterNat === n.value)}>
            {n.label} <span className={badge(filterNat === n.value)}>{natCounts[n.value] || 0}</span>
          </button>
        ))}
      </div>

      {/* ── Office pills ── */}
      {uniqueOffices.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {uniqueOffices.map((office) => (
            <button key={office} onClick={() => setFilterOffice(filterOffice === office ? "" : office)} className={pill(filterOffice === office)}>
              {office} <span className={badge(filterOffice === office)}>{officeCounts[office]}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Search + status filters ── */}
      <div className="card mb-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm mb-1">بحث</label>
            <input type="text" placeholder="اسم أو رقم جواز..." value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)} className="w-full" />
          </div>
          <div className="w-44">
            <label className="block text-sm mb-1">القبول الداخلي</label>
            <select value={filterInternal} onChange={(e) => setFilterInternal(e.target.value)} className="w-full">
              <option value="">الكل</option>
              {INTERNAL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="w-44">
            <label className="block text-sm mb-1">حالة المكتب</label>
            <select value={filterExternal} onChange={(e) => setFilterExternal(e.target.value)} className="w-full">
              <option value="">الكل</option>
              {EXTERNAL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="w-44">
            <label className="block text-sm mb-1">مساند</label>
            <select value={filterMusaned} onChange={(e) => setFilterMusaned(e.target.value)} className="w-full">
              <option value="">الكل</option>
              {MUSANED_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          {hasFilter && (
            <button onClick={clearFilters} className="btn-secondary text-sm h-[44px]">مسح الفلاتر</button>
          )}
          <button onClick={fetchCVs} className="btn-secondary flex items-center gap-2 text-sm h-[44px]">
            <RefreshCw size={16} /> تحديث
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable columns={columns} data={filtered} onRowClick={(c) => router.push(`/cvs/${c.id}`)} />
      )}
    </AuthLayout>
  );
}
