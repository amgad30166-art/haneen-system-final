"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import AuthLayout from "@/components/ui/AuthLayout";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { useRouter } from "next/navigation";
import { NATIONALITIES, ORDER_STATUSES } from "@/lib/constants";
import { Order } from "@/lib/types";
import { Plus, Copy, RefreshCw, Filter, Download } from "lucide-react";
import { toast } from "sonner";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterNationality, setFilterNationality] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
  }, [filterStatus, filterNationality]);

  async function fetchOrders() {
    setLoading(true);
    let query = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterStatus) query = query.eq("order_status", filterStatus);
    if (filterNationality) query = query.eq("nationality", filterNationality);

    const { data, error } = await query;
    if (data) setOrders(data);
    setLoading(false);
  }

  const filteredOrders = orders.filter((o) => {
    if (!filterSearch) return true;
    const s = filterSearch.toLowerCase();
    return (
      o.client_name?.toLowerCase().includes(s) ||
      o.phone?.includes(s) ||
      o.visa_number?.includes(s) ||
      o.contract_number?.includes(s) ||
      o.passport_number?.includes(s) ||
      o.worker_name?.toLowerCase().includes(s)
    );
  });

  const copyAllVisa = () => {
    const visas = filteredOrders
      .filter((o) => o.visa_number)
      .map((o) => o.visa_number)
      .join("\n");
    if (!visas) {
      toast.error("لا توجد أرقام تأشيرات");
      return;
    }
    navigator.clipboard.writeText(visas);
    toast.success(`تم نسخ ${visas.split("\n").length} رقم تأشيرة`);
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;

    const { error } = await supabase
      .from("orders")
      .update({ order_status: bulkStatus })
      .in("id", Array.from(selectedIds));

    if (error) {
      toast.error("حدث خطأ أثناء التحديث");
    } else {
      toast.success(`تم تحديث ${selectedIds.size} طلب`);
      setSelectedIds(new Set());
      setShowBulkModal(false);
      setBulkStatus("");
      fetchOrders();
    }
  };

  const columns = [
    { key: "client_name", label: "اسم العميل", sortable: true },
    { key: "phone", label: "الجوال", sortable: true },
    {
      key: "nationality",
      label: "الجنسية",
      render: (o: Order) => NATIONALITIES.find((n) => n.value === o.nationality)?.label || o.nationality,
      sortable: true,
    },
    { key: "worker_name", label: "العاملة", sortable: true },
    { key: "contract_number", label: "رقم العقد", sortable: true },
    { key: "visa_number", label: "رقم التأشيرة", sortable: true },
    {
      key: "order_status",
      label: "الحالة",
      render: (o: Order) => <StatusBadge status={o.order_status} />,
      sortable: true,
    },
    {
      key: "contract_date",
      label: "تاريخ العقد",
      render: (o: Order) => o.contract_date ? new Date(o.contract_date).toLocaleDateString("ar-SA") : "—",
      sortable: true,
    },
  ];

  return (
    <AuthLayout>
      <PageHeader title="الطلبات" subtitle={`${filteredOrders.length} طلب`}>
        <button onClick={copyAllVisa} className="btn-secondary flex items-center gap-2 text-sm">
          <Copy size={16} /> نسخ التأشيرات
        </button>
        <button onClick={() => router.push("/orders/new")} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> طلب جديد
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm mb-1">بحث</label>
            <input
              type="text"
              placeholder="اسم، جوال، تأشيرة، عقد، جواز..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="w-48">
            <label className="block text-sm mb-1">الحالة</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full">
              <option value="">الكل</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="w-48">
            <label className="block text-sm mb-1">الجنسية</label>
            <select value={filterNationality} onChange={(e) => setFilterNationality(e.target.value)} className="w-full">
              <option value="">الكل</option>
              {NATIONALITIES.map((n) => (
                <option key={n.value} value={n.value}>{n.label}</option>
              ))}
            </select>
          </div>
          <button onClick={fetchOrders} className="btn-secondary flex items-center gap-2 text-sm h-[44px]">
            <RefreshCw size={16} /> تحديث
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-navy-50 border border-navy-200 rounded-xl p-4 mb-4 flex flex-wrap items-center gap-4">
          <span className="font-bold text-navy-500">
            تم تحديد {selectedIds.size} طلب
          </span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="w-48"
          >
            <option value="">اختر الحالة الجديدة</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={() => {
              if (!bulkStatus) { toast.error("اختر حالة أولاً"); return; }
              setShowBulkModal(true);
            }}
            className="btn-primary text-sm"
          >
            تحديث الحالة
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-500 hover:text-gray-700">
            إلغاء التحديد
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredOrders}
          onRowClick={(o) => router.push(`/orders/${o.id}`)}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      )}

      {/* Bulk Confirm Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-navy-500 mb-4">تأكيد التحديث الجماعي</h3>
            <p className="text-gray-600 mb-2">
              هل أنت متأكد من تغيير حالة <strong>{selectedIds.size}</strong> طلب إلى:
            </p>
            <div className="my-3">
              <StatusBadge status={bulkStatus} />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleBulkUpdate} className="btn-primary flex-1">
                تأكيد
              </button>
              <button onClick={() => setShowBulkModal(false)} className="btn-secondary flex-1">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
