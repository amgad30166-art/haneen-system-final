"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { UserRole } from "@/lib/types";
import {
  LayoutDashboard, FileText, Users, Building2, Wallet,
  AlertTriangle, BarChart3, Search, Truck, Globe,
  LogOut, ChevronRight, Menu, X, ClipboardList,
  TrendingUp, UserCheck, BookOpen
} from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  role: UserRole;
  displayName: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "لوحة التحكم", icon: <LayoutDashboard size={20} />, roles: ["admin"] },
  { href: "/reports/owner", label: "لوحة المالك", icon: <TrendingUp size={20} />, roles: ["owner"] },
  { href: "/orders", label: "الطلبات", icon: <FileText size={20} />, roles: ["admin", "data_entry", "owner"] },
  { href: "/contracts", label: "العقود", icon: <ClipboardList size={20} />, roles: ["admin", "owner"] },
  { href: "/cvs", label: "السير الذاتية", icon: <Users size={20} />, roles: ["admin", "data_entry", "owner"] },
  { href: "/external-offices", label: "المكاتب الخارجية", icon: <Building2 size={20} />, roles: ["admin"] },
  { href: "/external-accounts", label: "حسابات المكاتب", icon: <Wallet size={20} />, roles: ["admin", "owner"] },
  { href: "/reports/financial", label: "التقارير المالية", icon: <BarChart3 size={20} />, roles: ["admin", "owner"] },
  { href: "/reports/analytics", label: "التحليلات", icon: <TrendingUp size={20} />, roles: ["admin", "owner"] },
  { href: "/reports/delayed", label: "العقود المتأخرة", icon: <AlertTriangle size={20} />, roles: ["admin", "owner"] },
  { href: "/check", label: "البحث", icon: <Search size={20} />, roles: ["check_user"] },
  { href: "/schedule", label: "جدول الوصول", icon: <Truck size={20} />, roles: ["driver", "admin"] },
  { href: "/help/finance", label: "الدليل المالي", icon: <BookOpen size={20} />, roles: ["admin", "owner"] },
];

export default function Sidebar({ role, displayName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <img src="/logo.png" alt="" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm">حنين الشرق</h2>
            <p className="text-navy-200 text-xs">نظام الإدارة</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`sidebar-link ${isActive ? "active bg-white/10 text-white" : ""}`}
            >
              {item.icon}
              <span>{item.label}</span>
              {isActive && <ChevronRight size={16} className="mr-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
            <UserCheck size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-bold">{displayName}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-red-300 hover:text-red-200 hover:bg-red-500/10"
        >
          <LogOut size={20} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 right-4 z-50 bg-navy-500 text-white p-2 rounded-lg shadow-lg no-print"
      >
        <Menu size={24} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 right-0 h-full w-64 bg-navy-500 z-50 flex flex-col
          transition-transform duration-300 ease-in-out no-print
          lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-4 left-4 text-white"
        >
          <X size={24} />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}
