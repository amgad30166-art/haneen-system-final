"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import AuthLayout from "@/components/ui/AuthLayout";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import Link from "next/link";
import {
  FileText, Users, AlertTriangle, Wallet,
  TrendingUp, ArrowLeft, Plane, CalendarCheck, Globe,
} from "lucide-react";
import { NATIONALITIES } from "@/lib/constants";

interface DashboardStats {
  totalContractsThisMonth: number;
  activeContracts: number;
  arrivedThisMonth: number;
  delayedContracts: number;
  availableWorkers: number;
}


export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalContractsThisMonth: 0, activeContracts: 0,
    arrivedThisMonth: 0, delayedContracts: 0, availableWorkers: 0,
  });
  const [natCounts, setNatCounts] = useState<Record<string, number>>({});
  const [recentContracts, setRecentContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => { fetchDashboard(); }, []);

  async function fetchDashboard() {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];

    const [
      { count: totalThisMonth },
      { count: activeCount },
      { count: arrivedCount },
      { count: delayedCount },
      { count: workersCount },
      { data: recent },
      { data: activeNatRows },
    ] = await Promise.all([
      // total contracts this month = contract_date falls within this calendar month
      supabase.from("orders").select("*", { count: "exact", head: true })
        .not("contract_number", "is", null)
        .gte("contract_date", monthStart)
        .lt("contract_date", nextMonthStart),
      // active = has contract_number, not arrived, not cancelled
      supabase.from("orders").select("*", { count: "exact", head: true })
        .not("order_status", "in", '("arrived","cancelled")')
        .not("contract_number", "is", null),
      // arrived this month (must have contract_number)
      supabase.from("orders").select("*", { count: "exact", head: true })
        .not("contract_number", "is", null)
        .eq("order_status", "arrived").gte("arrival_date", monthStart),
      // delayed: has contract_number, not arrived/cancelled, contract_date > 30 days ago
      supabase.from("orders").select("*", { count: "exact", head: true })
        .not("contract_number", "is", null)
        .not("order_status", "in", '("arrived","cancelled")')
        .not("contract_date", "is", null)
        .lt("contract_date", thirtyDaysAgo),
      // available workers
      supabase.from("available_workers").select("*", { count: "exact", head: true })
        .eq("availability", "available"),
      // recent contracts (must have contract_number)
      supabase.from("orders").select("*")
        .not("contract_number", "is", null)
        .order("created_at", { ascending: false }).limit(8),
      // nationality breakdown of active contracts
      supabase.from("orders").select("nationality")
        .not("order_status", "in", '("arrived","cancelled")')
        .not("contract_number", "is", null),
    ]);

    // group by nationality client-side
    const counts: Record<string, number> = {};
    (activeNatRows || []).forEach((o: any) => {
      if (o.nationality) counts[o.nationality] = (counts[o.nationality] || 0) + 1;
    });

    setStats({
      totalContractsThisMonth: totalThisMonth || 0,
      activeContracts: activeCount || 0,
      arrivedThisMonth: arrivedCount || 0,
      delayedContracts: delayedCount || 0,
      availableWorkers: workersCount || 0,
    });
    setNatCounts(counts);
    setRecentContracts(recent || []);
    setLoading(false);
  }

  return (
    <AuthLayout>
      <PageHeader title="لوحة التحكم" subtitle="مرحباً أحمد — نظرة عامة على المكتب" />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Stats Grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard
              title="إجمالي العقود هذا الشهر"
              value={stats.totalContractsThisMonth}
              icon={<FileText size={24} className="text-navy-500" />}
              color="navy"
            />
            <StatCard
              title="العقود السارية"
              value={stats.activeContracts}
              icon={<CalendarCheck size={24} className="text-blue-600" />}
              color="blue"
            />
            <StatCard
              title="وصول هذا الشهر"
              value={stats.arrivedThisMonth}
              icon={<Plane size={24} className="text-emerald-600" />}
              color="green"
            />
            <StatCard
              title="عقود متأخرة"
              value={stats.delayedContracts}
              icon={<AlertTriangle size={24} className="text-red-600" />}
              color="red"
              subtitle="> 30 يوم بدون وصول"
            />
            <StatCard
              title="عاملات متاحة"
              value={stats.availableWorkers}
              icon={<Users size={24} className="text-emerald-600" />}
              color="green"
            />
          </div>

          {/* ── Active Contracts by Nationality ── */}
          <div className="card mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={18} className="text-navy-500" />
              <h3 className="font-bold text-navy-500">العقود السارية حسب الجنسية</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {NATIONALITIES.map((n) => (
                <div key={n.value}
                  className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <p className="text-sm font-bold text-gray-600">{n.label}</p>
                  <p className="font-bold text-3xl text-navy-500">{natCounts[n.value] || 0}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Bottom row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Contracts */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-navy-500">آخر العقود</h3>
                <Link href="/orders" className="text-sm text-navy-500 hover:underline flex items-center gap-1">
                  عرض الكل <ArrowLeft size={14} />
                </Link>
              </div>
              <div className="space-y-3">
                {recentContracts.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-sm">{order.client_name}</p>
                      <p className="text-xs text-gray-400">{order.phone}</p>
                    </div>
                    <StatusBadge status={order.order_status} />
                  </Link>
                ))}
                {recentContracts.length === 0 && (
                  <p className="text-gray-400 text-center py-4">لا توجد عقود بعد</p>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="card">
              <h3 className="font-bold text-navy-500 mb-4">وصول سريع</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { href: "/orders/new",       label: "عقد جديد",         icon: <FileText size={20} /> },
                  { href: "/cvs/new",           label: "إضافة سيرة ذاتية", icon: <Users size={20} /> },
                  { href: "/reports/delayed",   label: "العقود المتأخرة",  icon: <AlertTriangle size={20} /> },
                  { href: "/reports/financial", label: "التقارير المالية", icon: <TrendingUp size={20} /> },
                  { href: "/contracts",         label: "العقود",           icon: <Wallet size={20} /> },
                  { href: "/reports/analytics", label: "التحليلات",        icon: <TrendingUp size={20} /> },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-navy-300 hover:bg-navy-50 transition-all"
                  >
                    <div className="text-navy-500">{link.icon}</div>
                    <span className="font-bold text-sm">{link.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </AuthLayout>
  );
}
