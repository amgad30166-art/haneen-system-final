"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import AuthLayout from "@/components/ui/AuthLayout";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Wallet, TrendingUp, Building2,
  AlertCircle, CheckCircle, RefreshCw, Eye,
} from "lucide-react";
import { NATIONALITIES } from "@/lib/constants";

interface ContractRow {
  id: string;
  contract_number: string;
  contract_date?: string;
  financial_status: string;
  client_payment: number;
  expected_from_musaned: number;
  actual_from_musaned?: number | null;
  total_expenses: number;
  approx_profit: number;
  // merged from contract_profit view
  total_in: number;
  total_out: number;
  ledger_profit: number;
}

interface ExternalBalance {
  id: string;
  office_name: string;
  country: string;
  total_owed_usd: number;
  total_paid_usd: number;
  balance_usd: number;
  balance_sar: number;
}

interface MonthlyProfit {
  month: string;
  monthLabel: string;
  contracts: number;
  revenue: number;
  profit: number;
}

interface OwnerStats {
  totalContracts: number;
  totalRevenue: number;
  totalExpectedMusaned: number;
  totalActualMusaned: number;
  pendingMusaned: number;
  totalExpenses: number;
  ledgerProfit: number;
  underGuarantee: number;
  settled: number;
  cancelledCount: number;
}

const COLORS = ["#1B2B6B", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];

export default function OwnerDashboardPage() {
  const [stats, setStats] = useState<OwnerStats>({
    totalContracts: 0, totalRevenue: 0, totalExpectedMusaned: 0,
    totalActualMusaned: 0, pendingMusaned: 0, totalExpenses: 0,
    ledgerProfit: 0, underGuarantee: 0, settled: 0, cancelledCount: 0,
  });
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [externalBalances, setExternalBalances] = useState<ExternalBalance[]>([]);
  const [monthlyProfits, setMonthlyProfits] = useState<MonthlyProfit[]>([]);
  const [nationalityData, setNationalityData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const supabase = createClient();

  useEffect(() => { fetchData(); }, [yearFilter]);

  async function fetchData() {
    setLoading(true);
    const yearStart = `${yearFilter}-01-01`;
    const yearEnd = `${yearFilter}-12-31`;

    const [
      { data: contractsRaw },
      { data: profitRaw },
      { data: balancesData },
      { data: ordersData },
      { count: underGuaranteeCount },
      { count: settledCount },
      { count: cancelledCount },
    ] = await Promise.all([
      // Contracts table — has actual_from_musaned
      supabase
        .from("contracts")
        .select("id, contract_number, contract_date, financial_status, client_payment, expected_from_musaned, actual_from_musaned, total_expenses, approx_profit")
        .gte("contract_date", yearStart)
        .lte("contract_date", yearEnd)
        .order("contract_date", { ascending: false }),
      // Ledger view — has true profit
      supabase
        .from("contract_profit")
        .select("id, total_in, total_out, ledger_profit")
        .gte("contract_date", yearStart)
        .lte("contract_date", yearEnd),
      supabase.from("external_office_balances").select("*"),
      supabase
        .from("orders")
        .select("nationality, order_status")
        .gte("created_at", yearStart)
        .lte("created_at", yearEnd),
      supabase.from("contracts").select("*", { count: "exact", head: true }).eq("financial_status", "under_guarantee"),
      supabase.from("contracts").select("*", { count: "exact", head: true }).eq("financial_status", "settled"),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("order_status", "cancelled").gte("created_at", yearStart).lte("created_at", yearEnd),
    ]);

    // Merge ledger profit into contract rows
    const merged: ContractRow[] = (contractsRaw ?? []).map((c) => {
      const p = (profitRaw ?? []).find((x) => x.id === c.id);
      return {
        ...c,
        total_in: p?.total_in ?? 0,
        total_out: p?.total_out ?? 0,
        ledger_profit: p?.ledger_profit ?? c.approx_profit ?? 0,
      };
    });

    // ── Compute summary stats ─────────────────────────────
    const totalContracts = merged.length;
    const totalRevenue = merged.reduce((s, c) => s + (c.client_payment || 0), 0);
    const totalExpectedMusaned = merged.reduce((s, c) => s + (c.expected_from_musaned || 0), 0);
    const totalActualMusaned = merged.reduce((s, c) => s + (c.actual_from_musaned || 0), 0);
    const pendingMusaned = merged.filter(
      (c) => !c.actual_from_musaned && c.financial_status !== "cancelled_before_arrival"
    ).length;
    const totalExpenses = merged.reduce((s, c) => s + (c.total_expenses || 0), 0);
    const ledgerProfit = merged.reduce((s, c) => s + c.ledger_profit, 0);

    // Monthly profits
    const monthMap = new Map<string, MonthlyProfit>();
    merged.forEach((c) => {
      if (!c.contract_date) return;
      const m = c.contract_date.substring(0, 7);
      const existing = monthMap.get(m) ?? {
        month: m,
        monthLabel: new Date(m + "-01").toLocaleDateString("ar-SA", { month: "short" }),
        contracts: 0, revenue: 0, profit: 0,
      };
      existing.contracts++;
      existing.revenue += c.client_payment || 0;
      existing.profit += c.ledger_profit;
      monthMap.set(m, existing);
    });
    const monthly = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    // Nationality distribution
    const natMap = new Map<string, number>();
    (ordersData ?? []).forEach((o) => {
      natMap.set(o.nationality, (natMap.get(o.nationality) ?? 0) + 1);
    });
    const natData = Array.from(natMap.entries()).map(([nat, count]) => ({
      name: NATIONALITIES.find((n) => n.value === nat)?.label ?? nat,
      value: count,
    }));

    setStats({
      totalContracts, totalRevenue, totalExpectedMusaned,
      totalActualMusaned, pendingMusaned, totalExpenses, ledgerProfit,
      underGuarantee: underGuaranteeCount ?? 0,
      settled: settledCount ?? 0,
      cancelledCount: cancelledCount ?? 0,
    });
    setContracts(merged);
    setExternalBalances(balancesData ?? []);
    setMonthlyProfits(monthly);
    setNationalityData(natData);
    setLoading(false);
  }

  const fmt = (n: number) =>
    n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalOwedUSD = externalBalances.reduce((s, b) => s + (b.balance_usd || 0), 0);
  const yearOptions = [2023, 2024, 2025, 2026];

  return (
    <AuthLayout>
      <PageHeader title="لوحة المالك" subtitle="نظرة مالية شاملة — للاطلاع فقط">
        <div className="flex items-center gap-2 bg-navy-50 text-navy-500 px-3 py-2 rounded-lg text-sm font-bold">
          <Eye size={16} />
          للاطلاع فقط
        </div>
        <button onClick={fetchData} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={16} /> تحديث
        </button>
      </PageHeader>

      {/* Year filter */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <label className="font-bold text-sm">السنة:</label>
          <div className="flex gap-2 flex-wrap">
            {yearOptions.map((y) => (
              <button
                key={y}
                onClick={() => setYearFilter(String(y))}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  yearFilter === String(y)
                    ? "bg-navy-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-navy-50"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Primary Stats ──────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="إجمالي العقود"
              value={stats.totalContracts}
              icon={<Wallet size={24} className="text-navy-500" />}
              color="navy"
            />
            <StatCard
              title="إجمالي الإيرادات"
              value={`${fmt(stats.totalRevenue)} ر.س`}
              icon={<TrendingUp size={24} className="text-blue-600" />}
              color="blue"
            />
            <StatCard
              title="الربح الحقيقي (السجل)"
              value={`${fmt(stats.ledgerProfit)} ر.س`}
              icon={<TrendingUp size={24} className="text-emerald-600" />}
              color={stats.ledgerProfit >= 0 ? "green" : "red"}
              subtitle="من السجل المحاسبي"
            />
            <StatCard
              title="إجمالي المصروفات"
              value={`${fmt(stats.totalExpenses)} ر.س`}
              icon={<AlertCircle size={24} className="text-red-600" />}
              color="red"
            />
          </div>

          {/* ── Musaned Stats ──────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="المتوقع من مساند"
              value={`${fmt(stats.totalExpectedMusaned)} ر.س`}
              icon={<Wallet size={24} className="text-navy-500" />}
              color="navy"
            />
            <StatCard
              title="المستلم من مساند"
              value={`${fmt(stats.totalActualMusaned)} ر.س`}
              icon={<CheckCircle size={24} className="text-emerald-600" />}
              color="green"
            />
            <StatCard
              title="معلق التحويل"
              value={`${stats.pendingMusaned} عقد`}
              icon={<AlertCircle size={24} className="text-orange-600" />}
              color="orange"
            />
            <StatCard
              title="مستحق للمكاتب"
              value={`${totalOwedUSD.toFixed(2)} USD`}
              icon={<Building2 size={24} className="text-purple-600" />}
              color="navy"
              subtitle={`${fmt(totalOwedUSD * 3.75)} ر.س`}
            />
          </div>

          {/* ── Status summary ─────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="card text-center border-t-4 border-orange-400">
              <p className="text-sm font-bold text-gray-500 mb-1">تحت الضمان</p>
              <p className="text-4xl font-bold text-orange-600">{stats.underGuarantee}</p>
            </div>
            <div className="card text-center border-t-4 border-emerald-500">
              <p className="text-sm font-bold text-gray-500 mb-1">مكتمل</p>
              <p className="text-4xl font-bold text-emerald-600">{stats.settled}</p>
            </div>
            <div className="card text-center border-t-4 border-red-500">
              <p className="text-sm font-bold text-gray-500 mb-1">ملغي ({yearFilter})</p>
              <p className="text-4xl font-bold text-red-600">{stats.cancelledCount}</p>
            </div>
          </div>

          {/* ── Monthly Profit Chart ───────────────────────────── */}
          {monthlyProfits.length > 0 && (
            <div className="card mb-6">
              <h3 className="font-bold text-navy-500 mb-4 text-lg">الأرباح الشهرية</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyProfits} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="monthLabel" tick={{ fontFamily: "Cairo", fontSize: 11 }} />
                  <YAxis
                    tick={{ fontFamily: "Cairo", fontSize: 11 }}
                    tickFormatter={(v) => (v / 1000).toFixed(0) + "k"}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v.toLocaleString()} ر.س`, ""]}
                    contentStyle={{ fontFamily: "Cairo", direction: "rtl" }}
                  />
                  <Legend wrapperStyle={{ fontFamily: "Cairo" }} />
                  <Bar dataKey="revenue" name="الإيرادات" fill="#1B2B6B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="الربح" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Nationality + External Balances ───────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Nationality */}
            <div className="card">
              <h3 className="font-bold text-navy-500 mb-4">توزيع الجنسيات ({yearFilter})</h3>
              {nationalityData.length > 0 ? (
                <div className="flex items-center gap-6 flex-wrap">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie
                        data={nationalityData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {nationalityData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontFamily: "Cairo" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2 text-sm flex-1">
                    {nationalityData.map((n, i) => (
                      <div key={n.name} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          />
                          <span className="font-bold">{n.name}</span>
                        </div>
                        <span className="text-gray-500">{n.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">لا توجد بيانات</p>
              )}
            </div>

            {/* External Balances */}
            <div className="card">
              <h3 className="font-bold text-navy-500 mb-4">أرصدة المكاتب الخارجية</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {externalBalances.length > 0 ? (
                  externalBalances.map((b) => (
                    <div
                      key={b.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        b.balance_usd > 0
                          ? "border-orange-200 bg-orange-50"
                          : "border-gray-100 bg-gray-50"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-sm">{b.office_name}</p>
                        <p className="text-xs text-gray-400">
                          {NATIONALITIES.find((n) => n.value === b.country)?.label ?? b.country}
                        </p>
                      </div>
                      <div className="text-left">
                        <p
                          className={`font-bold text-sm ${
                            b.balance_usd > 0 ? "text-orange-600" : "text-emerald-600"
                          }`}
                        >
                          {b.balance_usd > 0
                            ? `مستحق: ${b.balance_usd.toFixed(2)} USD`
                            : "مسدد ✓"}
                        </p>
                        {b.balance_usd > 0 && (
                          <p className="text-xs text-gray-400">{fmt(b.balance_sar)} ر.س</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center py-6">لا توجد بيانات</p>
                )}
              </div>
              {externalBalances.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm font-bold">
                  <span>إجمالي المستحق:</span>
                  <span className="text-orange-600">
                    {totalOwedUSD.toFixed(2)} USD — {fmt(totalOwedUSD * 3.75)} ر.س
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Contract Profit Table ──────────────────────────── */}
          <div className="card">
            <h3 className="font-bold text-navy-500 mb-4 text-lg">
              ربح العقود من السجل المحاسبي ({contracts.length} عقد)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy-50">
                    <th className="text-right p-3">رقم العقد</th>
                    <th className="text-right p-3">تاريخ العقد</th>
                    <th className="text-right p-3">الإيراد (ر.س)</th>
                    <th className="text-right p-3">مساند متوقع (ر.س)</th>
                    <th className="text-right p-3">مساند مستلم (ر.س)</th>
                    <th className="text-right p-3">المصروفات (ر.س)</th>
                    <th className="text-right p-3">الربح — السجل (ر.س)</th>
                    <th className="text-right p-3">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3 font-bold text-navy-500">{c.contract_number}</td>
                      <td className="p-3 text-gray-500">
                        {c.contract_date
                          ? new Date(c.contract_date).toLocaleDateString("ar-SA")
                          : "—"}
                      </td>
                      <td className="p-3 font-bold">{fmt(c.client_payment || 0)}</td>
                      <td className="p-3">{fmt(c.expected_from_musaned || 0)}</td>
                      <td className="p-3">
                        {c.actual_from_musaned ? (
                          <span className="text-emerald-600 font-bold">
                            {fmt(c.actual_from_musaned)}
                          </span>
                        ) : (
                          <span className="text-orange-400 text-xs">⏳ لم يصل</span>
                        )}
                      </td>
                      <td className="p-3 text-red-600">{fmt(c.total_expenses || 0)}</td>
                      <td
                        className={`p-3 font-bold ${
                          c.ledger_profit >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {fmt(c.ledger_profit)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-full ${
                            c.financial_status === "settled"
                              ? "bg-emerald-100 text-emerald-700"
                              : c.financial_status === "under_guarantee"
                              ? "bg-orange-100 text-orange-700"
                              : c.financial_status === "cancelled_before_arrival"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {c.financial_status === "settled"
                            ? "مكتمل"
                            : c.financial_status === "under_guarantee"
                            ? "ضمان"
                            : c.financial_status === "cancelled_before_arrival"
                            ? "ملغي"
                            : c.financial_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {contracts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-gray-400">
                        لا توجد بيانات للسنة المختارة
                      </td>
                    </tr>
                  )}
                </tbody>
                {contracts.length > 0 && (
                  <tfoot>
                    <tr className="bg-navy-50 font-bold border-t-2 border-navy-200">
                      <td className="p-3 text-navy-500" colSpan={2}>الإجمالي</td>
                      <td className="p-3">{fmt(stats.totalRevenue)}</td>
                      <td className="p-3">{fmt(stats.totalExpectedMusaned)}</td>
                      <td className="p-3 text-emerald-600">{fmt(stats.totalActualMusaned)}</td>
                      <td className="p-3 text-red-600">{fmt(stats.totalExpenses)}</td>
                      <td
                        className={`p-3 ${
                          stats.ledgerProfit >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {fmt(stats.ledgerProfit)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </AuthLayout>
  );
}
