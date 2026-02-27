"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import AuthLayout from "@/components/ui/AuthLayout";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { useRouter } from "next/navigation";
import { NATIONALITIES, ORDER_STATUSES } from "@/lib/constants";
import { Order } from "@/lib/types";
import { Plus, Copy, RefreshCw, FileSpreadsheet, Printer } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

/* ── Active = has contract_number AND not arrived AND not cancelled ── */

export default function OrdersPage() {
  const [allOrders, setAllOrders]   = useState<Order[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filterNat, setFilterNat]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOffice, setFilterOffice] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo,   setFilterDateTo]   = useState("");
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus]     = useState("");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const supabase = createClient();
  const router   = useRouter();

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    setAllOrders(data ?? []);
    setLoading(false);
  }

  /* ── allActive: active contracts only (for pill counts) ── */
  const allActive = useMemo(() =>
    allOrders.filter(o =>
      o.contract_number &&
      o.order_status !== "arrived" &&
      o.order_status !== "cancelled"
    ), [allOrders]);

  /* ── filtered:
       • status select chosen  → filter from ALL orders
       • no status select      → filter from active contracts only  ── */
  const filtered = useMemo(() => {
    const base = filterStatus ? allOrders : allActive;
    return base.filter(o => {
      if (filterNat    && o.nationality     !== filterNat)    return false;
      if (filterStatus && o.order_status    !== filterStatus) return false;
      if (filterOffice && o.external_office !== filterOffice) return false;
      if (filterSearch && ![o.client_name, o.phone, o.contract_number, o.passport_number, o.worker_name]
        .some(v => v?.toLowerCase().includes(filterSearch.toLowerCase()))) return false;
      if (filterDateFrom && (!o.contract_date || o.contract_date < filterDateFrom)) return false;
      if (filterDateTo   && (!o.contract_date || o.contract_date > filterDateTo))   return false;
      return true;
    });
  }, [allOrders, allActive, filterNat, filterStatus, filterOffice, filterSearch, filterDateFrom, filterDateTo]);

  /* ── count helpers (always from allActive for pills) ── */
  const natCounts = useMemo(() => {
    const c: Record<string, number> = {};
    allActive.forEach(o => { c[o.nationality] = (c[o.nationality] || 0) + 1; });
    return c;
  }, [allActive]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    allActive.forEach(o => { c[o.order_status] = (c[o.order_status] || 0) + 1; });
    return c;
  }, [allActive]);

  const officeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    allActive.forEach(o => { if (o.external_office) c[o.external_office] = (c[o.external_office] || 0) + 1; });
    return c;
  }, [allActive]);

  const uniqueOffices  = useMemo(() => Object.keys(officeCounts).sort(), [officeCounts]);
  const activeStatuses = useMemo(() => ORDER_STATUSES.filter(s => statusCounts[s.value] > 0), [statusCounts]);

  /* statuses that exist anywhere in allOrders — for the select dropdown */
  const existingStatuses = useMemo(() => {
    const used = new Set(allOrders.map(o => o.order_status));
    return ORDER_STATUSES.filter(s => used.has(s.value));
  }, [allOrders]);

  /* ── actions ── */
  const copyAllVisa = () => {
    const visas = filtered.filter(o => o.visa_number).map(o => o.visa_number).join("\n");
    if (!visas) { toast.error("لا توجد أرقام تأشيرات"); return; }
    navigator.clipboard.writeText(visas);
    toast.success(`تم نسخ ${visas.split("\n").length} رقم تأشيرة`);
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    const { error } = await supabase
      .from("orders").update({ order_status: bulkStatus }).in("id", Array.from(selectedIds));
    if (error) { toast.error("حدث خطأ أثناء التحديث"); return; }
    toast.success(`تم تحديث ${selectedIds.size} عقد`);
    setSelectedIds(new Set()); setShowBulkModal(false); setBulkStatus("");
    fetchAll();
  };

  /* ── download helpers ── */
  const exportRows = () => filtered.map(o => ({
    "اسم العميل":       o.client_name,
    "الجوال":           o.phone,
    "الجنسية":          NATIONALITIES.find(n => n.value === o.nationality)?.label ?? o.nationality,
    "اسم العاملة":      o.worker_name      ?? "",
    "رقم العقد":        o.contract_number  ?? "",
    "رقم الهوية":       o.national_id      ?? "",
    "رقم التأشيرة":     o.visa_number      ?? "",
    "الحالة":           ORDER_STATUSES.find(s => s.value === o.order_status)?.label ?? o.order_status,
    "تاريخ العقد":      o.contract_date ?? "",
    "رقم الجواز":       o.passport_number  ?? "",
    "المكتب الخارجي":   o.external_office  ?? "",
  }));

  function downloadExcel() {
    const rows = exportRows();
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "العقود السارية");
    XLSX.writeFile(wb, `العقود_السارية_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success(`تم تصدير ${rows.length} عقد`);
  }

  function downloadPDF() { window.print(); }

  /* ── pill helper ── */
  const pill = (active: boolean) =>
    `shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
      active
        ? "bg-[#0F1C4D] text-white border-[#0F1C4D] shadow"
        : "bg-white text-slate-600 border-slate-200 hover:border-navy-400"
    }`;
  const badge = (active: boolean) =>
    `px-1.5 py-0.5 rounded-full text-[10px] ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`;

  /* ════════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── Print styles ── */}
      <style>{`
        #print-area {
          position: fixed;
          top: 0; left: 0;
          width: 100vw;
          background: white;
          direction: rtl;
          padding: 24px;
          transform: translateX(-100vw);
          z-index: 0;
        }
        @media print {
          body * { visibility: hidden; }
          #print-area { transform: none !important; visibility: visible; }
          #print-area * { visibility: visible; }
          #print-area table { width: 100%; border-collapse: collapse; font-size: 10px; }
          #print-area th, #print-area td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: right; }
          #print-area th { background: #0F1C4D; color: white; }
        }
      `}</style>

      <AuthLayout>
        {/* ── Header ── */}
        <PageHeader
          title="العقود السارية"
          subtitle={`${filtered.length} عقد من أصل ${allActive.length}`}
        >
          <button onClick={copyAllVisa} className="btn-secondary flex items-center gap-2 text-sm">
            <Copy size={16} /> نسخ التأشيرات
          </button>
          <button onClick={() => router.push("/orders/new")} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> عقد جديد
          </button>
        </PageHeader>

        {/* ── Filter card ── */}
        <div className="card mb-5 space-y-4">

          {/* Nationality pills */}
          <div>
            <p className="text-xs font-bold text-slate-400 mb-2">الجنسية</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilterNat("")} className={pill(filterNat === "")}>
                الكل <span className={badge(filterNat === "")}>{allActive.length}</span>
              </button>
              {NATIONALITIES.filter(n => natCounts[n.value] > 0).map(n => (
                <button key={n.value} onClick={() => setFilterNat(filterNat === n.value ? "" : n.value)} className={pill(filterNat === n.value)}>
                  {n.label}
                  <span className={badge(filterNat === n.value)}>{natCounts[n.value]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Status pills */}
          <div>
            <p className="text-xs font-bold text-slate-400 mb-2">الحالة</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilterStatus("")} className={pill(filterStatus === "")}>
                الكل <span className={badge(filterStatus === "")}>{allActive.length}</span>
              </button>
              {activeStatuses.map(s => (
                <button key={s.value} onClick={() => setFilterStatus(filterStatus === s.value ? "" : s.value)} className={pill(filterStatus === s.value)}>
                  {s.label}
                  <span className={badge(filterStatus === s.value)}>{statusCounts[s.value]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Office pills */}
          {uniqueOffices.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 mb-2">المكتب الخارجي</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setFilterOffice("")} className={pill(filterOffice === "")}>
                  الكل <span className={badge(filterOffice === "")}>{allActive.length}</span>
                </button>
                {uniqueOffices.map(office => (
                  <button key={office} onClick={() => setFilterOffice(filterOffice === office ? "" : office)} className={pill(filterOffice === office)}>
                    {office}
                    <span className={badge(filterOffice === office)}>{officeCounts[office]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date range + status select + search + actions row */}
          <div className="flex flex-wrap gap-3 items-center pt-1 border-t border-slate-100">
            {/* Date range */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-400 whitespace-nowrap">تاريخ العقد من</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className="text-sm h-[44px] px-3 border border-slate-200 rounded-xl outline-none focus:border-navy-400"
              />
              <label className="text-xs font-bold text-slate-400 whitespace-nowrap">إلى</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className="text-sm h-[44px] px-3 border border-slate-200 rounded-xl outline-none focus:border-navy-400"
              />
              {(filterDateFrom || filterDateTo) && (
                <button
                  onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); }}
                  className="text-xs text-red-500 hover:text-red-700 font-bold px-2"
                >✕</button>
              )}
            </div>
            {/* Status select */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="h-[44px] px-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-navy-400 bg-white"
            >
              <option value="">كل الحالات</option>
              {existingStatuses.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="بحث: اسم، جوال، رقم عقد، جواز..."
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              className="flex-1 min-w-[180px]"
            />
            <button onClick={fetchAll} className="btn-secondary flex items-center gap-2 text-sm h-[44px]">
              <RefreshCw size={16} /> تحديث
            </button>
            <button onClick={downloadExcel}
              className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl border-2 border-emerald-600 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors h-[44px]">
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button onClick={downloadPDF}
              className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl border-2 border-slate-500 text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors h-[44px]">
              <Printer size={16} /> PDF
            </button>
          </div>
        </div>

        {/* ── Bulk Actions ── */}
        {selectedIds.size > 0 && (
          <div className="bg-navy-50 border border-navy-200 rounded-xl p-4 mb-4 flex flex-wrap items-center gap-4">
            <span className="font-bold text-navy-500">تم تحديد {selectedIds.size} عقد</span>
            <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className="w-48">
              <option value="">اختر الحالة الجديدة</option>
              {ORDER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button onClick={() => { if (!bulkStatus) { toast.error("اختر حالة أولاً"); return; } setShowBulkModal(true); }} className="btn-primary text-sm">
              تحديث الحالة
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-500 hover:text-gray-700">
              إلغاء التحديد
            </button>
          </div>
        )}

        {/* ── Table ── */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-3 px-3 w-10">
                    <input type="checkbox"
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={e => setSelectedIds(e.target.checked ? new Set(filtered.map(o => o.id)) : new Set())} />
                  </th>
                  {["اسم العميل","الجوال","الجنسية","العاملة","رقم العقد","الهوية","التأشيرة","الحالة","تاريخ العقد","رقم الجواز"].map(h => (
                    <th key={h} className="text-right py-3 px-3 font-bold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id}
                    onClick={() => router.push(`/orders/${o.id}`)}
                    className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${selectedIds.has(o.id) ? "bg-blue-50" : ""}`}>
                    <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(o.id)}
                        onChange={e => {
                          const s = new Set(selectedIds);
                          e.target.checked ? s.add(o.id) : s.delete(o.id);
                          setSelectedIds(s);
                        }} />
                    </td>
                    <td className="py-3 px-3 font-bold">{o.client_name}</td>
                    <td className="py-3 px-3 text-slate-500">{o.phone}</td>
                    <td className="py-3 px-3">{NATIONALITIES.find(n => n.value === o.nationality)?.label ?? o.nationality}</td>
                    <td className="py-3 px-3">{o.worker_name ?? "—"}</td>
                    <td className="py-3 px-3 font-mono text-xs">{o.contract_number ?? "—"}</td>
                    <td className="py-3 px-3 font-mono text-xs">{o.national_id ?? "—"}</td>
                    <td className="py-3 px-3 font-mono text-xs">{o.visa_number ?? "—"}</td>
                    <td className="py-3 px-3"><StatusBadge status={o.order_status} /></td>
                    <td className="py-3 px-3 text-slate-500 text-xs whitespace-nowrap">
                      {o.contract_date ? new Date(o.contract_date).toLocaleDateString("en-US") : "—"}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs">{o.passport_number ?? "—"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center text-slate-400 py-12">لا توجد عقود مطابقة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Bulk Confirm Modal */}
        {showBulkModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-navy-500 mb-4">تأكيد التحديث الجماعي</h3>
              <p className="text-gray-600 mb-2">هل أنت متأكد من تغيير حالة <strong>{selectedIds.size}</strong> عقد إلى:</p>
              <div className="my-3"><StatusBadge status={bulkStatus} /></div>
              <div className="flex gap-3 mt-6">
                <button onClick={handleBulkUpdate} className="btn-primary flex-1">تأكيد</button>
                <button onClick={() => setShowBulkModal(false)} className="btn-secondary flex-1">إلغاء</button>
              </div>
            </div>
          </div>
        )}
      </AuthLayout>

      {/* ══ PDF print area (off-screen normally, full-screen when printing) ══ */}
      <div id="print-area" dir="rtl">
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: "bold", color: "#0F1C4D", marginBottom: 4 }}>
            العقود السارية
            {filterNat    && ` — ${NATIONALITIES.find(n => n.value === filterNat)?.label}`}
            {filterStatus && ` — ${ORDER_STATUSES.find(s => s.value === filterStatus)?.label}`}
            {filterOffice && ` — ${filterOffice}`}
          </h2>
          <p style={{ fontSize: 11, color: "#64748b" }}>
            عدد العقود: {filtered.length} | تاريخ الطباعة: {new Date().toISOString().split("T")[0]}
          </p>
        </div>
        <table>
          <thead>
            <tr>
              {["اسم العميل","الجوال","الجنسية","اسم العاملة","رقم العقد","رقم الهوية","رقم التأشيرة","الحالة","تاريخ العقد","رقم الجواز","المكتب الخارجي"].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id}>
                <td>{o.client_name}</td>
                <td>{o.phone}</td>
                <td>{NATIONALITIES.find(n => n.value === o.nationality)?.label ?? o.nationality}</td>
                <td>{o.worker_name ?? ""}</td>
                <td>{o.contract_number ?? ""}</td>
                <td>{o.national_id ?? ""}</td>
                <td>{o.visa_number ?? ""}</td>
                <td>{ORDER_STATUSES.find(s => s.value === o.order_status)?.label ?? o.order_status}</td>
                <td>{o.contract_date ?? ""}</td>
                <td>{o.passport_number ?? ""}</td>
                <td>{o.external_office ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
