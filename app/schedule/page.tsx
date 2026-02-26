"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import AuthLayout from "@/components/ui/AuthLayout";
import PageHeader from "@/components/ui/PageHeader";
import { NATIONALITIES } from "@/lib/constants";
import { Plane, RotateCcw, Calendar } from "lucide-react";

export default function SchedulePage() {
  const [arrivals, setArrivals] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => { fetchSchedule(); }, []);

  async function fetchSchedule() {
    const today = new Date().toISOString();

    const [{ data: arr }, { data: ret }] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .in("order_status", ["ticket_booked", "visa_issued"])
        .not("travel_date", "is", null)
        .order("travel_date", { ascending: true })
        .limit(20),
      supabase
        .from("orders")
        .select("*")
        .eq("order_status", "arrived")
        .not("return_date", "is", null)
        .order("return_date", { ascending: true })
        .limit(20),
    ]);

    setArrivals(arr || []);
    setReturns(ret || []);
    setLoading(false);
  }

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("ar-SA", { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <AuthLayout>
      <PageHeader title="جدول المواعيد" subtitle="المواعيد القادمة للوصول والرجوع" />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Arrivals */}
          <div className="card">
            <h3 className="font-bold text-navy-500 mb-4 flex items-center gap-2">
              <Plane size={20} /> الوصول القادم
            </h3>
            {arrivals.length === 0 ? (
              <p className="text-gray-400 text-center py-8">لا توجد مواعيد وصول</p>
            ) : (
              <div className="space-y-3">
                {arrivals.map((o) => (
                  <div key={o.id} className="p-4 rounded-xl bg-navy-50 border border-navy-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold">{o.client_name}</p>
                        <p className="text-sm text-gray-500">{o.worker_name || "—"}</p>
                      </div>
                      <span className="text-xs font-bold bg-navy-500 text-white px-2 py-1 rounded">
                        {NATIONALITIES.find((n) => n.value === o.nationality)?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-navy-600">
                      <Calendar size={14} />
                      <span className="font-bold">{formatDate(o.travel_date)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{o.phone}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Returns */}
          <div className="card">
            <h3 className="font-bold text-orange-600 mb-4 flex items-center gap-2">
              <RotateCcw size={20} /> الرجوع القادم
            </h3>
            {returns.length === 0 ? (
              <p className="text-gray-400 text-center py-8">لا توجد مواعيد رجوع</p>
            ) : (
              <div className="space-y-3">
                {returns.map((o) => (
                  <div key={o.id} className="p-4 rounded-xl bg-orange-50 border border-orange-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold">{o.client_name}</p>
                        <p className="text-sm text-gray-500">{o.worker_name || "—"}</p>
                      </div>
                      <span className="text-xs font-bold bg-orange-500 text-white px-2 py-1 rounded">
                        {NATIONALITIES.find((n) => n.value === o.nationality)?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <Calendar size={14} />
                      <span className="font-bold">{formatDate(o.return_date)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{o.phone}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
