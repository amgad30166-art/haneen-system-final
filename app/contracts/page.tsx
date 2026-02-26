"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import AuthLayout from "@/components/ui/AuthLayout";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { useRouter } from "next/navigation";
import { FINANCIAL_STATUSES } from "@/lib/constants";
import { Contract } from "@/lib/types";
import { RefreshCw } from "lucide-react";

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => { fetchContracts(); }, [filterStatus]);

  async function fetchContracts() {
    setLoading(true);
    let query = supabase.from("contracts").select("*").order("created_at", { ascending: false });
    if (filterStatus) query = query.eq("financial_status", filterStatus);
    const { data } = await query;
    if (data) setContracts(data);
    setLoading(false);
  }

  const filtered = contracts.filter((c) => {
    if (!filterSearch) return true;
    const s = filterSearch.toLowerCase();
    return c.contract_number?.toLowerCase().includes(s) || c.client_name?.toLowerCase().includes(s);
  });

  const fmt = (n?: number | null) => n != null ? n.toLocaleString("ar-SA", { minimumFractionDigits: 2 }) : "—";

  const columns = [
    { key: "contract_number", label: "رقم العقد", sortable: true },
    { key: "client_name", label: "العميل", sortable: true },
    {
      key: "contract_date", label: "التاريخ", sortable: true,
      render: (c: Contract) => c.contract_date ? new Date(c.contract_date).toLocaleDateString("ar-SA") : "—",
    },
    { key: "client_payment", label: "المبلغ المدفوع", render: (c: Contract) => `${fmt(c.client_payment)} ر.س` },
    { key: "expected_from_musaned", label: "المتوقع من مساند", render: (c: Contract) => `${fmt(c.expected_from_musaned)} ر.س` },
    { key: "total_expenses", label: "المصروفات", render: (c: Contract) => `${fmt(c.total_expenses)} ر.س` },
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
      <PageHeader title="العقود" subtitle={`${filtered.length} عقد`} />

      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm mb-1">بحث</label>
            <input type="text" placeholder="رقم العقد أو اسم العميل..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} className="w-full" />
          </div>
          <div className="w-52">
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
