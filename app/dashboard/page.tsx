"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import AuthLayout from "@/components/ui/AuthLayout";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import Link from "next/link";
import {
  FileText, Users, AlertTriangle, Wallet, Clock,
  TrendingUp, ArrowLeft, Plane, CalendarCheck
} from "lucide-react";

interface DashboardStats {
  totalOrders: number;
  activeOrders: number;
  arrivedThisMonth: number;
  underGuarantee: number;
  delayedContracts: number;
  availableWorkers: number;
  pendingMusaned: number;
  cancelledThisMonth: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0, activeOrders: 0, arrivedThisMonth: 0,
    underGuarantee: 0, delayedContracts: 0, availableWorkers: 0,
    pendingMusaned: 0, cancelledThisMonth: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    // Fetch counts in parallel
    const [
      { count: totalOrders },
      { count: activeOrders },
      { count: arrivedThisMonth },
      { count: underGuarantee },
      { count: delayedCount },
      { count: availableWorkers },
      { count: pendingMusaned },
      { count: cancelledThisMonth },
      { data: recent },
    ] = await Promise.all([
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true })
        .not("order_status", "in", '("arrived","cancelled")')
        .not("contract_number", "is", null),
      supabase.from("orders").select("*", { count: "exact", head: true })
        .eq("order_status", "arrived").gte("arrival_date", monthStart),
      supabase.from("contracts").select("*", { count: "exact", head: true })
        .eq("financial_status", "under_guarantee"),
      supabase.from("orders").select("*", { count: "exact", head: true })
        .not("order_status", "in", '("arrived","cancelled")')
        .not("contract_date", "is", null)
        .lt("contract_date", new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0]),
      supabase.from("available_workers").select("*", { count: "exact", head: true })
        .eq("availability", "available"),
      supabase.from("contracts").select("*", { count: "exact", head: true })
        .eq("financial_status", "under_masaned_hold"),
      supabase.from("orders").select("*", { count: "exact", head: true })
        .eq("order_status", "cancelled").gte("created_at", monthStart),
      supabase.from("orders").select("*")
        .order("created_at", { ascending: false }).limit(8),
    ]);

    setStats({
      totalOrders: totalOrders || 0,
      activeOrders: activeOrders || 0,
      arrivedThisMonth: arrivedThisMonth || 0,
      underGuarantee: underGuarantee || 0,
      delayedContracts: delayedCount || 0,
      availableWorkers: availableWorkers || 0,
      pendingMusaned: pendingMusaned || 0,
      cancelledThisMonth: cancelledThisMonth || 0,
    });
    setRecentOrders(recent || []);
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
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard title="إجمالي الطلبات" value={stats.totalOrders} icon={<FileText size={24} className="text-navy-500" />} color="navy" />
            <StatCard title="طلبات نشطة" value={stats.activeOrders} icon={<Clock size={24} className="text-blue-600" />} color="blue" />
            <StatCard title="وصول هذا الشهر" value={stats.arrivedThisMonth} icon={<Plane size={24} className="text-emerald-600" />} color="green" />
            <StatCard title="تحت الضمان" value={stats.underGuarantee} icon={<CalendarCheck size={24} className="text-orange-600" />} color="orange" />
            <StatCard title="عقود متأخرة" value={stats.delayedContracts} icon={<AlertTriangle size={24} className="text-red-600" />} color="red" subtitle="> 30 يوم بدون وصول" />
            <StatCard title="عاملات متاحة" value={stats.availableWorkers} icon={<Users size={24} className="text-emerald-600" />} color="green" />
            <StatCard title="بانتظار تحويل مساند" value={stats.pendingMusaned} icon={<Wallet size={24} className="text-orange-600" />} color="orange" />
            <StatCard title="ملغي هذا الشهر" value={stats.cancelledThisMonth} icon={<FileText size={24} className="text-red-600" />} color="red" />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-navy-500">آخر الطلبات</h3>
                <Link href="/orders" className="text-sm text-navy-500 hover:underline flex items-center gap-1">
                  عرض الكل <ArrowLeft size={14} />
                </Link>
              </div>
              <div className="space-y-3">
                {recentOrders.map((order) => (
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
                {recentOrders.length === 0 && (
                  <p className="text-gray-400 text-center py-4">لا توجد طلبات بعد</p>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="card">
              <h3 className="font-bold text-navy-500 mb-4">وصول سريع</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { href: "/orders/new", label: "طلب جديد", icon: <FileText size={20} /> },
                  { href: "/cvs/new", label: "إضافة سيرة ذاتية", icon: <Users size={20} /> },
                  { href: "/reports/delayed", label: "العقود المتأخرة", icon: <AlertTriangle size={20} /> },
                  { href: "/reports/financial", label: "التقارير المالية", icon: <TrendingUp size={20} /> },
                  { href: "/contracts", label: "العقود", icon: <Wallet size={20} /> },
                  { href: "/reports/analytics", label: "التحليلات", icon: <TrendingUp size={20} /> },
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
