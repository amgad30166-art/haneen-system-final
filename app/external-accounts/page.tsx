"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import AuthLayout from "@/components/ui/AuthLayout";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { toast } from "sonner";
import {
  Building2, Plus, FileSpreadsheet, RefreshCw,
  DollarSign, TrendingUp, AlertCircle, CheckCircle,
  X, Wallet, RotateCcw, Info, FileText,
} from "lucide-react";
import * as XLSX from "xlsx";
import { USD_TO_SAR } from "@/lib/constants";
import { ExternalOffice } from "@/lib/types";

interface ExternalAccount {
  id: string;
  external_office_id: string;
  payment_date: string;
  amount_usd: number;
  amount_sar: number;
  payment_type: "worker_payment" | "advance" | "settlement";
  payment_method: "bank_transfer" | "cash";
  description?: string;
  receipt_url?: string;
  created_at: string;
  external_offices?: { office_name: string; country: string };
}

interface OfficeBalance {
  id: string;
  office_name: string;
  country: string;
  gross_owed_usd: number;
  total_reversal_usd: number;
  total_owed_usd: number;
  total_paid_usd: number;
  balance_usd: number;
  balance_sar: number;
}

interface StatementEntry {
  date: string;
  description: string;
  debit_usd: number;   // we owe office (commission payable)
  credit_usd: number;  // we paid / reversal
  balance_usd: number; // running — positive = we owe them, negative = they owe us
  type: "payable" | "reversal" | "payment";
  contract_number?: string;
}

const PAYMENT_TYPES = [
  { value: "worker_payment", label: "دفع عاملة" },
  { value: "advance", label: "دفعة مقدمة" },
  { value: "settlement", label: "تسوية" },
] as const;

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "تحويل بنكي" },
  { value: "cash", label: "نقداً" },
] as const;

const defaultForm = {
  external_office_id: "",
  payment_date: new Date().toISOString().split("T")[0],
  amount_usd: "",
  payment_type: "worker_payment" as const,
  payment_method: "bank_transfer" as const,
  description: "",
  receipt_url: "",
};

export default function ExternalAccountsPage() {
  const [payments, setPayments] = useState<ExternalAccount[]>([]);
  const [offices, setOffices] = useState<ExternalOffice[]>([]);
  const [balances, setBalances] = useState<OfficeBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);

  // Statement modal
  const [statementOffice, setStatementOffice] = useState<OfficeBalance | null>(null);
  const [statementEntries, setStatementEntries] = useState<StatementEntry[]>([]);
  const [loadingStatement, setLoadingStatement] = useState(false);

  // Filters
  const [filterOffice, setFilterOffice] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const supabase = createClient();

  useEffect(() => { fetchAll(); }, [filterOffice, filterType, filterFrom, filterTo]);

  async function fetchAll() {
    setLoading(true);
    let query = supabase
      .from("external_accounts")
      .select("*, external_offices(office_name, country)")
      .order("payment_date", { ascending: false });

    if (filterOffice) query = query.eq("external_office_id", filterOffice);
    if (filterType) query = query.eq("payment_type", filterType);
    if (filterFrom) query = query.gte("payment_date", filterFrom);
    if (filterTo) query = query.lte("payment_date", filterTo);

    const [{ data: paymentsData }, { data: officesData }, { data: balancesData }] =
      await Promise.all([
        query,
        supabase.from("external_offices").select("*").order("office_name"),
        supabase.from("external_office_balances").select("*").order("balance_usd", { ascending: false }),
      ]);

    setPayments(paymentsData ?? []);
    setOffices(officesData ?? []);
    setBalances(balancesData ?? []);
    setLoading(false);
  }

  async function openStatement(office: OfficeBalance) {
    setStatementOffice(office);
    setLoadingStatement(true);
    setStatementEntries([]);

    const [{ data: txData }, { data: pmtData }] = await Promise.all([
      supabase
        .from("transactions")
        .select("*, contracts(contract_number, client_name)")
        .eq("external_office_id", office.id)
        .in("transaction_type", ["EXTERNAL_COMMISSION_PAYABLE", "EXTERNAL_COMMISSION_REVERSAL"])
        .order("created_at"),
      supabase
        .from("external_accounts")
        .select("*")
        .eq("external_office_id", office.id)
        .order("payment_date"),
    ]);

    /* build unified entry list */
    const raw: { date: string; entry: StatementEntry }[] = [];

    (txData ?? []).forEach((t: any) => {
      const isReversal = t.transaction_type === "EXTERNAL_COMMISSION_REVERSAL";
      const amtUsd = t.currency === "USD" ? t.amount : t.amount / USD_TO_SAR;
      raw.push({
        date: t.created_at.split("T")[0],
        entry: {
          date: t.created_at.split("T")[0],
          type: isReversal ? "reversal" : "payable",
          description: isReversal
            ? `استرداد ضمان — عقد ${t.contracts?.contract_number ?? ""}`
            : `عمولة عقد — ${t.contracts?.client_name ?? ""}`,
          contract_number: t.contracts?.contract_number,
          debit_usd:  isReversal ? 0 : amtUsd,
          credit_usd: isReversal ? amtUsd : 0,
          balance_usd: 0, // filled below
        },
      });
    });

    (pmtData ?? []).forEach((p: any) => {
      raw.push({
        date: p.payment_date,
        entry: {
          date: p.payment_date,
          type: "payment",
          description: `دفعة — ${PAYMENT_TYPES.find((t) => t.value === p.payment_type)?.label ?? p.payment_type}${p.description ? " — " + p.description : ""}`,
          debit_usd:  0,
          credit_usd: p.amount_usd,
          balance_usd: 0,
        },
      });
    });

    raw.sort((a, b) => a.date.localeCompare(b.date));

    /* compute running balance */
    let running = 0;
    const entries = raw.map(({ entry }) => {
      running += entry.debit_usd - entry.credit_usd;
      return { ...entry, balance_usd: running };
    });

    setStatementEntries(entries);
    setLoadingStatement(false);
  }

  function handleInput(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function exportStatementExcel() {
    if (!statementOffice || statementEntries.length === 0) return;

    const rows = statementEntries.map((e) => ({
      "التاريخ":                e.date,
      "البيان":                 e.description,
      "رقم العقد":              e.contract_number ?? "",
      "مدين — نستحق له (USD)": e.debit_usd  > 0 ? e.debit_usd  : 0,
      "دائن — دفعنا له (USD)": e.credit_usd > 0 ? e.credit_usd : 0,
      "الرصيد الجاري (USD)":   e.balance_usd,
      "الاتجاه":               e.balance_usd > 0 ? "علينا" : e.balance_usd < 0 ? "لنا" : "صفر",
    }));

    /* totals row */
    rows.push({
      "التاريخ":                "الإجمالي",
      "البيان":                 "",
      "رقم العقد":              "",
      "مدين — نستحق له (USD)": statementEntries.reduce((s, e) => s + e.debit_usd,  0),
      "دائن — دفعنا له (USD)": statementEntries.reduce((s, e) => s + e.credit_usd, 0),
      "الرصيد الجاري (USD)":   statementOffice.balance_usd,
      "الاتجاه":               statementOffice.balance_usd > 0 ? "متبقي علينا" : statementOffice.balance_usd < 0 ? "يُدين لنا" : "مسدد",
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "كشف حساب");
    XLSX.writeFile(wb, `statement-${statementOffice.office_name}-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("تم تصدير كشف الحساب");
  }

  async function handleSave() {
    if (!form.external_office_id) { toast.error("اختر المكتب الخارجي"); return; }
    if (!form.amount_usd || Number(form.amount_usd) <= 0) { toast.error("أدخل المبلغ بالدولار"); return; }
    if (!form.payment_date) { toast.error("أدخل تاريخ الدفع"); return; }

    setSaving(true);
    const { error } = await supabase.from("external_accounts").insert({
      external_office_id: form.external_office_id,
      payment_date: form.payment_date,
      amount_usd: Number(form.amount_usd),
      payment_type: form.payment_type,
      payment_method: form.payment_method,
      description: form.description || null,
      receipt_url: form.receipt_url || null,
    });

    if (error) {
      toast.error("حدث خطأ أثناء الحفظ");
    } else {
      toast.success("تم تسجيل الدفعة بنجاح");
      setShowForm(false);
      setForm(defaultForm);
      fetchAll();
    }
    setSaving(false);
  }

  function exportToExcel() {
    const rows = payments.map((p) => ({
      "المكتب": p.external_offices?.office_name ?? "",
      "تاريخ الدفع": p.payment_date,
      "المبلغ (USD)": p.amount_usd,
      "المبلغ (ر.س)": p.amount_sar,
      "نوع الدفع": PAYMENT_TYPES.find((t) => t.value === p.payment_type)?.label ?? p.payment_type,
      "طريقة الدفع": PAYMENT_METHODS.find((m) => m.value === p.payment_method)?.label ?? p.payment_method,
      "الوصف": p.description ?? "",
    }));

    const balanceRows = balances.map((b) => ({
      "المكتب": b.office_name,
      "إجمالي المستحق (USD)": b.gross_owed_usd ?? 0,
      "مبالغ مستردة - ضمان (USD)": b.total_reversal_usd ?? 0,
      "صافي المستحق (USD)": b.total_owed_usd,
      "إجمالي المدفوع (USD)": b.total_paid_usd,
      "الرصيد (USD)": b.balance_usd,
      "الرصيد (ر.س)": b.balance_sar,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "المدفوعات");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(balanceRows), "أرصدة المكاتب");
    XLSX.writeFile(wb, `external-accounts-${new Date().toISOString().split("T")[0]}.xlsx`);
  }

  // Summary stats
  const totalPaid = payments.reduce((s, p) => s + p.amount_usd, 0);
  const totalOwed = balances.reduce((s, b) => s + b.total_owed_usd, 0);
  const totalBalance = balances.reduce((s, b) => s + b.balance_usd, 0);
  const totalReversals = balances.reduce((s, b) => s + (b.total_reversal_usd ?? 0), 0);
  const officesWithDebt = balances.filter((b) => b.balance_usd > 0).length;
  const officesOwingUs = balances.filter((b) => b.balance_usd < 0).length;

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <AuthLayout>
      <PageHeader title="حسابات المكاتب الخارجية" subtitle="تتبع المدفوعات والأرصدة">
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
          <Plus size={16} /> دفعة جديدة
        </button>
      </PageHeader>

      {/* ── Summary Stats ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="إجمالي المدفوع للمكاتب"
          value={`${fmt(totalPaid)} USD`}
          icon={<DollarSign size={24} className="text-emerald-600" />}
          color="green"
          subtitle={`${fmt(totalPaid * USD_TO_SAR)} ر.س`}
        />
        <StatCard
          title="صافي المستحق للمكاتب"
          value={`${fmt(totalOwed)} USD`}
          icon={<TrendingUp size={24} className="text-navy-500" />}
          color="navy"
          subtitle={`${fmt(totalOwed * USD_TO_SAR)} ر.س`}
        />
        <StatCard
          title="الرصيد المتبقي"
          value={`${fmt(Math.abs(totalBalance))} USD`}
          icon={<AlertCircle size={24} className={totalBalance < 0 ? "text-purple-600" : "text-orange-600"} />}
          color={totalBalance < 0 ? "navy" : totalBalance > 0 ? "orange" : "green"}
          subtitle={totalBalance < 0 ? "المكاتب مدينة لنا" : totalBalance === 0 ? "مسدد بالكامل" : `${fmt(totalBalance * USD_TO_SAR)} ر.س`}
        />
        <StatCard
          title="استردادات الضمان"
          value={`${fmt(totalReversals)} USD`}
          icon={<RotateCcw size={24} className="text-amber-600" />}
          color="orange"
          subtitle={`عقود الضمان المسترجعة`}
        />
      </div>

      {/* ── Guarantee Reversal Info Banner ────────────────────── */}
      {totalReversals > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <RotateCcw size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 text-sm">
              يوجد {balances.filter(b => (b.total_reversal_usd ?? 0) > 0).length} مكتب لديه استردادات ضمان بإجمالي {fmt(totalReversals)} USD
            </p>
            <p className="text-amber-600 text-xs mt-0.5">
              تم خصم هذه الاستردادات تلقائياً من المستحق لكل مكتب بناءً على قيود "استرداد عمولة خارجية" في دفاتر العقود.
            </p>
          </div>
        </div>
      )}

      {/* ── Guarantee Reversal How-To ─────────────────────────── */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-blue-800 text-sm mb-1">كيف تُسجل استرداد عمولة عند عودة العاملة خلال الضمان؟</p>
          <ol className="text-blue-700 text-xs space-y-1 list-decimal list-inside">
            <li>افتح العقد المرتبط بالعاملة التي عادت ← اضغط <strong>دفتر الأستاذ</strong></li>
            <li>أضف قيداً جديداً: النوع = <strong>استرداد عمولة خارجية</strong> · الاتجاه = <strong>وارد ↑</strong> · المبلغ بالدولار</li>
            <li>سيُخصم المبلغ تلقائياً من رصيد المكتب في هذه الصفحة</li>
            <li>غيّر الحالة المالية للعقد إلى <strong>مسترد خلال الضمان</strong></li>
          </ol>
        </div>
      </div>

      {/* ── Office Balances Summary ────────────────────────────── */}
      <div className="card mb-6">
        <h3 className="font-bold text-navy-500 mb-4 text-base">
          أرصدة المكاتب الخارجية
          {officesOwingUs > 0 && (
            <span className="mr-2 text-xs font-normal bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              {officesOwingUs} مكتب مدين لنا
            </span>
          )}
        </h3>
        {balances.length === 0 ? (
          <p className="text-gray-400 text-center py-6">لا توجد مكاتب</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {balances.map((b) => {
              const owesUs = b.balance_usd < 0;
              const settled = b.balance_usd === 0;
              return (
                <div
                  key={b.id}
                  className={`flex flex-col p-4 rounded-xl border ${
                    owesUs
                      ? "border-purple-200 bg-purple-50"
                      : settled
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-orange-200 bg-orange-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-sm">{b.office_name}</p>
                    <div className="flex items-center gap-2">
                      {owesUs ? (
                        <span className="text-xs font-bold bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">
                          مدين لنا
                        </span>
                      ) : settled ? (
                        <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                          <CheckCircle size={13} /> مسدد
                        </div>
                      ) : null}
                      <button
                        onClick={() => openStatement(b)}
                        className="text-xs text-navy-500 hover:underline flex items-center gap-1"
                      >
                        <FileText size={12} /> كشف حساب
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 space-y-0.5 mb-2">
                    <p>مستحق إجمالي: <span className="font-bold text-gray-700">{(b.gross_owed_usd ?? b.total_owed_usd ?? 0).toFixed(2)} USD</span></p>
                    {(b.total_reversal_usd ?? 0) > 0 && (
                      <p className="text-amber-600">
                        استردادات ضمان: <span className="font-bold">−{(b.total_reversal_usd ?? 0).toFixed(2)} USD</span>
                      </p>
                    )}
                    <p>صافي المستحق: <span className="font-bold text-gray-700">{b.total_owed_usd.toFixed(2)} USD</span></p>
                    <p>مدفوع: <span className="font-bold text-gray-700">{b.total_paid_usd.toFixed(2)} USD</span></p>
                  </div>

                  <div className="border-t border-current/10 pt-2">
                    {owesUs ? (
                      <>
                        <p className="font-bold text-purple-700 text-sm">
                          يُدين لنا: {Math.abs(b.balance_usd).toFixed(2)} USD
                        </p>
                        <p className="text-xs text-gray-400">{fmt(Math.abs(b.balance_sar))} ر.س</p>
                      </>
                    ) : b.balance_usd > 0 ? (
                      <>
                        <p className="font-bold text-orange-600 text-sm">
                          متبقي: {b.balance_usd.toFixed(2)} USD
                        </p>
                        <p className="text-xs text-gray-400">{fmt(b.balance_sar)} ر.س</p>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Filters ───────────────────────────────────────────── */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-52">
            <label className="block text-sm mb-1">المكتب</label>
            <select
              value={filterOffice}
              onChange={(e) => setFilterOffice(e.target.value)}
              className="w-full"
            >
              <option value="">الكل</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>{o.office_name}</option>
              ))}
            </select>
          </div>
          <div className="w-44">
            <label className="block text-sm mb-1">نوع الدفع</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full"
            >
              <option value="">الكل</option>
              {PAYMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">من تاريخ</label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="w-40"
            />
          </div>
          <button
            onClick={fetchAll}
            className="btn-secondary flex items-center gap-2 text-sm h-[44px]"
          >
            <RefreshCw size={16} /> تحديث
          </button>
        </div>
      </div>

      {/* ── Payments Table ────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-navy-500">
              سجل المدفوعات ({payments.length} دفعة)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-50">
                  <th className="text-right p-3">المكتب</th>
                  <th className="text-right p-3">تاريخ الدفع</th>
                  <th className="text-right p-3">المبلغ (USD)</th>
                  <th className="text-right p-3">المبلغ (ر.س)</th>
                  <th className="text-right p-3">نوع الدفع</th>
                  <th className="text-right p-3">الطريقة</th>
                  <th className="text-right p-3">الوصف</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-bold text-navy-500">
                      {p.external_offices?.office_name ?? "—"}
                    </td>
                    <td className="p-3 text-gray-500">
                      {new Date(p.payment_date).toLocaleDateString("en-US")}
                    </td>
                    <td className="p-3 font-bold text-emerald-600">
                      {p.amount_usd.toFixed(2)}
                    </td>
                    <td className="p-3">{fmt(p.amount_sar)}</td>
                    <td className="p-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        p.payment_type === "settlement"
                          ? "bg-emerald-100 text-emerald-700"
                          : p.payment_type === "advance"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-navy-100 text-navy-700"
                      }`}>
                        {PAYMENT_TYPES.find((t) => t.value === p.payment_type)?.label}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        p.payment_method === "bank_transfer"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-yellow-50 text-yellow-600"
                      }`}>
                        {PAYMENT_METHODS.find((m) => m.value === p.payment_method)?.label}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500 text-xs max-w-xs truncate">
                      {p.description ?? "—"}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      لا توجد مدفوعات مسجلة
                    </td>
                  </tr>
                )}
              </tbody>
              {payments.length > 0 && (
                <tfoot>
                  <tr className="bg-navy-50 font-bold border-t-2 border-navy-200">
                    <td className="p-3 text-navy-500" colSpan={2}>الإجمالي</td>
                    <td className="p-3 text-emerald-600">{totalPaid.toFixed(2)}</td>
                    <td className="p-3">{fmt(totalPaid * USD_TO_SAR)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ── Account Statement Modal ───────────────────────────── */}
      {statementOffice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-navy-500">
                  كشف حساب — {statementOffice.office_name}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  المستحق الصافي: {statementOffice.total_owed_usd.toFixed(2)} USD &nbsp;|&nbsp;
                  المدفوع: {statementOffice.total_paid_usd.toFixed(2)} USD &nbsp;|&nbsp;
                  <span className={statementOffice.balance_usd > 0 ? "text-orange-600 font-bold" : statementOffice.balance_usd < 0 ? "text-purple-600 font-bold" : "text-emerald-600 font-bold"}>
                    {statementOffice.balance_usd > 0
                      ? `متبقي علينا: ${statementOffice.balance_usd.toFixed(2)} USD`
                      : statementOffice.balance_usd < 0
                      ? `يُدين لنا: ${Math.abs(statementOffice.balance_usd).toFixed(2)} USD`
                      : "مسدد بالكامل ✓"}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={exportStatementExcel} className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1.5">
                  <FileSpreadsheet size={14} /> تحميل Excel
                </button>
                <button onClick={() => setStatementOffice(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-auto flex-1 p-4">
              {loadingStatement ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : statementEntries.length === 0 ? (
                <p className="text-center text-gray-400 py-12">لا توجد حركات مسجلة لهذا المكتب</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-navy-50 text-xs">
                      <th className="text-right p-2">التاريخ</th>
                      <th className="text-right p-2">البيان</th>
                      <th className="text-right p-2 text-red-600">مدين (نستحق له)</th>
                      <th className="text-right p-2 text-emerald-600">دائن (دفعنا له)</th>
                      <th className="text-right p-2">الرصيد الجاري</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementEntries.map((e, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-2 text-gray-500 whitespace-nowrap">{e.date}</td>
                        <td className="p-2">
                          <p className="text-xs">{e.description}</p>
                          {e.contract_number && (
                            <p className="text-[10px] text-gray-400">عقد: {e.contract_number}</p>
                          )}
                        </td>
                        <td className="p-2 text-red-600 font-bold">
                          {e.debit_usd > 0 ? `${e.debit_usd.toFixed(2)} $` : "—"}
                        </td>
                        <td className="p-2 text-emerald-600 font-bold">
                          {e.credit_usd > 0 ? `${e.credit_usd.toFixed(2)} $` : "—"}
                        </td>
                        <td className={`p-2 font-bold ${e.balance_usd > 0 ? "text-orange-600" : e.balance_usd < 0 ? "text-purple-600" : "text-emerald-600"}`}>
                          {e.balance_usd === 0
                            ? "صفر"
                            : e.balance_usd > 0
                            ? `${e.balance_usd.toFixed(2)} $ علينا`
                            : `${Math.abs(e.balance_usd).toFixed(2)} $ لنا`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-navy-50 font-bold text-sm border-t-2 border-navy-200">
                      <td className="p-2" colSpan={2}>الإجمالي</td>
                      <td className="p-2 text-red-600">
                        {statementEntries.reduce((s, e) => s + e.debit_usd, 0).toFixed(2)} $
                      </td>
                      <td className="p-2 text-emerald-600">
                        {statementEntries.reduce((s, e) => s + e.credit_usd, 0).toFixed(2)} $
                      </td>
                      <td className={`p-2 ${statementOffice.balance_usd > 0 ? "text-orange-600" : statementOffice.balance_usd < 0 ? "text-purple-600" : "text-emerald-600"}`}>
                        {statementOffice.balance_usd === 0
                          ? "مسدد ✓"
                          : statementOffice.balance_usd > 0
                          ? `${statementOffice.balance_usd.toFixed(2)} $ علينا`
                          : `${Math.abs(statementOffice.balance_usd).toFixed(2)} $ لنا`}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Payment Modal ─────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-navy-500">تسجيل دفعة جديدة للمكتب</h2>
              <button
                onClick={() => { setShowForm(false); setForm(defaultForm); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Office */}
              <div>
                <label className="block text-sm mb-1.5">المكتب الخارجي *</label>
                <select
                  value={form.external_office_id}
                  onChange={(e) => handleInput("external_office_id", e.target.value)}
                  className="w-full"
                >
                  <option value="">اختر المكتب...</option>
                  {offices.map((o) => {
                    const balance = balances.find((b) => b.id === o.id);
                    return (
                      <option key={o.id} value={o.id}>
                        {o.office_name}
                        {balance && balance.balance_usd > 0
                          ? ` — مستحق: ${balance.balance_usd.toFixed(2)} USD`
                          : balance && balance.balance_usd < 0
                          ? ` — يُدين لنا: ${Math.abs(balance.balance_usd).toFixed(2)} USD`
                          : ""}
                      </option>
                    );
                  })}
                </select>

                {/* Show balance for selected office */}
                {form.external_office_id && (() => {
                  const bal = balances.find((b) => b.id === form.external_office_id);
                  if (!bal) return null;
                  if (bal.balance_usd > 0) {
                    return (
                      <p className="text-xs text-orange-600 font-bold mt-1 flex items-center gap-1">
                        <Wallet size={12} />
                        الرصيد المستحق: {bal.balance_usd.toFixed(2)} USD ({fmt(bal.balance_sar)} ر.س)
                      </p>
                    );
                  }
                  if (bal.balance_usd < 0) {
                    return (
                      <p className="text-xs text-purple-600 font-bold mt-1 flex items-center gap-1">
                        <RotateCcw size={12} />
                        هذا المكتب يُدين لنا: {Math.abs(bal.balance_usd).toFixed(2)} USD
                      </p>
                    );
                  }
                  return (
                    <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
                      <CheckCircle size={12} />
                      رصيد المكتب مسدد بالكامل
                    </p>
                  );
                })()}
              </div>

              {/* Date + Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1.5">تاريخ الدفع *</label>
                  <input
                    type="date"
                    value={form.payment_date}
                    onChange={(e) => handleInput("payment_date", e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1.5">المبلغ (USD) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount_usd}
                    onChange={(e) => handleInput("amount_usd", e.target.value)}
                    className="w-full"
                  />
                  {form.amount_usd && Number(form.amount_usd) > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      = {fmt(Number(form.amount_usd) * USD_TO_SAR)} ر.س
                    </p>
                  )}
                </div>
              </div>

              {/* Payment type + method */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1.5">نوع الدفع</label>
                  <select
                    value={form.payment_type}
                    onChange={(e) => handleInput("payment_type", e.target.value)}
                    className="w-full"
                  >
                    {PAYMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1.5">طريقة الدفع</label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => handleInput("payment_method", e.target.value)}
                    className="w-full"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm mb-1.5">الوصف / الملاحظات</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات اختيارية..."
                  value={form.description}
                  onChange={(e) => handleInput("description", e.target.value)}
                  className="w-full resize-none"
                />
              </div>

              {/* Receipt URL */}
              <div>
                <label className="block text-sm mb-1.5">رابط إيصال الدفع (اختياري)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.receipt_url}
                  onChange={(e) => handleInput("receipt_url", e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                {saving ? "جاري الحفظ..." : "حفظ الدفعة"}
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
