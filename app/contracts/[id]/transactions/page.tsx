"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import AuthLayout from "@/components/ui/AuthLayout";
import PageHeader from "@/components/ui/PageHeader";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight, Plus, TrendingUp, TrendingDown,
  Wallet, AlertTriangle, X, CheckCircle, FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Transaction, TransactionType, TransactionDirection } from "@/lib/types";
import { USD_TO_SAR } from "@/lib/constants";

interface ContractSummary {
  id: string;
  contract_number: string;
  client_name?: string;
  approx_profit: number;
}

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  CONTRACT_REVENUE: "إيراد العقد",
  MASANED_FEE: "رسوم مساند",
  CLIENT_REFUND: "استرداد للعميل",
  EXTERNAL_COMMISSION_PAYABLE: "عمولة مكتب خارجي",
  EXTERNAL_COMMISSION_REVERSAL: "استرداد عمولة خارجية",
  AHMED_COMMISSION: "عمولة أحمد",
  WAJDI_COMMISSION: "عمولة وجدي",
  AGENCY_FEE: "رسوم الوكالة",
  POOL_COMMISSION: "عمولة البول",
  SADAQA: "صدقة",
  OTHER_EXPENSE: "مصاريف أخرى",
  MANUAL_ADJUSTMENT: "تعديل يدوي",
};

const MANUAL_TYPES: TransactionType[] = [
  "MANUAL_ADJUSTMENT",
  "OTHER_EXPENSE",
  "CLIENT_REFUND",
  "EXTERNAL_COMMISSION_REVERSAL",
];

const defaultForm = {
  transaction_type: "MANUAL_ADJUSTMENT" as TransactionType,
  direction: "IN" as TransactionDirection,
  amount: "",
  currency: "SAR" as "SAR" | "USD",
  notes: "",
};

export default function ContractTransactionsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [contract, setContract] = useState<ContractSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);

  useEffect(() => { fetchData(); }, [id]);

  async function fetchData() {
    setLoading(true);
    const [{ data: cData }, { data: tData }] = await Promise.all([
      supabase
        .from("contracts")
        .select("id, contract_number, client_name, approx_profit")
        .eq("id", id)
        .single(),
      supabase
        .from("transactions")
        .select("*")
        .eq("contract_id", id)
        .order("created_at", { ascending: true }),
    ]);

    if (cData) setContract(cData);
    setTransactions(tData ?? []);
    setLoading(false);
  }

  async function handleAddTransaction() {
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("أدخل مبلغاً صحيحاً");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("transactions").insert({
      contract_id: id,
      transaction_type: form.transaction_type,
      direction: form.direction,
      amount: Number(form.amount),
      currency: form.currency,
      related_party: "internal",
      notes: form.notes || null,
    });

    if (error) {
      toast.error("خطأ: " + error.message);
    } else {
      toast.success("تم تسجيل الحركة في السجل");
      setShowForm(false);
      setForm(defaultForm);
      fetchData();
    }
    setSaving(false);
  }

  // ── Computed ledger values ─────────────────────────────────
  const totalIn = transactions
    .filter((t) => t.direction === "IN")
    .reduce((s, t) => s + (t.currency === "USD" ? t.amount * USD_TO_SAR : t.amount), 0);

  const totalOut = transactions
    .filter((t) => t.direction === "OUT")
    .reduce((s, t) => s + (t.currency === "USD" ? t.amount * USD_TO_SAR : t.amount), 0);

  const ledgerProfit = totalIn - totalOut;

  function exportToExcel() {
    const rows = transactions.map((t) => ({
      التاريخ: new Date(t.created_at).toLocaleDateString("ar-SA"),
      النوع: TRANSACTION_TYPE_LABELS[t.transaction_type] ?? t.transaction_type,
      "الاتجاه": t.direction === "IN" ? "وارد" : "صادر",
      المبلغ: t.amount,
      العملة: t.currency,
      "المبلغ (ر.س)": t.currency === "USD" ? t.amount * USD_TO_SAR : t.amount,
      ملاحظات: t.notes ?? "",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "السجل المحاسبي");
    XLSX.writeFile(wb, `ledger-${contract?.contract_number ?? id}.xlsx`);
  }

  const fmt = (n: number) =>
    n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) {
    return (
      <AuthLayout>
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthLayout>
    );
  }

  if (!contract) {
    return (
      <AuthLayout>
        <p className="text-center py-20 text-gray-400">لم يتم العثور على العقد</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <PageHeader
        title={`السجل المحاسبي — ${contract.contract_number}`}
        subtitle={contract.client_name ?? ""}
      >
        <button
          onClick={() => router.push(`/contracts/${id}`)}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <ArrowRight size={16} /> العقد
        </button>
        <button
          onClick={exportToExcel}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <FileSpreadsheet size={16} /> Excel
        </button>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={16} /> إضافة قيد
        </button>
      </PageHeader>

      {/* ── Summary Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card border-l-4 border-emerald-500 flex items-center gap-4">
          <TrendingUp size={28} className="text-emerald-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-gray-500">إجمالي الوارد</p>
            <p className="text-2xl font-bold text-emerald-600">{fmt(totalIn)} ر.س</p>
          </div>
        </div>
        <div className="card border-l-4 border-red-400 flex items-center gap-4">
          <TrendingDown size={28} className="text-red-500 shrink-0" />
          <div>
            <p className="text-xs font-bold text-gray-500">إجمالي الصادر</p>
            <p className="text-2xl font-bold text-red-500">{fmt(totalOut)} ر.س</p>
          </div>
        </div>
        <div className={`card border-l-4 flex items-center gap-4 ${ledgerProfit >= 0 ? "border-navy-500" : "border-red-500"}`}>
          <Wallet size={28} className={ledgerProfit >= 0 ? "text-navy-500 shrink-0" : "text-red-500 shrink-0"} />
          <div>
            <p className="text-xs font-bold text-gray-500">صافي الربح (السجل)</p>
            <p className={`text-2xl font-bold ${ledgerProfit >= 0 ? "text-navy-500" : "text-red-600"}`}>
              {fmt(ledgerProfit)} ر.س
            </p>
          </div>
        </div>
      </div>

      {/* ── Immutability notice ───────────────────────────────── */}
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm">
        <AlertTriangle size={16} className="text-amber-600 shrink-0" />
        <p className="text-amber-700 font-bold">
          السجل المحاسبي غير قابل للتعديل أو الحذف — القيود نهائية بمجرد تسجيلها
        </p>
      </div>

      {/* ── Transactions Table ────────────────────────────────── */}
      <div className="card">
        <h3 className="font-bold text-navy-500 mb-4">
          قيود السجل ({transactions.length} حركة)
        </h3>
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <Wallet size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-bold">لا توجد قيود مسجلة</p>
            <p className="text-gray-300 text-sm mt-1">
              القيود تُنشأ تلقائياً عند تحديث بيانات العقد المالية
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-50">
                  <th className="text-right p-3">#</th>
                  <th className="text-right p-3">التاريخ والوقت</th>
                  <th className="text-right p-3">نوع الحركة</th>
                  <th className="text-right p-3">الاتجاه</th>
                  <th className="text-right p-3">المبلغ</th>
                  <th className="text-right p-3">المبلغ (ر.س)</th>
                  <th className="text-right p-3">رصيد تراكمي (ر.س)</th>
                  <th className="text-right p-3">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let running = 0;
                  return transactions.map((t, i) => {
                    const sarAmount =
                      t.currency === "USD" ? t.amount * USD_TO_SAR : t.amount;
                    running += t.direction === "IN" ? sarAmount : -sarAmount;
                    return (
                      <tr
                        key={t.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 ${
                          t.direction === "IN" ? "bg-emerald-50/30" : "bg-red-50/30"
                        }`}
                      >
                        <td className="p-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(t.created_at).toLocaleDateString("ar-SA", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                          <br />
                          <span className="text-gray-300">
                            {new Date(t.created_at).toLocaleTimeString("ar-SA", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-navy-500 text-xs">
                            {TRANSACTION_TYPE_LABELS[t.transaction_type] ?? t.transaction_type}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-xs font-bold px-2 py-1 rounded-full ${
                              t.direction === "IN"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {t.direction === "IN" ? "↑ وارد" : "↓ صادر"}
                          </span>
                        </td>
                        <td className="p-3 font-bold">
                          {t.amount.toLocaleString()} {t.currency}
                        </td>
                        <td
                          className={`p-3 font-bold ${
                            t.direction === "IN" ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {t.direction === "IN" ? "+" : "−"}
                          {fmt(sarAmount)}
                        </td>
                        <td
                          className={`p-3 font-bold ${
                            running >= 0 ? "text-navy-500" : "text-red-600"
                          }`}
                        >
                          {fmt(running)}
                        </td>
                        <td className="p-3 text-gray-400 text-xs max-w-xs">
                          {t.notes ?? "—"}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
              <tfoot>
                <tr className="bg-navy-50 border-t-2 border-navy-200 font-bold">
                  <td className="p-3 text-navy-500" colSpan={5}>الإجمالي</td>
                  <td className="p-3 text-emerald-600">
                    +{fmt(totalIn)} / −{fmt(totalOut)}
                  </td>
                  <td
                    className={`p-3 text-lg ${ledgerProfit >= 0 ? "text-navy-500" : "text-red-600"}`}
                  >
                    {fmt(ledgerProfit)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Transaction Modal ─────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-navy-500">إضافة قيد محاسبي</h2>
                <p className="text-xs text-red-500 font-bold mt-0.5">
                  تحذير: القيود غير قابلة للتعديل أو الحذف بعد الحفظ
                </p>
              </div>
              <button
                onClick={() => { setShowForm(false); setForm(defaultForm); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Type */}
              <div>
                <label className="block text-sm mb-1.5">نوع الحركة *</label>
                <select
                  value={form.transaction_type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      transaction_type: e.target.value as TransactionType,
                    }))
                  }
                  className="w-full"
                >
                  {MANUAL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TRANSACTION_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Direction */}
              <div>
                <label className="block text-sm mb-1.5">الاتجاه *</label>
                <div className="flex gap-3">
                  {(["IN", "OUT"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, direction: d }))}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
                        form.direction === d
                          ? d === "IN"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-red-400 bg-red-50 text-red-700"
                          : "border-gray-200 text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {d === "IN" ? "↑ وارد (دخل)" : "↓ صادر (مصروف)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount + Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1.5">المبلغ *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-full"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1.5">العملة</label>
                  <select
                    value={form.currency}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        currency: e.target.value as "SAR" | "USD",
                      }))
                    }
                    className="w-full"
                  >
                    <option value="SAR">ريال سعودي (SAR)</option>
                    <option value="USD">دولار (USD)</option>
                  </select>
                </div>
              </div>

              {/* USD preview */}
              {form.currency === "USD" && form.amount && Number(form.amount) > 0 && (
                <p className="text-xs text-gray-400 bg-gray-50 p-2 rounded-lg">
                  = {(Number(form.amount) * USD_TO_SAR).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                </p>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm mb-1.5">الوصف / السبب *</label>
                <textarea
                  rows={2}
                  placeholder="وصف موجز للقيد..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={handleAddTransaction}
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                {saving ? "جاري الحفظ..." : "تأكيد وحفظ القيد"}
              </button>
              <button
                onClick={() => { setShowForm(false); setForm(defaultForm); }}
                className="btn-secondary"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
