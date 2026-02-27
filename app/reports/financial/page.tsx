"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import AuthLayout from "@/components/ui/AuthLayout";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Wallet, TrendingUp, AlertCircle, CheckCircle,
  FileSpreadsheet, Printer, RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";
import { FINANCIAL_STATUSES } from "@/lib/constants";

interface ContractFinancial {
  id: string;
  contract_number: string;
  client_name?: string;
  contract_date?: string;
  client_payment: number;
  expected_from_musaned: number;
  actual_from_musaned?: number | null;
  musaned_transfer_date?: string | null;
  total_expenses: number;
  approx_profit: number;
  financial_status: string;
  ahmed_commission: number;
  wajdi_commission: number;
  external_commission_sar: number;
  agency_fee: number;
  pool_commission: number;
  sadaqa: number;
  other_expenses: number;
  musaned_fee_value: number;
}

interface ContractProfit {
  id: string;
  contract_number: string;
  total_in: number;
  total_out: number;
  ledger_profit: number;
}

interface MonthlyRow {
  month: string;
  monthLabel: string;
  contracts: number;
  expected: number;
  actual: number;
  profit: number;
}

export default function FinancialDashboardPage() {
  const [contracts, setContracts] = useState<ContractFinancial[]>([]);
  const [profitData, setProfitData] = useState<ContractProfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [filterStatus, setFilterStatus] = useState("");
  const supabase = createClient();

  useEffect(() => { fetchData(); }, [dateFrom, dateTo, filterStatus]);

  async function fetchData() {
    setLoading(true);
    let contractsQuery = supabase
      .from("contracts")
      .select("*")
      .order("contract_date", { ascending: false });

    if (dateFrom) contractsQuery = contractsQuery.gte("contract_date", dateFrom);
    if (dateTo) contractsQuery = contractsQuery.lte("contract_date", dateTo);
    if (filterStatus) contractsQuery = contractsQuery.eq("financial_status", filterStatus);

    let profitQuery = supabase
      .from("contract_profit")
      .select("id, contract_number, total_in, total_out, ledger_profit");
    if (dateFrom) profitQuery = profitQuery.gte("contract_date", dateFrom);
    if (dateTo) profitQuery = profitQuery.lte("contract_date", dateTo);

    const [{ data: contractsData }, { data: profitResult }] = await Promise.all([
      contractsQuery,
      profitQuery,
    ]);

    setContracts(contractsData || []);
    setProfitData(profitResult || []);
    setLoading(false);
  }

  const merged = contracts.map((c) => {
    const p = profitData.find((x) => x.id === c.id);
    return {
      ...c,
      total_in: p?.total_in ?? 0,
      total_out: p?.total_out ?? 0,
      ledger_profit: p?.ledger_profit ?? c.approx_profit ?? 0,
    };
  });

  // ── Stats ───────────────────────────────────────────────────
  const totalExpected = contracts.reduce((s, c) => s + (c.expected_from_musaned || 0), 0);
  const totalActual = contracts.reduce((s, c) => s + (c.actual_from_musaned || 0), 0);
  const pendingContracts = contracts.filter(
    (c) => !c.actual_from_musaned && c.financial_status !== "cancelled_before_arrival"
  );
  const pendingAmount = pendingContracts.reduce((s, c) => s + (c.expected_from_musaned || 0), 0);
  const totalProfit = merged.reduce((s, c) => s + c.ledger_profit, 0);
  const totalExpenses = contracts.reduce((s, c) => s + (c.total_expenses || 0), 0);

  // ── Monthly chart data ──────────────────────────────────────
  const monthlyMap = new Map<string, MonthlyRow>();
  merged.forEach((c) => {
    if (!c.contract_date) return;
    const month = c.contract_date.substring(0, 7);
    const existing = monthlyMap.get(month) ?? {
      month,
      monthLabel: new Date(month + "-01").toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      }),
      contracts: 0,
      expected: 0,
      actual: 0,
      profit: 0,
    };
    existing.contracts++;
    existing.expected += c.expected_from_musaned || 0;
    existing.actual += c.actual_from_musaned || 0;
    existing.profit += c.ledger_profit;
    monthlyMap.set(month, existing);
  });
  const monthlyData = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);

  // ── Helpers ─────────────────────────────────────────────────
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtN = (n?: number | null) => (n != null ? fmt(n) : "—");

  // ── Excel Export ────────────────────────────────────────────
  function exportToExcel() {
    const rows = merged.map((c) => ({
      "رقم العقد": c.contract_number,
      "اسم العميل": c.client_name ?? "",
      "تاريخ العقد": c.contract_date ?? "",
      "المبلغ المدفوع (ر.س)": c.client_payment,
      "رسوم مساند (ر.س)": c.musaned_fee_value,
      "المتوقع من مساند (ر.س)": c.expected_from_musaned,
      "المستلم فعلياً (ر.س)": c.actual_from_musaned ?? 0,
      "تاريخ التحويل": c.musaned_transfer_date ?? "",
      "الفرق (ر.س)": (c.actual_from_musaned ?? 0) - c.expected_from_musaned,
      "إجمالي المصروفات (ر.س)": c.total_expenses,
      "عمولة خارجية (ر.س)": c.external_commission_sar,
      "عمولة أحمد (ر.س)": c.ahmed_commission,
      "عمولة وجدي (ر.س)": c.wajdi_commission,
      "رسوم الوكالة (ر.س)": c.agency_fee,
      "الربح التقريبي (ر.س)": c.approx_profit,
      "الربح من السجل (ر.س)": c.ledger_profit,
      "الحالة المالية": FINANCIAL_STATUSES.find((s) => s.value === c.financial_status)?.label ?? c.financial_status,
    }));

    // Monthly summary sheet
    const monthlyRows = monthlyData.map((m) => ({
      الشهر: m.month,
      "عدد العقود": m.contracts,
      "المتوقع من مساند (ر.س)": m.expected,
      "المستلم فعلياً (ر.س)": m.actual,
      "الربح (ر.س)": m.profit,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "تفاصيل العقود");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthlyRows), "الملخص الشهري");
    XLSX.writeFile(wb, `financial-report-${dateFrom}-${dateTo}.xlsx`);
  }

  return (
    <AuthLayout>
      <div id="print-area">
        <PageHeader title="التقارير المالية" subtitle="تتبع تحويلات مساند والأرباح">
          <button onClick={exportToExcel} className="btn-secondary flex items-center gap-2 text-sm no-print">
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button onClick={() => window.print()} className="btn-primary flex items-center gap-2 text-sm no-print">
            <Printer size={16} /> طباعة PDF
          </button>
        </PageHeader>

        {/* Filters */}
        <div className="card mb-6 no-print">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm mb-1">من تاريخ</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-44"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="w-52">
              <label className="block text-sm mb-1">الحالة المالية</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full"
              >
                <option value="">الكل</option>
                {FINANCIAL_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={fetchData}
              className="btn-secondary flex items-center gap-2 text-sm h-[44px]"
            >
              <RefreshCw size={16} /> تحديث
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Summary Stats ──────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
              <StatCard
                title="إجمالي العقود"
                value={contracts.length}
                icon={<Wallet size={24} className="text-navy-500" />}
                color="navy"
              />
              <StatCard
                title="المتوقع من مساند"
                value={`${fmt(totalExpected)} ر.س`}
                icon={<TrendingUp size={24} className="text-blue-600" />}
                color="blue"
              />
              <StatCard
                title="المستلم فعلياً"
                value={`${fmt(totalActual)} ر.س`}
                icon={<CheckCircle size={24} className="text-emerald-600" />}
                color="green"
              />
              <StatCard
                title="معلق التحويل"
                value={`${pendingContracts.length} عقد`}
                icon={<AlertCircle size={24} className="text-orange-600" />}
                color="orange"
                subtitle={`${fmt(pendingAmount)} ر.س`}
              />
              <StatCard
                title="إجمالي المصروفات"
                value={`${fmt(totalExpenses)} ر.س`}
                icon={<TrendingUp size={24} className="text-red-600" />}
                color="red"
              />
              <StatCard
                title="الربح الإجمالي"
                value={`${fmt(totalProfit)} ر.س`}
                icon={<TrendingUp size={24} className="text-emerald-600" />}
                color={totalProfit >= 0 ? "green" : "red"}
              />
            </div>

            {/* ── Monthly Bar Chart ──────────────────────────────── */}
            {monthlyData.length > 0 && (
              <div className="card mb-6">
                <h3 className="font-bold text-navy-500 mb-4 text-lg">
                  الملخص الشهري — متوقع مساند مقابل المستلم
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={monthlyData}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fontFamily: "Cairo", fontSize: 11 }}
                    />
                    <YAxis
                      tick={{ fontFamily: "Cairo", fontSize: 11 }}
                      tickFormatter={(v) => (v / 1000).toFixed(0) + "k"}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value.toLocaleString("en-US")} ر.س`, ""]}
                      contentStyle={{ fontFamily: "Cairo", direction: "rtl" }}
                    />
                    <Legend wrapperStyle={{ fontFamily: "Cairo" }} />
                    <Bar dataKey="expected" name="المتوقع من مساند" fill="#1B2B6B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" name="المستلم فعلياً" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="الربح" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Musaned Tracking Table ─────────────────────────── */}
            <div className="card mb-6">
              <h3 className="font-bold text-navy-500 mb-4 text-lg">
                تتبع تحويلات مساند ({contracts.length} عقد)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-navy-50">
                      <th className="text-right p-3">رقم العقد</th>
                      <th className="text-right p-3">العميل</th>
                      <th className="text-right p-3">تاريخ العقد</th>
                      <th className="text-right p-3">المتوقع (ر.س)</th>
                      <th className="text-right p-3">المستلم (ر.س)</th>
                      <th className="text-right p-3">تاريخ التحويل</th>
                      <th className="text-right p-3">الفرق (ر.س)</th>
                      <th className="text-right p-3">الربح (ر.س)</th>
                      <th className="text-right p-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {merged.map((c) => {
                      const hasActual = c.actual_from_musaned != null && c.actual_from_musaned > 0;
                      const diff = (c.actual_from_musaned ?? 0) - c.expected_from_musaned;
                      const isCancelled = c.financial_status === "cancelled_before_arrival";
                      const isPending = !hasActual && !isCancelled;
                      return (
                        <tr
                          key={c.id}
                          className={`border-b border-gray-100 hover:bg-gray-50 ${isPending ? "bg-orange-50" : ""}`}
                        >
                          <td className="p-3 font-bold text-navy-500">{c.contract_number}</td>
                          <td className="p-3">{c.client_name ?? "—"}</td>
                          <td className="p-3 text-gray-500">
                            {c.contract_date
                              ? new Date(c.contract_date).toLocaleDateString("en-US")
                              : "—"}
                          </td>
                          <td className="p-3 font-bold">{fmtN(c.expected_from_musaned)}</td>
                          <td className="p-3">
                            {hasActual ? (
                              <span className="font-bold text-emerald-600">
                                {fmtN(c.actual_from_musaned)}
                              </span>
                            ) : isCancelled ? (
                              <span className="text-gray-400">ملغي</span>
                            ) : (
                              <span className="text-orange-500 font-bold">⏳ لم يصل</span>
                            )}
                          </td>
                          <td className="p-3 text-gray-500">
                            {c.musaned_transfer_date
                              ? new Date(c.musaned_transfer_date).toLocaleDateString("en-US")
                              : "—"}
                          </td>
                          <td
                            className={`p-3 font-bold ${
                              hasActual
                                ? diff > 0
                                  ? "text-emerald-600"
                                  : diff < 0
                                  ? "text-red-600"
                                  : "text-gray-400"
                                : "text-gray-300"
                            }`}
                          >
                            {hasActual ? fmtN(diff) : "—"}
                          </td>
                          <td
                            className={`p-3 font-bold ${
                              c.ledger_profit >= 0 ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {fmtN(c.ledger_profit)}
                          </td>
                          <td className="p-3">
                            <StatusBadge status={c.financial_status} type="financial" />
                          </td>
                        </tr>
                      );
                    })}
                    {merged.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-gray-400">
                          لا توجد بيانات للفترة المحددة
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Monthly Summary Table ──────────────────────────── */}
            {monthlyData.length > 0 && (
              <div className="card">
                <h3 className="font-bold text-navy-500 mb-4 text-lg">الملخص الشهري المفصل</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-navy-50">
                        <th className="text-right p-3">الشهر</th>
                        <th className="text-right p-3">عدد العقود</th>
                        <th className="text-right p-3">المتوقع من مساند (ر.س)</th>
                        <th className="text-right p-3">المستلم فعلياً (ر.س)</th>
                        <th className="text-right p-3">الفرق (ر.س)</th>
                        <th className="text-right p-3">الربح (ر.س)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.map((m) => (
                        <tr key={m.month} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3 font-bold">{m.monthLabel}</td>
                          <td className="p-3">{m.contracts}</td>
                          <td className="p-3">{fmt(m.expected)}</td>
                          <td className="p-3 text-emerald-600 font-bold">{fmt(m.actual)}</td>
                          <td
                            className={`p-3 font-bold ${
                              m.actual - m.expected >= 0 ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {fmt(m.actual - m.expected)}
                          </td>
                          <td
                            className={`p-3 font-bold ${
                              m.profit >= 0 ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {fmt(m.profit)}
                          </td>
                        </tr>
                      ))}
                      {/* Totals row */}
                      <tr className="bg-navy-50 font-bold border-t-2 border-navy-200">
                        <td className="p-3 text-navy-500">الإجمالي</td>
                        <td className="p-3">{monthlyData.reduce((s, m) => s + m.contracts, 0)}</td>
                        <td className="p-3">{fmt(totalExpected)}</td>
                        <td className="p-3 text-emerald-600">{fmt(totalActual)}</td>
                        <td
                          className={`p-3 ${
                            totalActual - totalExpected >= 0 ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {fmt(totalActual - totalExpected)}
                        </td>
                        <td
                          className={`p-3 ${totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}
                        >
                          {fmt(totalProfit)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AuthLayout>
  );
}
