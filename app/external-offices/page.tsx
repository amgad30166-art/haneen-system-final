"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import AuthLayout from "@/components/ui/AuthLayout";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import { NATIONALITIES } from "@/lib/constants";
import { ExternalOffice } from "@/lib/types";
import { toast } from "sonner";
import { Plus, Save, X } from "lucide-react";

export default function ExternalOfficesPage() {
  const [offices, setOffices] = useState<ExternalOffice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ office_name: "", type: "office", country: "ethiopia", code: "", email: "", phone: "", notes: "" });
  const supabase = createClient();

  useEffect(() => { fetch(); }, []);

  async function fetch() {
    const { data } = await supabase.from("external_offices").select("*").order("office_name");
    if (data) setOffices(data);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("external_offices").insert(form);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الإضافة");
    setShowAdd(false);
    setForm({ office_name: "", type: "office", country: "ethiopia", code: "", email: "", phone: "", notes: "" });
    fetch();
  }

  const columns = [
    { key: "office_name", label: "اسم المكتب", sortable: true },
    { key: "type", label: "النوع", render: (o: ExternalOffice) => o.type === "office" ? "مكتب" : "شخص" },
    { key: "country", label: "الدولة", render: (o: ExternalOffice) => NATIONALITIES.find((n) => n.value === o.country)?.label || o.country, sortable: true },
    { key: "code", label: "الكود" },
    { key: "email", label: "البريد" },
    { key: "phone", label: "الجوال" },
  ];

  return (
    <AuthLayout>
      <PageHeader title="المكاتب الخارجية" subtitle={`${offices.length} مكتب`}>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> إضافة مكتب
        </button>
      </PageHeader>

      {showAdd && (
        <div className="card mb-6 border-2 border-navy-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-navy-500">مكتب جديد</h3>
            <button onClick={() => setShowAdd(false)}><X size={20} className="text-gray-400" /></button>
          </div>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">اسم المكتب *</label>
              <input type="text" required value={form.office_name} onChange={(e) => setForm({ ...form, office_name: e.target.value })} className="w-full" />
            </div>
            <div>
              <label className="block text-sm mb-1">النوع</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full">
                <option value="office">مكتب</option>
                <option value="person">شخص</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">الدولة *</label>
              <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="w-full">
                {NATIONALITIES.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">الكود</label>
              <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm mb-1">البريد</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm mb-1">الجوال</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full" dir="ltr" />
            </div>
            <div className="md:col-span-3 flex gap-3">
              <button type="submit" className="btn-primary flex items-center gap-2"><Save size={16} /> حفظ</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-navy-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <DataTable columns={columns} data={offices} />
      )}
    </AuthLayout>
  );
}
