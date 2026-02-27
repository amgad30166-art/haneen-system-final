"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import AuthLayout from "@/components/ui/AuthLayout";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { NATIONALITIES } from "@/lib/constants";
import { Search } from "lucide-react";

export default function CheckPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    // Search by contract_number OR phone
    const { data } = await supabase
      .from("orders")
      .select("*")
      .or(`contract_number.eq.${query.trim()},phone.eq.${query.trim()}`);

    setResults(data || []);
    setLoading(false);
  }

  return (
    <AuthLayout>
      <PageHeader title="البحث" subtitle="البحث برقم العقد أو رقم الجوال" />

      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSearch} className="card mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="أدخل رقم العقد أو رقم الجوال..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 text-lg"
              dir="ltr"
              autoFocus
            />
            <button type="submit" className="btn-primary flex items-center gap-2">
              <Search size={18} /> بحث
            </button>
          </div>
        </form>

        {loading && (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {searched && !loading && results.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <Search size={48} className="mx-auto mb-3 opacity-50" />
            <p className="font-bold">لم يتم العثور على نتائج</p>
          </div>
        )}

        {results.map((order) => (
          <div key={order.id} className="card mb-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg text-navy-500">{order.client_name}</h3>
                <p className="text-sm text-gray-500">{order.phone}</p>
              </div>
              <StatusBadge status={order.order_status} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <label className="text-gray-400">رقم العقد</label>
                <p className="font-bold">{order.contract_number || "—"}</p>
              </div>
              <div>
                <label className="text-gray-400">رقم التأشيرة</label>
                <p className="font-bold">{order.visa_number || "—"}</p>
              </div>
              <div>
                <label className="text-gray-400">الجنسية</label>
                <p className="font-bold">{NATIONALITIES.find((n) => n.value === order.nationality)?.label}</p>
              </div>
              <div>
                <label className="text-gray-400">العاملة</label>
                <p className="font-bold">{order.worker_name || "—"}</p>
              </div>
              <div>
                <label className="text-gray-400">تاريخ العقد</label>
                <p className="font-bold">{order.contract_date ? new Date(order.contract_date).toLocaleDateString("en-US") : "—"}</p>
              </div>
              <div>
                <label className="text-gray-400">تاريخ الوصول</label>
                <p className="font-bold">{order.arrival_date ? new Date(order.arrival_date).toLocaleDateString("en-US") : "—"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AuthLayout>
  );
}
