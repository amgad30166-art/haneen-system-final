"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import AuthLayout from "@/components/ui/AuthLayout";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { useRouter } from "next/navigation";
import { FINANCIAL_STATUSES } from "@/lib/constants";
import { Contract } from "@/lib/types";
import { RefreshCw, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

const MONTHS = [
  { value: "01", label: "يناير" }, { value: "02", label: "فبراير" },
  { value: "03", label: "مارس" },  { value: "04", label: "أبريل" },
  { value: "05", label: "مايو" },  { value: "06", label: "يونيو" },
  { value: "07", label: "يوليو" }, { value: "08", label: "أغسطس" },
  { value: "09", label: "سبتمبر" },{ value: "10", label: "أكتوبر" },
  { value: "11", label: "نوفمبر" },{ value: "12", label: "ديسمبر" },
];

const QUARTER_MONTHS: Record<string, string[]> = {
  "1": ["01","02","03"],
  "2": ["04","05","06"],
  "3": ["07","08","09"],
  "4": ["10","11","12"],
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterYear,    setFilterYear]   = useState("");
  const [filterQuarter, setFilterQuarter] = useState("");
  const [filterMonth,   setFilterMonth]   = useState("");
  const supabase = createClient();
  const router   = useRouter();

  useEffect(() => { fetchContracts(); }, []);

  async function fetchContracts() {
    setLoading(true);
    const { data } = await supabase
      .from("contracts")
      .select("*")
      .order("contract_date", { ascending: false });
    if (data) setContracts(data);
    setLoading(false);
  }

  /* ── available years from data ── */
  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    contracts.forEach((c) => { if (c.contract_date) years.add(c.contract_date.substring(0, 4)); });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [contracts]);

  /* ── client-side filtering ── */
  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      if (filterSearch) {
        const s = filterSearch.toLowerCase();
        if (!c.contract_number?.toLowerCase().includes(s) && !c.client_name?.toLowerCase().includes(s))
          return false;
      }
      if (filterStatus && c.financial_status !== filterStatus) return false;
      if (filterYear && (!c.contract_date || !c.contract_date.startsWith(filterYear))) return false;
      if (filterQuarter && c.contract_date) {
        const month = c.contract_date.substring(5, 7);
        if (!QUARTER_MONTHS[filterQuarter]?.includes(month)) return false;
      }
      if (filterMonth && (!c.contract_date || c.contract_date.substring(5, 7) !== filterMonth)) return false;
      return true;
    });
  }, [contracts, filterSearch, filterStatus, filterYear, filterQuarter, filterMonth]);

  /* ── when quarter changes, clear month (they conflict) ── */
  const handleQuarterChange = (v: string) => { setFilterQuarter(v); setFilterMonth(""); };
  const handleMonthChange   = (v: string) => { setFilterMonth(v);   setFilterQuarter(""); };

  /* ── forecastable = filtered minus cancelled-before-arrival contracts ──
     cancellation_status "within_5_days" or "after_5_days" means the contract
     was cancelled before arrival → financially void → excluded from totals & Excel */
  const forecastable = useMemo(() =>
    filtered.filter((c) => !c.cancellation_status || c.cancellation_status === "none"),
  [filtered]);

  /* ── totals row (from forecastable only) ── */
  const totals = useMemo(() => ({
    client_payment:        forecastable.reduce((s, c) => s + (c.client_payment || 0), 0),
    expected_from_musaned: forecastable.reduce((s, c) => s + (c.expected_from_musaned || 0), 0),
    total_expenses:        forecastable.reduce((s, c) => s + (c.total_expenses || 0), 0),
    approx_profit:         forecastable.reduce((s, c) => s + (c.approx_profit || 0), 0),
  }), [forecastable]);

  const fmt = (n?: number | null) =>
    n != null ? n.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "—";

  /* ── Excel export (forecast — cancelled contracts excluded) ── */
  function downloadExcel() {
    const rows = forecastable.map((c) => ({
      "رقم العقد":             c.contract_number,
      "اسم العميل":            c.client_name ?? "",
      "تاريخ العقد":           c.contract_date ?? "",
      "مبلغ العميل (ر.س)":    c.client_payment,
      "استقطاع مساند (ر.س)":  c.musaned_fee_value,
      "المتوقع من مساند (ر.س)": c.expected_from_musaned,
      "المستلم فعلياً (ر.س)": c.actual_from_musaned ?? 0,
      "الوعاء الضريبي (ر.س)":  c.tax_base ?? 0,
      "الضريبة 15% (ر.س)":    c.tax_15_percent ?? 0,
      "عمولة خارجية (ر.س)":   c.external_commission_sar,
      "عمولة أحمد (ر.س)":     c.ahmed_commission,
      "عمولة وجدي (ر.س)":     c.wajdi_commission,
      "الوكالة (ر.س)":         c.agency_fee,
      "عمولة البول (ر.س)":    c.pool_commission,
      "صدقة (ر.س)":           c.sadaqa,
      "مصاريف أخرى (ر.س)":   c.other_expenses,
      "إجمالي المصروفات (ر.س)": c.total_expenses,
      "الربح التقريبي (ر.س)": c.approx_profit,
      "الحالة المالية":        FINANCIAL_STATUSES.find((s) => s.value === c.financial_status)?.label ?? c.financial_status,
    }));

    /* summary row */
    rows.push({
      "رقم العقد":             "الإجمالي",
      "اسم العميل":            "",
      "تاريخ العقد":           "",
      "مبلغ العميل (ر.س)":    totals.client_payment,
      "استقطاع مساند (ر.س)":  forecastable.reduce((s, c) => s + (c.musaned_fee_value || 0), 0),
      "المتوقع من مساند (ر.س)": totals.expected_from_musaned,
      "المستلم فعلياً (ر.س)": forecastable.reduce((s, c) => s + (c.actual_from_musaned || 0), 0),
      "الوعاء الضريبي (ر.س)":  forecastable.reduce((s, c) => s + (c.tax_base || 0), 0),
      "الضريبة 15% (ر.س)":    forecastable.reduce((s, c) => s + (c.tax_15_percent || 0), 0),
      "عمولة خارجية (ر.س)":   forecastable.reduce((s, c) => s + (c.external_commission_sar || 0), 0),
      "عمولة أحمد (ر.س)":     forecastable.reduce((s, c) => s + (c.ahmed_commission || 0), 0),
      "عمولة وجدي (ر.س)":     forecastable.reduce((s, c) => s + (c.wajdi_commission || 0), 0),
      "الوكالة (ر.س)":         forecastable.reduce((s, c) => s + (c.agency_fee || 0), 0),
      "عمولة البول (ر.س)":    forecastable.reduce((s, c) => s + (c.pool_commission || 0), 0),
      "صدقة (ر.س)":           forecastable.reduce((s, c) => s + (c.sadaqa || 0), 0),
      "مصاريف أخرى (ر.س)":   forecastable.reduce((s, c) => s + (c.other_expenses || 0), 0),
      "إجمالي المصروفات (ر.س)": totals.total_expenses,
      "الربح التقريبي (ر.س)": totals.approx_profit,
      "الحالة المالية":        "",
    } as any);

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    const label = filterYear
      ? filterQuarter ? `${filterYear}-Q${filterQuarter}`
      : filterMonth   ? `${filterYear}-${filterMonth}`
      : filterYear
      : new Date().toISOString().split("T")[0];
    XLSX.utils.book_append_sheet(wb, ws, "التوقعات المالية");
    XLSX.writeFile(wb, `contracts-forecast-${label}.xlsx`);
    toast.success(`تم تصدير ${forecastable.length} عقد (${filtered.length - forecastable.length} ملغي مستبعد)`);
  }

  const columns = [
    { key: "contract_number", label: "رقم العقد", sortable: true },
    { key: "client_name", label: "العميل", sortable: true },
    {
      key: "contract_date", label: "التاريخ", sortable: true,
      render: (c: Contract) => c.contract_date ? new Date(c.contract_date).toLocaleDateString("en-US") : "—",
    },
    { key: "client_payment",       label: "المبلغ المدفوع",    render: (c: Contract) => `${fmt(c.client_payment)} ر.س` },
    { key: "expected_from_musaned",label: "المتوقع من مساند", render: (c: Contract) => `${fmt(c.expected_from_musaned)} ر.س` },
    { key: "total_expenses",       label: "المصروفات",         render: (c: Contract) => `${fmt(c.total_expenses)} ر.س` },
    { key: "approx_profit", label: "الربح التقريبي", render: (c: Contract) => {
      const val = c.approx_profit || 0;
      return <span className={val >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>{fmt(val)} ر.س</span>;
    }},
    {
      key: "financial_status", label: "الحالة المالية",
      render: (c: Contract) => <StatusBadge status={c.financial_status} type="financial" />,
      sortable: true,
    },
  ];

  return (
    <AuthLayout>
      <PageHeader title="العقود" subtitle={`${filtered.length} عقد`}>
        <button onClick={downloadExcel} className="btn-secondary flex items-center gap-2 text-sm">
          <FileSpreadsheet size={16} /> تصدير Excel
        </button>
      </PageHeader>

      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm mb-1">بحث</label>
            <input type="text" placeholder="رقم العقد أو اسم العميل..." value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)} className="w-full" />
          </div>

          {/* Year */}
          <div className="w-32">
            <label className="block text-sm mb-1">السنة</label>
            <select value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setFilterQuarter(""); setFilterMonth(""); }} className="w-full">
              <option value="">الكل</option>
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Quarter */}
          <div className="w-32">
            <label className="block text-sm mb-1">الربع</label>
            <select value={filterQuarter} onChange={(e) => handleQuarterChange(e.target.value)} className="w-full" disabled={!filterYear}>
              <option value="">الكل</option>
              <option value="1">الربع الأول</option>
              <option value="2">الربع الثاني</option>
              <option value="3">الربع الثالث</option>
              <option value="4">الربع الرابع</option>
            </select>
          </div>

          {/* Month */}
          <div className="w-36">
            <label className="block text-sm mb-1">الشهر</label>
            <select value={filterMonth} onChange={(e) => handleMonthChange(e.target.value)} className="w-full" disabled={!filterYear}>
              <option value="">الكل</option>
              {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {/* Financial status */}
          <div className="w-48">
            <label className="block text-sm mb-1">الحالة المالية</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full">
              <option value="">الكل</option>
              {FINANCIAL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <button onClick={fetchContracts} className="btn-secondary flex items-center gap-2 text-sm h-[44px]">
            <RefreshCw size={16} /> تحديث
          </button>
        </div>
      </div>

      {/* Totals strip */}
      {forecastable.length > 0 && (
        <div className="mb-4">
          {filtered.length !== forecastable.length && (
            <p className="text-xs text-gray-400 mb-2">
              * الإجماليات تشمل {forecastable.length} عقداً فعلياً — {filtered.length - forecastable.length} عقد ملغي مستبعد من التوقعات
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "إجمالي المبالغ",    value: totals.client_payment,        color: "text-navy-500" },
              { label: "المتوقع من مساند",  value: totals.expected_from_musaned,  color: "text-blue-600" },
              { label: "إجمالي المصروفات", value: totals.total_expenses,         color: "text-red-600"  },
              { label: "الربح التقريبي",    value: totals.approx_profit,          color: totals.approx_profit >= 0 ? "text-green-600" : "text-red-600" },
            ].map((t) => (
              <div key={t.label} className="card py-3 px-4">
                <p className="text-xs text-gray-500 mb-1">{t.label}</p>
                <p className={`font-bold text-lg ${t.color}`}>{fmt(t.value)} ر.س</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable columns={columns} data={filtered} onRowClick={(c) => router.push(`/contracts/${c.id}`)} />
      )}
    </AuthLayout>
  );
}
