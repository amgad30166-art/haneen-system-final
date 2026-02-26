"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import AuthLayout from "@/components/ui/AuthLayout";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
} from "recharts";
import {
  BarChart3, Users, TrendingUp, AlertTriangle,
  FileSpreadsheet, Printer, RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";
import { NATIONALITIES } from "@/lib/constants";

interface OrderAnalytics {
  id: string;
  order_status: string;
  nationality: string;
  external_office?: string;
  contract_date?: string;
  arrival_date?: string;
  cancellation_status?: string;
  refund_amount?: number;
  created_at: string;
}

interface ContractAnalytics {
  id: string;
  contract_number: string;
  contract_date?: string;
  cancellation_status: string;
  refund_amount?: number;
  financial_status: string;
}

const COLORS = ["#1B2B6B", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899"];

const QUARTER_LABELS: Record<number, string> = { 1: "ر1", 2: "ر2", 3: "ر3", 4: "ر4" };

function getQuarter(dateStr: string) {
  const month = new Date(dateStr).getMonth() + 1;
  return Math.ceil(month / 3);
}

function getYearQuarter(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${QUARTER_LABELS[getQuarter(dateStr)]}`;
}

function daysBetween(d1: string, d2: string) {
  return Math.round((new Date(d2).getTime() - new Date(d1).getTime()) / 86400000);
}

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<OrderAnalytics[]>([]);
  const [contracts, setContracts] = useState<ContractAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const supabase = createClient();

  useEffect(() => { fetchData(); }, [yearFilter]);

  async function fetchData() {
    setLoading(true);
    const yearStart = `${yearFilter}-01-01`;
    const yearEnd = `${yearFilter}-12-31`;

    const [{ data: ordersData }, { data: contractsData }] = await Promise.all([
      supabase
        .from("orders")
        .select("id, order_status, nationality, external_office, contract_date, arrival_date, created_at")
        .gte("created_at", yearStart)
        .lte("created_at", yearEnd)
        .order("created_at"),
      supabase
        .from("contracts")
        .select("id, contract_number, contract_date, cancellation_status, refund_amount, financial_status")
        .gte("contract_date", yearStart)
        .lte("contract_date", yearEnd),
    ]);

    setOrders(ordersData || []);
    setContracts(contractsData || []);
    setLoading(false);
  }

  // ── Contracts per month ──────────────────────────────────────
  const monthlyMap = new Map<string, number>();
  orders.forEach((o) => {
    if (!o.created_at) return;
    const m = o.created_at.substring(0, 7);
    monthlyMap.set(m, (monthlyMap.get(m) ?? 0) + 1);
  });
  const monthlyData = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({
      month,
      monthLabel: new Date(month + "-01").toLocaleDateString("ar-SA", { month: "short" }),
      count,
    }));

  // ── Contracts per quarter ────────────────────────────────────
  const quarterMap = new Map<string, number>();
  orders.forEach((o) => {
    if (!o.created_at) return;
    const q = getYearQuarter(o.created_at);
    quarterMap.set(q, (quarterMap.get(q) ?? 0) + 1);
  });
  const quarterData = Array.from(quarterMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([quarter, count]) => ({ quarter, count }));

  // ── % per nationality ────────────────────────────────────────
  const nationalityMap = new Map<string, number>();
  orders.forEach((o) => {
    nationalityMap.set(o.nationality, (nationalityMap.get(o.nationality) ?? 0) + 1);
  });
  const nationalityData = Array.from(nationalityMap.entries()).map(([nat, count]) => ({
    name: NATIONALITIES.find((n) => n.value === nat)?.label ?? nat,
    value: count,
    pct: orders.length > 0 ? ((count / orders.length) * 100).toFixed(1) : "0",
  }));

  // ── % per external office ────────────────────────────────────
  const officeMap = new Map<string, number>();
  orders.forEach((o) => {
    const office = o.external_office ?? "غير محدد";
    officeMap.set(office, (officeMap.get(office) ?? 0) + 1);
  });
  const officeData = Array.from(officeMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, count]) => ({
      name,
      count,
      pct: orders.length > 0 ? ((count / orders.length) * 100).toFixed(1) : "0",
    }));

  // ── Arrival report: arrived orders ──────────────────────────
  const arrivedOrders = orders.filter(
    (o) => o.order_status === "arrived" && o.arrival_date && o.contract_date
  );
  const avgDaysToArrival =
    arrivedOrders.length > 0
      ? Math.round(
          arrivedOrders.reduce((sum, o) => sum + daysBetween(o.contract_date!, o.arrival_date!), 0) /
            arrivedOrders.length
        )
      : 0;

  // Monthly arrivals
  const arrivalMonthMap = new Map<string, number>();
  arrivedOrders.forEach((o) => {
    const m = o.arrival_date!.substring(0, 7);
    arrivalMonthMap.set(m, (arrivalMonthMap.get(m) ?? 0) + 1);
  });
  const arrivalMonthData = Array.from(arrivalMonthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({
      monthLabel: new Date(month + "-01").toLocaleDateString("ar-SA", { month: "short" }),
      count,
    }));

  // ── Cancellation rate ────────────────────────────────────────
  const cancelledCount = orders.filter((o) => o.order_status === "cancelled").length;
  const cancellationRate =
    orders.length > 0 ? ((cancelledCount / orders.length) * 100).toFixed(1) : "0";

  // ── Refund rate by nationality ───────────────────────────────
  const refundNatMap = new Map<string, { total: number; refunded: number }>();
  orders.forEach((o) => {
    const nat = NATIONALITIES.find((n) => n.value === o.nationality)?.label ?? o.nationality;
    const existing = refundNatMap.get(nat) ?? { total: 0, refunded: 0 };
    existing.total++;
    if (o.order_status === "cancelled") existing.refunded++;
    refundNatMap.set(nat, existing);
  });
  const refundByNat = Array.from(refundNatMap.entries()).map(([name, { total, refunded }]) => ({
    name,
    total,
    refunded,
    rate: total > 0 ? ((refunded / total) * 100).toFixed(1) : "0",
  }));

  // ── Stats ────────────────────────────────────────────────────
  const totalOrders = orders.length;
  const activeOrders = orders.filter(
    (o) => o.order_status !== "arrived" && o.order_status !== "cancelled"
  ).length;

  // ── Excel Export ─────────────────────────────────────────────
  function exportToExcel() {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Monthly
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        monthlyData.map((m) => ({ الشهر: m.monthLabel, "عدد الطلبات": m.count }))
      ),
      "شهري"
    );

    // Sheet 2: Quarterly
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        quarterData.map((q) => ({ الربع: q.quarter, "عدد الطلبات": q.count }))
      ),
      "ربعي"
    );

    // Sheet 3: Nationality
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        nationalityData.map((n) => ({
          الجنسية: n.name,
          العدد: n.value,
          "النسبة %": n.pct,
        }))
      ),
      "الجنسيات"
    );

    // Sheet 4: External offices
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        officeData.map((o) => ({
          المكتب: o.name,
          العدد: o.count,
          "النسبة %": o.pct,
        }))
      ),
      "المكاتب الخارجية"
    );

    // Sheet 5: Arrival report
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        arrivedOrders.map((o) => ({
          "تاريخ العقد": o.contract_date,
          "تاريخ الوصول": o.arrival_date,
          "أيام الانتظار": daysBetween(o.contract_date!, o.arrival_date!),
          الجنسية: NATIONALITIES.find((n) => n.value === o.nationality)?.label ?? o.nationality,
        }))
      ),
      "تقرير الوصول"
    );

    // Sheet 6: Refund by nationality
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        refundByNat.map((r) => ({
          الجنسية: r.name,
          "إجمالي الطلبات": r.total,
          "الملغي/المسترد": r.refunded,
          "معدل الإلغاء %": r.rate,
        }))
      ),
      "معدل الإلغاء"
    );

    XLSX.writeFile(wb, `analytics-${yearFilter}.xlsx`);
  }

  const yearOptions = [2023, 2024, 2025, 2026];

  return (
    <AuthLayout>
      <PageHeader title="التحليلات" subtitle={`إحصائيات وتقارير سنة ${yearFilter}`}>
        <button
          onClick={exportToExcel}
          className="btn-secondary flex items-center gap-2 text-sm no-print"
        >
          <FileSpreadsheet size={16} /> Excel
        </button>
        <button
          onClick={() => window.print()}
          className="btn-primary flex items-center gap-2 text-sm no-print"
        >
          <Printer size={16} /> طباعة PDF
        </button>
      </PageHeader>

      {/* Year filter */}
      <div className="card mb-6 no-print">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm mb-1">السنة</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-36"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
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
          {/* ── Summary Stats ─────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="إجمالي الطلبات"
              value={totalOrders}
              icon={<BarChart3 size={24} className="text-navy-500" />}
              color="navy"
            />
            <StatCard
              title="طلبات نشطة"
              value={activeOrders}
              icon={<TrendingUp size={24} className="text-blue-600" />}
              color="blue"
            />
            <StatCard
              title="تم الوصول"
              value={arrivedOrders.length}
              icon={<Users size={24} className="text-emerald-600" />}
              color="green"
            />
            <StatCard
              title="معدل الإلغاء"
              value={`${cancellationRate}%`}
              icon={<AlertTriangle size={24} className="text-red-600" />}
              color="red"
              subtitle={`${cancelledCount} ملغي`}
            />
            <StatCard
              title="متوسط أيام الوصول"
              value={`${avgDaysToArrival} يوم`}
              icon={<TrendingUp size={24} className="text-orange-600" />}
              color="orange"
            />
          </div>

          {/* ── Monthly & Quarterly Charts ────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Monthly */}
            <div className="card">
              <h3 className="font-bold text-navy-500 mb-4">الطلبات الشهرية</h3>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="monthLabel" tick={{ fontFamily: "Cairo", fontSize: 11 }} />
                    <YAxis tick={{ fontFamily: "Cairo", fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: number) => [v, "طلبات"]}
                      contentStyle={{ fontFamily: "Cairo" }}
                    />
                    <Bar dataKey="count" name="عدد الطلبات" fill="#1B2B6B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-center py-10">لا توجد بيانات</p>
              )}
            </div>

            {/* Quarterly */}
            <div className="card">
              <h3 className="font-bold text-navy-500 mb-4">الطلبات الربعية</h3>
              {quarterData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={quarterData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="quarter" tick={{ fontFamily: "Cairo", fontSize: 12 }} />
                    <YAxis tick={{ fontFamily: "Cairo", fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: number) => [v, "طلبات"]}
                      contentStyle={{ fontFamily: "Cairo" }}
                    />
                    <Bar dataKey="count" name="عدد الطلبات" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-center py-10">لا توجد بيانات</p>
              )}
            </div>
          </div>

          {/* ── Nationality & External Office ─────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Nationality Pie */}
            <div className="card">
              <h3 className="font-bold text-navy-500 mb-4">توزيع الجنسيات</h3>
              {nationalityData.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie
                        data={nationalityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        dataKey="value"
                        label={({ pct }) => `${pct}%`}
                        labelLine={false}
                      >
                        {nationalityData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number, name: string) => [v, name]}
                        contentStyle={{ fontFamily: "Cairo" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2 text-sm">
                    {nationalityData.map((n, i) => (
                      <div key={n.name} className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="font-bold">{n.name}</span>
                        <span className="text-gray-500">({n.value} — {n.pct}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-10">لا توجد بيانات</p>
              )}
            </div>

            {/* External Office */}
            <div className="card">
              <h3 className="font-bold text-navy-500 mb-4">أكثر المكاتب الخارجية طلبات</h3>
              {officeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={officeData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" tick={{ fontFamily: "Cairo", fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontFamily: "Cairo", fontSize: 11 }}
                      width={80}
                    />
                    <Tooltip
                      formatter={(v: number, _: string, { payload }: any) => [
                        `${v} (${payload.pct}%)`,
                        "طلبات",
                      ]}
                      contentStyle={{ fontFamily: "Cairo" }}
                    />
                    <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-center py-10">لا توجد بيانات</p>
              )}
            </div>
          </div>

          {/* ── Arrival Report ────────────────────────────────── */}
          <div className="card mb-6">
            <h3 className="font-bold text-navy-500 mb-2">
              تقرير الوصول — متوسط الأيام: <span className="text-emerald-600">{avgDaysToArrival} يوم</span>
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              من تاريخ العقد حتى تاريخ الوصول ({arrivedOrders.length} حالة وصول)
            </p>
            {arrivalMonthData.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={arrivalMonthData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="monthLabel" tick={{ fontFamily: "Cairo", fontSize: 11 }} />
                  <YAxis tick={{ fontFamily: "Cairo", fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number) => [v, "وصول"]}
                    contentStyle={{ fontFamily: "Cairo" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="الوصول"
                    stroke="#1B2B6B"
                    strokeWidth={2}
                    dot={{ fill: "#1B2B6B" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Refund Rate by Nationality ────────────────────── */}
          <div className="card mb-6">
            <h3 className="font-bold text-navy-500 mb-4">معدل الإلغاء والاسترداد حسب الجنسية</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy-50">
                    <th className="text-right p-3">الجنسية</th>
                    <th className="text-right p-3">إجمالي الطلبات</th>
                    <th className="text-right p-3">الملغي</th>
                    <th className="text-right p-3">معدل الإلغاء %</th>
                    <th className="text-right p-3">مؤشر</th>
                  </tr>
                </thead>
                <tbody>
                  {refundByNat.map((r) => (
                    <tr key={r.name} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3 font-bold">{r.name}</td>
                      <td className="p-3">{r.total}</td>
                      <td className="p-3 text-red-600 font-bold">{r.refunded}</td>
                      <td className="p-3 font-bold">{r.rate}%</td>
                      <td className="p-3 w-32">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: `${Math.min(Number(r.rate), 100)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {refundByNat.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400">
                        لا توجد بيانات
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Nationality detail table ──────────────────────── */}
          <div className="card">
            <h3 className="font-bold text-navy-500 mb-4">تفاصيل الجنسيات</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy-50">
                    <th className="text-right p-3">الجنسية</th>
                    <th className="text-right p-3">عدد الطلبات</th>
                    <th className="text-right p-3">النسبة %</th>
                    <th className="text-right p-3">توزيع</th>
                  </tr>
                </thead>
                <tbody>
                  {nationalityData.map((n, i) => (
                    <tr key={n.name} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3 font-bold flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        {n.name}
                      </td>
                      <td className="p-3">{n.value}</td>
                      <td className="p-3 font-bold">{n.pct}%</td>
                      <td className="p-3 w-40">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${n.pct}%`,
                              backgroundColor: COLORS[i % COLORS.length],
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AuthLayout>
  );
}
