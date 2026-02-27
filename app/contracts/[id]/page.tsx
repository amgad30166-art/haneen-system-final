"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import AuthLayout from "@/components/ui/AuthLayout";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { useRouter, useParams } from "next/navigation";
import { FINANCIAL_STATUSES } from "@/lib/constants";
import { Contract } from "@/lib/types";
import { toast } from "sonner";
import { Save, ArrowRight, Copy, ExternalLink, BookOpen } from "lucide-react";

export default function ContractDetailPage() {
  const { id } = useParams();
  const supabase = createClient();
  const router = useRouter();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchContract(); }, [id]);

  async function fetchContract() {
    const { data } = await supabase.from("contracts").select("*").eq("id", id).single();
    if (data) setContract(data);
    setLoading(false);
  }

  async function handleSave() {
    if (!contract) return;
    setSaving(true);

    const { error } = await supabase
      .from("contracts")
      .update({
        client_payment: contract.client_payment,
        musaned_fee_type: contract.musaned_fee_type,
        actual_from_musaned: contract.actual_from_musaned || null,
        musaned_transfer_date: contract.musaned_transfer_date || null,
        tax_base: contract.tax_base || null,
        external_commission_usd: contract.external_commission_usd,
        ahmed_commission: contract.ahmed_commission,
        wajdi_commission: contract.wajdi_commission,
        pool_commission: contract.pool_commission,
        sadaqa: contract.sadaqa,
        other_expenses: contract.other_expenses,
        cancellation_status: contract.cancellation_status,
        refund_amount: contract.refund_amount || null,
        refund_date: contract.refund_date || null,
        cancellation_notes: contract.cancellation_notes || null,
        financial_status: contract.financial_status,
      })
      .eq("id", contract.id);

    if (error) {
      toast.error("خطأ: " + error.message);
    } else {
      toast.success("تم حفظ العقد");
      fetchContract();
    }
    setSaving(false);
  }

  const update = (key: string, value: any) => setContract((c) => c ? { ...c, [key]: value } : null);
  const fmt = (n?: number | null) => n != null ? Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "—";
  const trackingUrl = contract?.magic_token ? `${typeof window !== 'undefined' ? window.location.origin : ''}/track/${contract.magic_token}` : "";

  if (loading) return <AuthLayout><div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" /></div></AuthLayout>;
  if (!contract) return <AuthLayout><p className="text-center py-20 text-gray-400">لم يتم العثور على العقد</p></AuthLayout>;

  return (
    <AuthLayout>
      <PageHeader title={`عقد: ${contract.contract_number}`} subtitle={contract.client_name || ""}>
        <button onClick={() => router.push("/contracts")} className="btn-secondary flex items-center gap-2 text-sm">
          <ArrowRight size={16} /> رجوع
        </button>
        <button onClick={() => router.push(`/contracts/${id}/transactions`)} className="btn-secondary flex items-center gap-2 text-sm">
          <BookOpen size={16} /> دفتر الأستاذ
        </button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
          حفظ
        </button>
      </PageHeader>

      <div className="space-y-6 max-w-4xl">
        {/* Status + Token */}
        <div className="card flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm mb-1">الحالة المالية</label>
            <select value={contract.financial_status} onChange={(e) => update("financial_status", e.target.value)} className="w-48">
              {FINANCIAL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          {trackingUrl && (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm mb-1">رابط متابعة العميل</label>
              <div className="flex gap-2">
                <input type="text" value={trackingUrl} readOnly className="flex-1 text-xs" dir="ltr" />
                <button onClick={() => { navigator.clipboard.writeText(trackingUrl); toast.success("تم نسخ الرابط"); }} className="btn-secondary text-xs px-3 flex items-center gap-1">
                  <Copy size={14} /> نسخ
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Revenue Section */}
        <div className="card">
          <h3 className="font-bold text-navy-500 mb-4">الإيرادات</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">المبلغ المدفوع من العميل (ر.س)</label>
              <input type="number" step="0.01" value={contract.client_payment || ""} onChange={(e) => update("client_payment", parseFloat(e.target.value) || 0)} className="w-full" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm mb-1">نسبة مساند</label>
              <select value={contract.musaned_fee_type} onChange={(e) => update("musaned_fee_type", e.target.value)} className="w-full">
                <option value="fixed_125_35">ثابت 125.35 ر.س</option>
                <option value="percent_2_4">2.4% من المبلغ</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">استقطاع مساند</label>
              <input type="text" value={`${fmt(contract.musaned_fee_value)} ر.س`} readOnly className="w-full bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm mb-1">المتوقع من مساند</label>
              <input type="text" value={`${fmt(contract.expected_from_musaned)} ر.س`} readOnly className="w-full bg-green-50 text-green-700 font-bold" />
            </div>
            <div>
              <label className="block text-sm mb-1">المبلغ المحوّل فعلياً</label>
              <input type="number" step="0.01" value={contract.actual_from_musaned ?? ""} onChange={(e) => update("actual_from_musaned", parseFloat(e.target.value) || null)} className="w-full" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm mb-1">تاريخ التحويل</label>
              <input type="date" value={contract.musaned_transfer_date || ""} onChange={(e) => update("musaned_transfer_date", e.target.value)} className="w-full" />
            </div>
          </div>
        </div>

        {/* Expenses */}
        <div className="card">
          <h3 className="font-bold text-navy-500 mb-4">المصروفات</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">الوعاء الضريبي</label>
              <input type="number" step="0.01" value={contract.tax_base ?? ""} onChange={(e) => update("tax_base", parseFloat(e.target.value) || null)} className="w-full" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm mb-1">الضريبة 15%</label>
              <input type="text" value={`${fmt(contract.tax_15_percent)} ر.س`} readOnly className="w-full bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm mb-1">عمولة المكتب الخارجي ($)</label>
              <input type="number" step="0.01" value={contract.external_commission_usd || ""} onChange={(e) => update("external_commission_usd", parseFloat(e.target.value) || 0)} className="w-full" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm mb-1">عمولة المكتب (ر.س)</label>
              <input type="text" value={`${fmt(contract.external_commission_sar)} ر.س`} readOnly className="w-full bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm mb-1">عمولة أحمد</label>
              <input type="number" step="0.01" value={contract.ahmed_commission || ""} onChange={(e) => update("ahmed_commission", parseFloat(e.target.value) || 0)} className="w-full" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm mb-1">عمولة وجدي</label>
              <input type="number" step="0.01" value={contract.wajdi_commission || ""} onChange={(e) => update("wajdi_commission", parseFloat(e.target.value) || 0)} className="w-full" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm mb-1">الوكالة (ثابت)</label>
              <input type="text" value="136 ر.س" readOnly className="w-full bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm mb-1">عمولة البول (فلبين)</label>
              <input type="number" step="0.01" value={contract.pool_commission || ""} onChange={(e) => update("pool_commission", parseFloat(e.target.value) || 0)} className="w-full" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm mb-1">صدقة</label>
              <input type="number" step="0.01" value={contract.sadaqa || ""} onChange={(e) => update("sadaqa", parseFloat(e.target.value) || 0)} className="w-full" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm mb-1">مصاريف أخرى</label>
              <input type="number" step="0.01" value={contract.other_expenses || ""} onChange={(e) => update("other_expenses", parseFloat(e.target.value) || 0)} className="w-full" dir="ltr" />
            </div>
          </div>

          {/* Totals */}
          <div className="mt-6 p-4 rounded-xl bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">إجمالي المصروفات</label>
              <p className="text-xl font-bold text-red-600">{fmt(contract.total_expenses)} ر.س</p>
            </div>
            <div>
              <label className="block text-sm mb-1">الربح التقريبي (مرجعي)</label>
              <p className={`text-xl font-bold ${(contract.approx_profit || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {fmt(contract.approx_profit)} ر.س
              </p>
            </div>
          </div>
        </div>

        {/* Cancellation */}
        <div className="card">
          <h3 className="font-bold text-red-600 mb-4">بيانات الإلغاء</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">حالة الإلغاء</label>
              <select value={contract.cancellation_status} onChange={(e) => update("cancellation_status", e.target.value)} className="w-full">
                <option value="none">لا إلغاء</option>
                <option value="within_5_days">إلغاء خلال 5 أيام</option>
                <option value="after_5_days">إلغاء بعد 5 أيام</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">المبلغ المُرجَع</label>
              <input type="number" step="0.01" value={contract.refund_amount ?? ""} onChange={(e) => update("refund_amount", parseFloat(e.target.value) || null)} className="w-full" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm mb-1">تاريخ الإرجاع</label>
              <input type="date" value={contract.refund_date || ""} onChange={(e) => update("refund_date", e.target.value)} className="w-full" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm mb-1">ملاحظات الإلغاء</label>
              <textarea value={contract.cancellation_notes || ""} onChange={(e) => update("cancellation_notes", e.target.value)} rows={2} className="w-full" />
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
