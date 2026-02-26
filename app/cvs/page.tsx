"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import AuthLayout from "@/components/ui/AuthLayout";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import { useRouter } from "next/navigation";
import { NATIONALITIES, PROFESSIONS } from "@/lib/constants";
import { CV } from "@/lib/types";
import { Plus, RefreshCw } from "lucide-react";

export default function CVsPage() {
  const [cvs, setCvs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterNat, setFilterNat] = useState("");
  const [filterProf, setFilterProf] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => { fetchCVs(); }, [filterNat, filterProf]);

  async function fetchCVs() {
    setLoading(true);
    let query = supabase
      .from("cvs")
      .select("*, external_offices(office_name)")
      .order("created_at", { ascending: false });

    if (filterNat) query = query.eq("nationality", filterNat);
    if (filterProf) query = query.eq("profession", filterProf);

    const { data } = await query;
    if (data) setCvs(data as any);
    setLoading(false);
  }

  const filtered = cvs.filter((c) => {
    if (!filterSearch) return true;
    const s = filterSearch.toLowerCase();
    return c.worker_name.toLowerCase().includes(s) || c.passport_number.includes(s);
  });

  const columns = [
    {
      key: "photo_url", label: "الصورة", width: "60px",
      render: (c: CV) => c.photo_url
        ? <img src={c.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
        : <div className="w-10 h-10 rounded-full bg-gray-200" />,
    },
    { key: "worker_name", label: "الاسم", sortable: true },
    { key: "passport_number", label: "الجواز", sortable: true },
    {
      key: "nationality", label: "الجنسية", sortable: true,
      render: (c: CV) => NATIONALITIES.find((n) => n.value === c.nationality)?.label || c.nationality,
    },
    {
      key: "profession", label: "المهنة",
      render: (c: CV) => PROFESSIONS.find((p) => p.value === c.profession)?.label || c.profession,
    },
    { key: "salary", label: "الراتب", render: (c: CV) => `${c.salary} ر.س` },
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
      <PageHeader title="السير الذاتية" subtitle={`${filtered.length} عاملة`}>
        <button onClick={() => router.push("/cvs/new")} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> إضافة عاملة
        </button>
      </PageHeader>

      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm mb-1">بحث</label>
            <input type="text" placeholder="اسم أو جواز..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} className="w-full" />
          </div>
          <div className="w-44">
            <label className="block text-sm mb-1">الجنسية</label>
            <select value={filterNat} onChange={(e) => setFilterNat(e.target.value)} className="w-full">
              <option value="">الكل</option>
              {NATIONALITIES.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
          </div>
          <div className="w-44">
            <label className="block text-sm mb-1">المهنة</label>
            <select value={filterProf} onChange={(e) => setFilterProf(e.target.value)} className="w-full">
              <option value="">الكل</option>
              {PROFESSIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
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
