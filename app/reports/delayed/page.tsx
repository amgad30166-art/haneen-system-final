"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import AuthLayout from "@/components/ui/AuthLayout";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import Link from "next/link";
import {
  AlertTriangle, Clock, Calendar, FileSpreadsheet,
  Printer, RefreshCw, Bell, XCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { NATIONALITIES } from "@/lib/constants";

interface DelayedContract {
  id: string;
  client_name: string;
  phone: string;
  nationality: string;
  contract_number?: string;
  contract_date: string;
  order_status: string;
  worker_name?: string;
  external_office?: string;
  delay_reason?: string;
  days_since_contract: number;
}

type SortKey = "days_since_contract" | "client_name" | "contract_date";

export default function DelayedContractsPage() {
  const [rows, setRows] = useState<DelayedContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("days_since_contract");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterNationality, setFilterNationality] = useState("");
  const [showNotification, setShowNotification] = useState(true);
  const supabase = createClient();

  useEffect(() => { fetchDelayed(); }, []);

  async function fetchDelayed() {
    setLoading(true);
    const today = new Date();
    const threshold = new Date(today.getTime() - 30 * 86400000).toISOString().split("T")[0];

    const { data } = await supabase
      .from("orders")
      .select("id, client_name, phone, nationality, contract_number, contract_date, order_status, worker_name, external_office, delay_reason")
      .not("contract_date", "is", null)
      .lt("contract_date", threshold)
      .not("order_status", "in", '("arrived","cancelled")')
      .order("contract_date", { ascending: true });

    if (data) {
      const withDays = data.map((o) => ({
        ...o,
        days_since_contract: Math.floor(
          (today.getTime() - new Date(o.contract_date).getTime()) / 86400000
        ),
      }));
      setRows(withDays);
    }
    setLoading(false);
  }

  const filtered = rows.filter((r) =>
    filterNationality ? r.nationality === filterNationality : true
  );

  const sorted = [...filtered].sort((a, b) => {
    const valA = a[sortKey];
    const valB = b[sortKey];
    const dir = sortDir === "asc" ? 1 : -1;
    if (typeof valA === "number" && typeof valB === "number") return (valA - valB) * dir;
    return String(valA).localeCompare(String(valB)) * dir;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function getSeverityColor(days: number) {
    if (days > 90) return "bg-red-100 border-red-300";
    if (days > 60) return "bg-orange-50 border-orange-200";
    return "bg-yellow-50 border-yellow-200";
  }

  function getSeverityBadge(days: number) {
    if (days > 90) return <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">حرج جداً</span>;
    if (days > 60) return <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">خطر</span>;
    return <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full">متأخر</span>;
  }

  function exportToExcel() {
    const exportRows = sorted.map((r) => ({
      "اسم العميل": r.client_name,
      "رقم الهاتف": r.phone,
      الجنسية: NATIONALITIES.find((n) => n.value === r.nationality)?.label ?? r.nationality,
      "رقم العقد": r.contract_number ?? "",
      "تاريخ العقد": r.contract_date,
      "أيام التأخير": r.days_since_contract,
      "حالة الطلب": r.order_status,
      "العاملة": r.worker_name ?? "",
      "المكتب الخارجي": r.external_office ?? "",
      "سبب التأخير": r.delay_reason ?? "",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows), "العقود المتأخرة");
    XLSX.writeFile(wb, `delayed-contracts-${new Date().toISOString().split("T")[0]}.xlsx`);
  }

  // Stats
  const critical = sorted.filter((r) => r.days_since_contract > 90).length;
  const danger = sorted.filter((r) => r.days_since_contract > 60 && r.days_since_contract <= 90).length;
  const warning = sorted.filter((r) => r.days_since_contract <= 60).length;
  const maxDays = sorted.length > 0 ? Math.max(...sorted.map((r) => r.days_since_contract)) : 0;

  return (
    <AuthLayout>
      <PageHeader
        title="العقود المتأخرة"
        subtitle={`${sorted.length} عقد تجاوز 30 يوماً بدون وصول`}
      >
        <button onClick={exportToExcel} className="btn-secondary flex items-center gap-2 text-sm no-print">
          <FileSpreadsheet size={16} /> Excel
        </button>
        <button onClick={() => window.print()} className="btn-primary flex items-center gap-2 text-sm no-print">
          <Printer size={16} /> طباعة PDF
        </button>
      </PageHeader>

      {/* ── Notification Widget ──────────────────────────────── */}
      {showNotification && sorted.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-4 no-print">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <Bell size={20} className="text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-red-700 text-lg">
              تنبيه: {sorted.length} عقد متأخر يحتاج اهتمامك
            </p>
            <p className="text-red-600 text-sm mt-1">
              أكثر تأخيراً: <strong>{maxDays} يوم</strong> ·
              حرج جداً (90+ يوم): <strong>{critical}</strong> ·
              خطر (60–90 يوم): <strong>{danger}</strong> ·
              متأخر (30–60 يوم): <strong>{warning}</strong>
            </p>
          </div>
          <button
            onClick={() => setShowNotification(false)}
            className="text-red-400 hover:text-red-600"
          >
            <XCircle size={20} />
          </button>
        </div>
      )}

      {/* ── Summary badges ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card border-l-4 border-red-500 bg-red-50 flex items-center gap-4">
          <AlertTriangle size={28} className="text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-gray-500">حرج جداً (90+ يوم)</p>
            <p className="text-3xl font-bold text-red-600">{critical}</p>
          </div>
        </div>
        <div className="card border-l-4 border-orange-400 bg-orange-50 flex items-center gap-4">
          <Clock size={28} className="text-orange-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-gray-500">خطر (60–90 يوم)</p>
            <p className="text-3xl font-bold text-orange-600">{danger}</p>
          </div>
        </div>
        <div className="card border-l-4 border-yellow-400 bg-yellow-50 flex items-center gap-4">
          <Calendar size={28} className="text-yellow-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-gray-500">متأخر (30–60 يوم)</p>
            <p className="text-3xl font-bold text-yellow-600">{warning}</p>
          </div>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────── */}
      <div className="card mb-6 no-print">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-48">
            <label className="block text-sm mb-1">الجنسية</label>
            <select
              value={filterNationality}
              onChange={(e) => setFilterNationality(e.target.value)}
              className="w-full"
            >
              <option value="">الكل</option>
              {NATIONALITIES.map((n) => (
                <option key={n.value} value={n.value}>{n.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchDelayed}
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
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-50">
                  <th className="text-right p-3">الخطورة</th>
                  <th
                    className="text-right p-3 cursor-pointer hover:text-navy-500 select-none"
                    onClick={() => toggleSort("days_since_contract")}
                  >
                    أيام التأخير {sortKey === "days_since_contract" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                  </th>
                  <th
                    className="text-right p-3 cursor-pointer hover:text-navy-500 select-none"
                    onClick={() => toggleSort("client_name")}
                  >
                    العميل {sortKey === "client_name" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                  </th>
                  <th className="text-right p-3">الهاتف</th>
                  <th className="text-right p-3">الجنسية</th>
                  <th className="text-right p-3">رقم العقد</th>
                  <th
                    className="text-right p-3 cursor-pointer hover:text-navy-500 select-none"
                    onClick={() => toggleSort("contract_date")}
                  >
                    تاريخ العقد {sortKey === "contract_date" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                  </th>
                  <th className="text-right p-3">حالة الطلب</th>
                  <th className="text-right p-3">المكتب الخارجي</th>
                  <th className="text-right p-3">سبب التأخير</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-b border-gray-100 hover:brightness-95 ${getSeverityColor(r.days_since_contract)}`}
                  >
                    <td className="p-3">{getSeverityBadge(r.days_since_contract)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-600 text-lg">{r.days_since_contract}</span>
                        <span className="text-gray-500 text-xs">يوم</span>
                      </div>
                      {/* Progress bar relative to 120 days */}
                      <div className="w-20 bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className={`h-1.5 rounded-full ${
                            r.days_since_contract > 90
                              ? "bg-red-500"
                              : r.days_since_contract > 60
                              ? "bg-orange-400"
                              : "bg-yellow-400"
                          }`}
                          style={{ width: `${Math.min((r.days_since_contract / 120) * 100, 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="p-3">
                      <Link
                        href={r.contract_number ? `/contracts` : `/orders/${r.id}`}
                        className="font-bold text-navy-500 hover:underline"
                      >
                        {r.client_name}
                      </Link>
                    </td>
                    <td className="p-3 text-gray-500 text-xs">{r.phone}</td>
                    <td className="p-3">
                      {NATIONALITIES.find((n) => n.value === r.nationality)?.label ?? r.nationality}
                    </td>
                    <td className="p-3 font-bold text-navy-500">
                      {r.contract_number ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="p-3 text-gray-500">
                      {new Date(r.contract_date).toLocaleDateString("ar-SA")}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={r.order_status} type="order" />
                    </td>
                    <td className="p-3 text-gray-500 text-xs">{r.external_office ?? "—"}</td>
                    <td className="p-3">
                      {r.delay_reason ? (
                        <span className="text-orange-600 text-xs font-bold">{r.delay_reason}</span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                          <AlertTriangle size={32} className="text-emerald-500" />
                        </div>
                        <p className="font-bold text-gray-500">لا توجد عقود متأخرة</p>
                        <p className="text-gray-400 text-sm">جميع العقود ضمن المدة المحددة</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
