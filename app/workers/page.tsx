"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase";
import Image from "next/image";
import {
  Phone, Search, MessageCircle, X, Shield,
  CheckCircle2, Users, Play, Star,
  Sparkles, MapPin, ArrowUpDown,
  Heart, Clock, Globe, ZoomIn,
} from "lucide-react";
import { NATIONALITIES, PROFESSIONS, COMPANY_INFO } from "@/lib/constants";

/* ─── types ─────────────────────────────────────────────────── */
interface Worker {
  worker_name: string;
  passport_number: string;
  date_of_birth: string;
  religion: string;
  photo_url?: string;
  profile_photo?: string;
  video_url?: string;
  nationality: string;
  profession: string;
  new_or_experienced: string;
  marital_status?: string;
  children_count?: number;
  salary: number;
  worker_age: number;
}

/* ─── constants ─────────────────────────────────────────────── */
const RELIGION_LABELS: Record<string, string> = { muslim: "مسلمة", christian: "مسيحية" };
const MARITAL_LABELS:  Record<string, string> = {
  single: "عزباء", married: "متزوجة", divorced: "مطلقة", widowed: "أرملة",
};
const FLAG: Record<string, string> = {
  ethiopia: "🇪🇹", kenya: "🇰🇪", uganda: "🇺🇬", philippines: "🇵🇭", india: "🇮🇳",
};
const NAT_ACCENT: Record<string, { bg: string; text: string; border: string }> = {
  ethiopia:    { bg: "#DCFCE7", text: "#166534", border: "#86EFAC" },
  kenya:       { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },
  uganda:      { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
  philippines: { bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" },
  india:       { bg: "#FFEDD5", text: "#9A3412", border: "#FDBA74" },
};
const NAT_GRAD: Record<string, string> = {
  ethiopia:    "linear-gradient(160deg,#065f46,#059669)",
  kenya:       "linear-gradient(160deg,#0f172a,#1e3a5f)",
  uganda:      "linear-gradient(160deg,#78350f,#d97706)",
  philippines: "linear-gradient(160deg,#1e3a8a,#2563eb)",
  india:       "linear-gradient(160deg,#7c2d12,#ea580c)",
};
type SortKey = "default" | "salary_desc" | "salary_asc" | "age_asc";

/* ══════════════════════════════════════════════════════════════ */
export default function PublicWorkersPage() {
  const [workers, setWorkers]       = useState<Worker[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filterNat, setFilterNat]   = useState("");
  const [filterExp, setFilterExp]   = useState("");
  const [filterRel, setFilterRel]   = useState("");
  const [filterMarital, setFilterMarital] = useState("");
  const [sortKey,   setSortKey]     = useState<SortKey>("default");
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected]     = useState<Worker | null>(null);
  const supabase = createClient();

  useEffect(() => { load(); }, []);
  useEffect(() => {
    document.body.style.overflow = selected ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selected]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.rpc("get_available_workers");
    setWorkers(data ?? []);
    setLoading(false);
  }

  /* active filter count for badge */
  const activeFilters = [filterNat, filterExp, filterRel, filterMarital].filter(Boolean).length;

  const filtered = useMemo(() => {
    let list = workers.filter((w) =>
      (!filterNat    || w.nationality        === filterNat)
      && (!filterExp || w.new_or_experienced === filterExp)
      && (!filterRel || w.religion           === filterRel)
      && (!filterMarital || w.marital_status === filterMarital)
    );
    if (sortKey === "salary_desc") list = [...list].sort((a, b) => b.salary - a.salary);
    if (sortKey === "salary_asc")  list = [...list].sort((a, b) => a.salary - b.salary);
    if (sortKey === "age_asc")     list = [...list].sort((a, b) => a.worker_age - b.worker_age);
    return list;
  }, [workers, filterNat, filterExp, filterRel, filterMarital, sortKey]);

  const natCounts = useMemo(() => {
    const c: Record<string, number> = {};
    workers.forEach((w) => { c[w.nationality] = (c[w.nationality] || 0) + 1; });
    return c;
  }, [workers]);

  const wa = useCallback(
    (text: string) => `https://wa.me/${COMPANY_INFO.whatsapp}?text=${encodeURIComponent(text)}`,
    []
  );

  function clearFilters() {
    setFilterNat(""); setFilterExp(""); setFilterRel(""); setFilterMarital(""); setSortKey("default");
  }

  /* ── render ── */
  return (
    <div className="min-h-screen font-cairo" style={{ background: "#F4F6FB" }} dir="rtl">

      {/* ════════════════════════════════════════ HEADER */}
      <header className="bg-white sticky top-0 z-40 border-b border-slate-100"
        style={{ boxShadow: "0 1px 24px rgba(15,28,77,0.09)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm shrink-0 bg-white border border-slate-100">
              <img src="/logo.png" alt="حنين الشرق" className="w-full h-full object-contain" />
            </div>
            <div className="hidden sm:block">
              <p className="font-bold text-sm leading-tight" style={{ color: "#0F1C4D" }}>
                حنين الشرق للاستقدام
              </p>
              <p className="text-slate-400 text-xs flex items-center gap-1">
                <MapPin size={10} /> الرياض، حي النهضة
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <a href={`tel:${COMPANY_INFO.phones[0]}`}
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-xl border-2 transition-colors"
              style={{ borderColor: "#0F1C4D", color: "#0F1C4D" }}>
              <Phone size={13} /> {COMPANY_INFO.phones[0]}
            </a>
            <a href={`https://wa.me/${COMPANY_INFO.whatsapp}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#22c55e,#15803d)" }}>
              <MessageCircle size={14} /> واتساب
            </a>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════ HERO */}
      <section className="relative overflow-hidden" style={{
        background: "linear-gradient(145deg,#0F1C4D 0%,#1B2B6B 55%,#1e3a8a 100%)",
        paddingBottom: 0,
      }}>
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(#fff 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
        {/* Glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 blur-[120px] pointer-events-none"
          style={{ background: "radial-gradient(circle,#818cf8,transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-10 blur-[100px] pointer-events-none"
          style={{ background: "radial-gradient(circle,#34d399,transparent 70%)" }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-24 text-white text-center">
          {/* Headline */}
          <h1 className="font-bold text-5xl sm:text-6xl leading-tight mb-4">
            اختر عاملتك المثالية
          </h1>
          <p className="text-lg text-blue-200 mb-10 max-w-xl mx-auto">
            تصفح سيرة ذاتية كاملة لكل عاملة · طلب فوري عبر واتساب
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { icon: <Users size={18}/>,   val: `${workers.length}+`,   sub: "عاملة جاهزة" },
              { icon: <Shield size={18}/>,   val: "سنتان",                sub: "ضمان شامل" },
              { icon: <Globe size={18}/>,    val: `${NATIONALITIES.filter(n => natCounts[n.value]).length}`, sub: "جنسيات متاحة" },
              { icon: <CheckCircle2 size={18} className="text-emerald-400"/>, val: "100%", sub: "فحص طبي" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/10 border border-white/15 backdrop-blur-sm px-6 py-3 rounded-2xl">
                <div className="text-indigo-300">{s.icon}</div>
                <div className="text-right">
                  <p className="font-bold text-xl leading-none">{s.val}</p>
                  <p className="text-blue-200 text-xs mt-0.5">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wave */}
        <div className="h-14" style={{ background: "#F4F6FB", clipPath: "ellipse(65% 100% at 50% 100%)" }} />
      </section>

      {/* ════════════════════════════════════════ FILTER BAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          {/* Row 1: nationality pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 border-b border-slate-100"
            style={{ scrollbarWidth: "none" }}>
            {[{ value: "", label: "🌍 جميع الجنسيات", count: workers.length },
              ...NATIONALITIES.filter(n => natCounts[n.value]).map(n => ({
                value: n.value,
                label: `${FLAG[n.value]} ${n.label}`,
                count: natCounts[n.value],
              }))
            ].map((p) => (
              <button key={p.value}
                onClick={() => setFilterNat(filterNat === p.value ? "" : p.value)}
                className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                style={filterNat === p.value
                  ? { background: "#0F1C4D", color: "#fff", boxShadow: "0 4px 12px rgba(15,28,77,0.3)" }
                  : { background: "#F4F6FB", color: "#475569", border: "1.5px solid #E2E8F0" }
                }>
                {p.label}
                <span className="text-xs px-1.5 py-0.5 rounded-full"
                  style={filterNat === p.value
                    ? { background: "rgba(255,255,255,0.2)", color: "#fff" }
                    : { background: "#E2E8F0", color: "#64748B" }}>
                  {p.count}
                </span>
              </button>
            ))}
          </div>

          {/* Row 2: quick filters + sort */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            {/* Experience */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-bold">الخبرة:</span>
              {[{ v: "", l: "الكل" }, { v: "new", l: "🌱 جديدة" }, { v: "experienced", l: "⭐ خبرة" }].map(o => (
                <button key={o.v} onClick={() => setFilterExp(o.v)}
                  className="text-xs px-3 py-1.5 rounded-lg font-bold transition-all"
                  style={filterExp === o.v
                    ? { background: "#0F1C4D", color: "#fff" }
                    : { background: "#F4F6FB", color: "#64748B", border: "1.5px solid #E2E8F0" }}>
                  {o.l}
                </button>
              ))}
            </div>

            {/* Religion */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-bold">الديانة:</span>
              {[{ v: "", l: "الكل" }, { v: "muslim", l: "☪️ مسلمة" }, { v: "christian", l: "✝️ مسيحية" }].map(o => (
                <button key={o.v} onClick={() => setFilterRel(o.v)}
                  className="text-xs px-3 py-1.5 rounded-lg font-bold transition-all"
                  style={filterRel === o.v
                    ? { background: "#0F1C4D", color: "#fff" }
                    : { background: "#F4F6FB", color: "#64748B", border: "1.5px solid #E2E8F0" }}>
                  {o.l}
                </button>
              ))}
            </div>

            {/* Marital status */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-bold">الحالة:</span>
              {[{ v: "", l: "الكل" }, { v: "single", l: "💍 عزباء" }, { v: "married", l: "👪 متزوجة" }].map(o => (
                <button key={o.v} onClick={() => setFilterMarital(o.v)}
                  className="text-xs px-3 py-1.5 rounded-lg font-bold transition-all"
                  style={filterMarital === o.v
                    ? { background: "#0F1C4D", color: "#fff" }
                    : { background: "#F4F6FB", color: "#64748B", border: "1.5px solid #E2E8F0" }}>
                  {o.l}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="mr-auto flex items-center gap-2">
              {activeFilters > 0 && (
                <button onClick={clearFilters}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 transition-colors">
                  <X size={12}/> مسح الفلاتر ({activeFilters})
                </button>
              )}
              <div className="relative">
                <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="appearance-none text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-8 outline-none cursor-pointer"
                  style={{ color: "#0F1C4D" }}>
                  <option value="default">ترتيب افتراضي</option>
                  <option value="salary_desc">الراتب: الأعلى أولاً</option>
                  <option value="salary_asc">الراتب: الأقل أولاً</option>
                  <option value="age_asc">العمر: الأصغر أولاً</option>
                </select>
                <ArrowUpDown size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <span className="text-xs text-slate-400 font-bold whitespace-nowrap">
                {filtered.length} عاملة
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════ GRID */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-28">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl overflow-hidden animate-pulse shadow-sm">
                <div className="h-60 bg-slate-100" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
                  <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
                  <div className="flex gap-2">
                    <div className="h-6 bg-slate-100 rounded-full w-16" />
                    <div className="h-6 bg-slate-100 rounded-full w-16" />
                  </div>
                  <div className="h-10 bg-slate-100 rounded-xl" />
                  <div className="h-10 bg-slate-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-28 text-center">
            <div className="w-24 h-24 bg-white rounded-3xl shadow flex items-center justify-center mb-5">
              <Search size={36} className="text-slate-300" />
            </div>
            <p className="text-slate-700 font-bold text-2xl mb-2">لا توجد نتائج</p>
            <p className="text-slate-400 mb-6 text-sm">جرّب تغيير معايير البحث أو تواصل معنا مباشرة</p>
            <button onClick={clearFilters}
              className="flex items-center gap-2 font-bold text-sm px-5 py-3 rounded-xl text-white mb-3"
              style={{ background: "#0F1C4D" }}>
              <X size={14}/> مسح جميع الفلاتر
            </button>
            <a href={wa("السلام عليكم، أرغب في الاستفسار عن عاملة منزلية")}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 font-bold text-sm px-5 py-3 rounded-xl text-white"
              style={{ background: "linear-gradient(135deg,#22c55e,#15803d)" }}>
              <MessageCircle size={14}/> تواصل معنا عبر واتساب
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtered.map((w) => (
              <WorkerCard
                key={w.passport_number}
                worker={w}
                wa={wa}
                onOpen={() => setSelected(w)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ════════════════════════════════════════ FOOTER */}
      <footer className="bg-white border-t border-slate-100 py-12 px-4 text-center">
        <div className="max-w-xl mx-auto">
          <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl shadow-md flex items-center justify-center mx-auto mb-4">
            <img src="/logo.png" alt="" className="w-14 h-14 object-contain" />
          </div>
          <p className="font-bold text-lg mb-0.5" style={{ color: "#0F1C4D" }}>{COMPANY_INFO.nameAr}</p>
          <p className="text-slate-400 text-sm mb-5 flex items-center justify-center gap-1">
            <MapPin size={12} /> {COMPANY_INFO.location}
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-4">
            {COMPANY_INFO.staff.map((s) => (
              <a key={s.whatsapp}
                href={`https://wa.me/${s.whatsapp}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#22c55e,#15803d)" }}>
                <MessageCircle size={12} /> {s.name}
              </a>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-4 mb-3">
            {COMPANY_INFO.phones.map((p) => (
              <a key={p} href={`tel:${p}`}
                className="text-slate-500 hover:text-slate-800 text-sm flex items-center gap-1 transition-colors">
                <Phone size={12} /> {p}
              </a>
            ))}
          </div>
          <p className="text-slate-300 text-xs">{COMPANY_INFO.workingHours}</p>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <a href={wa("السلام عليكم، أرغب في الاستفسار عن عاملة منزلية متاحة")}
        target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95"
        style={{ background: "linear-gradient(135deg,#22c55e,#15803d)", boxShadow: "0 8px 28px rgba(34,197,94,0.5)" }}>
        <MessageCircle size={26} className="text-white" />
      </a>

      {/* CV Modal */}
      {selected && <CVModal worker={selected} wa={wa} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/* WORKER CARD                                                    */
/* ══════════════════════════════════════════════════════════════ */
function WorkerCard({ worker: w, wa, onOpen }: {
  worker: Worker; wa: (t: string) => string; onOpen: () => void;
}) {
  const natLabel  = NATIONALITIES.find(n => n.value === w.nationality)?.label ?? w.nationality;
  const profLabel = PROFESSIONS.find(p => p.value === w.profession)?.label ?? w.profession;
  const accent    = NAT_ACCENT[w.nationality]  ?? { bg: "#EEF2FF", text: "#3730A3", border: "#A5B4FC" };
  const grad      = NAT_GRAD[w.nationality]    ?? "linear-gradient(160deg,#1B2B6B,#0f1a40)";
  const flag      = FLAG[w.nationality] ?? "🌍";
  const waText    = `السلام عليكم، أرغب في الاستفسار عن العاملة: ${w.worker_name} — ${natLabel}`;

  return (
    <article
      className="group bg-white rounded-3xl overflow-hidden flex flex-col cursor-pointer transition-all duration-300 hover:-translate-y-2"
      style={{ boxShadow: "0 2px 16px rgba(15,28,77,0.08)" }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 16px 48px rgba(15,28,77,0.18)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 2px 16px rgba(15,28,77,0.08)")}
      onClick={onOpen}
      role="button" tabIndex={0}
      onKeyDown={e => e.key === "Enter" && onOpen()}
    >
      {/* ── Photo (profile photo preferred for card, fallback to full photo) ── */}
      <div className="relative overflow-hidden" style={{ paddingBottom: "130%", background: grad }}>
        {(w.profile_photo || w.photo_url) ? (
          <Image src={(w.profile_photo || w.photo_url)!} alt={w.worker_name} fill
            className="object-cover object-top group-hover:scale-105 transition-transform duration-700"
            sizes="(max-width:640px)50vw,(max-width:1024px)33vw,25vw" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <span className="text-7xl">{flag}</span>
            <span className="text-white/80 font-bold text-sm">{natLabel}</span>
          </div>
        )}

        {/* Bottom gradient */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to top,rgba(0,0,0,0.82) 0%,rgba(0,0,0,0.18) 50%,transparent 72%)" }} />

        {/* Hover CTA overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
          style={{ background: "rgba(15,28,77,0.55)" }}>
          <span className="bg-white font-bold text-sm px-5 py-2.5 rounded-full shadow-xl"
            style={{ color: "#0F1C4D" }}>
            عرض السيرة الذاتية ←
          </span>
        </div>

        {/* Top-right: availability */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 rounded-xl shadow-sm text-xs font-bold text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          متاح الآن
        </div>

        {/* Top-left: experience */}
        <div className="absolute top-3 left-3 text-xs font-bold text-white px-2.5 py-1.5 rounded-xl shadow-sm"
          style={{ background: w.new_or_experienced === "experienced" ? "#0891b2" : "#7c3aed" }}>
          {w.new_or_experienced === "experienced" ? "⭐ خبرة" : "🌱 جديدة"}
        </div>

        {/* Bottom overlay: name + salary */}
        <div className="absolute bottom-0 inset-x-0 p-3.5">
          <p className="text-white font-bold text-base leading-tight truncate mb-2">{w.worker_name}</p>
          <div className="flex items-center gap-2">
            <span className="text-white/80 text-xs">{flag} {natLabel}</span>
            <span className="mr-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold text-white"
              style={{ background: "rgba(245,158,11,0.85)", fontSize: 11 }}>
              {w.salary.toLocaleString("en-US")} ر.س
            </span>
          </div>
        </div>
      </div>

      {/* ── Info strip ── */}
      <div className="p-3.5 flex flex-col gap-2.5">
        {/* Chips */}
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: accent.bg, color: accent.text, border: `1px solid ${accent.border}` }}>
            {flag} {natLabel}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            <Clock size={10} /> {w.worker_age} سنة
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            <Heart size={10} /> {RELIGION_LABELS[w.religion] ?? w.religion}
          </span>
        </div>

        {/* Profession */}
        <p className="text-slate-500 text-xs">{profLabel}
          {w.marital_status ? ` · ${MARITAL_LABELS[w.marital_status] ?? ""}` : ""}
        </p>

        {/* Passport reference */}
        <p className="text-slate-400 text-xs font-mono">رقم الجواز: {w.passport_number}</p>

        {/* Divider */}
        <div className="border-t border-slate-100" />

        {/* Buttons */}
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={onOpen}
            className="flex-1 text-xs font-bold py-2.5 rounded-xl border-2 transition-colors hover:bg-slate-50"
            style={{ borderColor: "#0F1C4D", color: "#0F1C4D" }}>
            عرض السيرة
          </button>
          {w.video_url && (
            <a href={w.video_url} target="_blank" rel="noopener noreferrer"
              className="flex-1 text-xs font-bold py-2.5 rounded-xl text-white text-center transition-all hover:opacity-90 flex items-center justify-center gap-1"
              style={{ background: "linear-gradient(135deg,#f43f5e,#be123c)" }}>
              <Play size={10} fill="white" />
              فيديو
            </a>
          )}
          <a href={wa(`السلام عليكم، أرغب في الاستفسار عن العاملة: ${w.worker_name} — ${natLabel} — الراتب: ${w.salary.toLocaleString("en-US")} ر.س — رقم الجواز: ${w.passport_number}`)}
            target="_blank" rel="noopener noreferrer"
            className="flex-1 text-xs font-bold py-2.5 rounded-xl text-white text-center transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#0F1C4D,#1B2B6B)" }}>
            طلب الآن
          </a>
        </div>
      </div>
    </article>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/* FULL CV MODAL                                                  */
/* ══════════════════════════════════════════════════════════════ */
function CVModal({ worker: w, wa, onClose }: {
  worker: Worker; wa: (t: string) => string; onClose: () => void;
}) {
  const natLabel  = NATIONALITIES.find(n => n.value === w.nationality)?.label ?? w.nationality;
  const profLabel = PROFESSIONS.find(p => p.value === w.profession)?.label ?? w.profession;
  const flag      = FLAG[w.nationality] ?? "🌍";
  const accent    = NAT_ACCENT[w.nationality] ?? { bg: "#EEF2FF", text: "#3730A3", border: "#A5B4FC" };
  const grad      = NAT_GRAD[w.nationality]   ?? "linear-gradient(160deg,#1B2B6B,#0f1a40)";

  const waFull = `السلام عليكم، أرغب في الاستفسار عن العاملة:\n• الاسم: ${w.worker_name}\n• الجنسية: ${natLabel}\n• الراتب: ${w.salary.toLocaleString("en-US")} ر.س\n• الخبرة: ${w.new_or_experienced === "experienced" ? "لديها خبرة" : "جديدة"}\n• الديانة: ${RELIGION_LABELS[w.religion] ?? w.religion}`;

  const [photoOpen, setPhotoOpen] = useState(false);
  const photoSrc = w.photo_url || w.profile_photo;

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (photoOpen) setPhotoOpen(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose, photoOpen]);

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl"
      style={{ transform: "translateZ(0)" }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog — row layout on desktop: photo RIGHT, details LEFT */}
      <div
        className="relative bg-white w-full sm:max-w-3xl rounded-t-[2rem] sm:rounded-3xl overflow-hidden shadow-2xl max-h-[88vh] sm:h-[88vh] flex flex-col sm:flex-row"
        style={{ animation: "cvIn .35s cubic-bezier(.16,1,.3,1)" }}
      >
        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 left-4 z-30 w-9 h-9 rounded-full flex items-center justify-center text-white transition-colors hover:bg-black/30"
          style={{ background: "rgba(0,0,0,0.22)" }}>
          <X size={18} />
        </button>

        {/* ── RIGHT: Photo panel (first in RTL DOM = right side) ── */}
        <div
          className={`relative shrink-0 w-full sm:w-[42%] group/photo${photoSrc ? " cursor-pointer" : ""}`}
          style={{ background: grad }}
          onClick={() => photoSrc && setPhotoOpen(true)}
        >
          {/* Mobile: aspect-ratio spacer — 80% gives more photo height */}
          <div className="sm:hidden" style={{ paddingBottom: "80%" }} />
          {/* Full-body photo fills entire panel */}
          <div className="absolute inset-0">
            {(w.photo_url || w.profile_photo) ? (
              <Image src={(w.photo_url || w.profile_photo)!} alt={w.worker_name} fill
                className="object-contain" sizes="(max-width:640px)100vw,380px" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[7rem]">{flag}</span>
              </div>
            )}
            {/* Profile photo thumbnail (top-right corner) if both photos exist */}
            {w.profile_photo && w.photo_url && (
              <div className="absolute top-4 right-4 w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-lg">
                <Image src={w.profile_photo} alt="" fill className="object-cover object-top" sizes="64px" />
              </div>
            )}

            {/* Zoom hint overlay — visible on hover when image exists */}
            {photoSrc && (
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-all duration-300 pointer-events-none"
                style={{ background: "rgba(0,0,0,0.28)" }}
              >
                <div className="bg-white/15 backdrop-blur-md border border-white/25 text-white font-bold px-5 py-2.5 rounded-full flex items-center gap-2 shadow-xl text-sm">
                  <ZoomIn size={15} /> تكبير الصورة
                </div>
              </div>
            )}

            {/* Bottom gradient */}
            <div className="absolute bottom-0 inset-x-0 h-44 pointer-events-none"
              style={{ background: "linear-gradient(to top,rgba(0,0,0,0.82),transparent)" }} />

            {/* Name + badges at bottom */}
            <div className="absolute bottom-4 inset-x-4">
              <p className="text-white font-bold text-xl leading-tight drop-shadow">{w.worker_name}</p>
              <p className="text-white/70 text-xs mt-0.5 mb-3">{profLabel}</p>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 bg-emerald-500/90 text-white text-xs font-bold px-2.5 py-1.5 rounded-full shadow">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  متاحة الآن
                </div>
                <div className="text-xs font-bold text-white px-2.5 py-1.5 rounded-full shadow"
                  style={{ background: w.new_or_experienced === "experienced" ? "#0891b2" : "#7c3aed" }}>
                  {w.new_or_experienced === "experienced" ? "⭐ خبرة" : "🌱 جديدة"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── LEFT: Details panel ── */}
        <div className="flex-1 overflow-y-auto flex flex-col" style={{ background: "#F8F9FF" }}>

          {/* Quick info bar */}
          <div className="bg-white px-5 py-4 border-b border-slate-100 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: accent.bg, color: accent.text, border: `1px solid ${accent.border}` }}>
              {flag} {natLabel}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600">
              🎂 {w.worker_age} سنة
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600">
              {RELIGION_LABELS[w.religion] ?? w.religion}
            </span>
            {/* Salary — small chip */}
            <span className="mr-auto inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full text-white"
              style={{ background: "linear-gradient(135deg,#f59e0b,#b45309)" }}>
              💰 {w.salary.toLocaleString("en-US")} ر.س / شهر
            </span>
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center justify-around px-4 py-3 bg-emerald-50 border-b border-emerald-100 gap-2">
            {["🩺 فحص طبي", "📄 أوراق مكتملة", "🛡️ ضمان سنتان"].map(t => (
              <span key={t} className="text-emerald-700 text-xs font-bold">{t}</span>
            ))}
          </div>

          {/* Personal details */}
          <div className="px-5 pt-4 pb-2 space-y-2.5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">المعلومات الشخصية</p>
            {[
              { emoji: "🌍", label: "الجنسية",           val: `${flag} ${natLabel}` },
              { emoji: "💼", label: "المهنة",            val: profLabel },
              { emoji: "🎂", label: "العمر",             val: `${w.worker_age} سنة` },
              { emoji: "🕌", label: "الديانة",           val: RELIGION_LABELS[w.religion] ?? w.religion },
              { emoji: "💍", label: "الحالة الاجتماعية", val: MARITAL_LABELS[w.marital_status ?? ""] ?? "—" },
              ...(w.children_count ? [{ emoji: "👶", label: "الأطفال", val: `${w.children_count}` }] : []),
              { emoji: "⭐", label: "مستوى الخبرة",     val: w.new_or_experienced === "experienced" ? "لديها خبرة" : "جديدة" },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-slate-100">
                <span className="text-xl w-8 text-center shrink-0">{row.emoji}</span>
                <div>
                  <p className="text-xs text-slate-400 leading-none mb-0.5">{row.label}</p>
                  <p className="font-bold text-sm text-slate-800">{row.val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="p-5 space-y-3 mt-auto">
            {/* Video CTA — top priority when available */}
            {w.video_url && (
              <a href={w.video_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-base text-white transition-all hover:opacity-90 active:scale-[.98]"
                style={{
                  background: "linear-gradient(135deg,#f43f5e,#be123c)",
                  boxShadow: "0 8px 28px rgba(244,63,94,0.50)",
                  position: "relative",
                  overflow: "hidden",
                }}>
                {/* animated shine sweep */}
                <span className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.18) 50%,transparent 60%)",
                    animation: "shine 2.8s linear infinite",
                  }} />
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 shrink-0">
                  <Play size={16} fill="white" />
                </span>
                <span className="flex flex-col text-right">
                  <span className="text-sm leading-tight">شاهد المقابلة الكاملة</span>
                  <span className="text-white/70 text-xs font-normal leading-tight">مقابلة حقيقية مع العاملة</span>
                </span>
                <span className="mr-auto text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full shrink-0">▶ HD</span>
              </a>
            )}

            <a href={wa(waFull)} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl text-white font-bold text-base transition-all hover:opacity-90 active:scale-[.98]"
              style={{ background: "linear-gradient(135deg,#22c55e,#15803d)", boxShadow: "0 8px 24px rgba(34,197,94,0.45)" }}>
              <MessageCircle size={20} /> استفسار فوري عبر واتساب
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cvIn {
          from { opacity:0; transform:translateY(40px) scale(.96); }
          to   { opacity:1; transform:translateY(0)    scale(1); }
        }
        @keyframes shine {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>

    {/* Full-screen photo viewer */}
    {photoOpen && photoSrc && (
      <PhotoViewer src={photoSrc} worker={w} onClose={() => setPhotoOpen(false)} />
    )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/* FULL-SCREEN PHOTO VIEWER                                       */
/* ══════════════════════════════════════════════════════════════ */
function PhotoViewer({ src, worker: w, onClose }: {
  src: string; worker: Worker; onClose: () => void;
}) {
  const [showUI, setShowUI] = useState(true);
  const [scale, setScale]   = useState(1);
  const [dragY, setDragY]   = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const scaleRef     = useRef(1);
  const dragYRef     = useRef(0);
  const touchState   = useRef({ startY: 0, startDist: 0, startScale: 1, touches: 0 });

  const natLabel = NATIONALITIES.find(n => n.value === w.nationality)?.label ?? w.nationality;
  const flag     = FLAG[w.nationality] ?? "🌍";

  /* keep refs in sync with state (for imperative handlers) */
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { dragYRef.current = dragY; }, [dragY]);

  /* escape key */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  /* touch handlers — imperative so touchmove can use passive:false */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function dist(t: TouchList) {
      return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    }

    function onStart(e: TouchEvent) {
      const ts = touchState.current;
      ts.touches = e.touches.length;
      if (e.touches.length === 1) {
        ts.startY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        ts.startDist  = dist(e.touches);
        ts.startScale = scaleRef.current;
      }
    }

    function onMove(e: TouchEvent) {
      e.preventDefault();
      const ts = touchState.current;
      if (ts.touches === 1 && scaleRef.current <= 1) {
        const dy = e.touches[0].clientY - ts.startY;
        if (dy > 0) { dragYRef.current = dy; setDragY(dy); }
      } else if (ts.touches === 2 && e.touches.length === 2) {
        const ratio    = dist(e.touches) / ts.startDist;
        const newScale = Math.min(4, Math.max(1, ts.startScale * ratio));
        scaleRef.current = newScale;
        setScale(newScale);
      }
    }

    function onEnd() {
      const ts = touchState.current;
      if (ts.touches === 1 && dragYRef.current > 120) {
        onClose();
      } else {
        dragYRef.current = 0;
        setDragY(0);
      }
      ts.touches = 0;
    }

    el.addEventListener("touchstart", onStart,  { passive: true });
    el.addEventListener("touchmove",  onMove,   { passive: false });
    el.addEventListener("touchend",   onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove",  onMove);
      el.removeEventListener("touchend",   onEnd);
    };
  }, [onClose]);

  const bgOpacity  = Math.max(0.15, 0.88 - dragY / 350);
  const imgOpacity = dragY > 150 ? Math.max(0.2, 1 - (dragY - 150) / 200) : 1;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        background: `rgba(0,0,0,${bgOpacity})`,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        animation: "pvIn .3s cubic-bezier(.16,1,.3,1)",
      } as React.CSSProperties}
      onClick={() => setShowUI(v => !v)}
    >
      {/* ── Close button ── */}
      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        className="absolute top-5 right-5 z-20 w-11 h-11 rounded-full flex items-center justify-center text-white transition-opacity duration-300"
        style={{
          background: "rgba(255,255,255,0.18)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.28)",
          opacity: showUI ? 1 : 0,
          pointerEvents: showUI ? "auto" : "none",
        }}
      >
        <X size={20} />
      </button>

      {/* ── Swipe hint ── */}
      {showUI && scale <= 1 && dragY < 10 && (
        <p className="absolute top-6 left-1/2 -translate-x-1/2 text-white/40 text-xs pointer-events-none select-none">
          اسحب للأسفل للإغلاق
        </p>
      )}

      {/* ── Image container ── */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center"
        style={{ touchAction: "none" }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            transform: `translateY(${dragY}px) scale(${scale})`,
            transition: dragY > 0 ? "none" : "transform .25s ease",
            willChange: "transform",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={w.worker_name}
            draggable={false}
            style={{
              maxHeight: "88vh",
              maxWidth: "96vw",
              objectFit: "contain",
              borderRadius: 14,
              display: "block",
              userSelect: "none",
              boxShadow: "0 24px 72px rgba(0,0,0,0.55)",
              opacity: imgOpacity,
              transition: dragY > 0 ? "none" : "opacity .25s ease",
            }}
          />
        </div>
      </div>

      {/* ── Bottom info strip ── */}
      <div
        className="absolute bottom-0 inset-x-0 pointer-events-none"
        style={{
          background: "linear-gradient(to top,rgba(0,0,0,0.82) 0%,transparent 100%)",
          padding: "52px 24px 32px",
          opacity: showUI && dragY < 80 ? 1 : 0,
          transform: showUI && dragY < 80 ? "translateY(0)" : "translateY(20px)",
          transition: "opacity .3s ease, transform .3s ease",
        }}
        dir="rtl"
      >
        <p className="text-white font-bold text-xl leading-tight mb-2">{w.worker_name}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-white/70 text-sm">{flag} {natLabel}</span>
          <span className="text-white/40 text-sm">·</span>
          <span className="text-white/70 text-sm">{w.worker_age} سنة</span>
          <span
            className="mr-auto font-bold text-sm px-3 py-1 rounded-full"
            style={{ background: "rgba(245,158,11,0.75)", color: "#fff" }}
          >
            {w.salary.toLocaleString("en-US")} ر.س / شهر
          </span>
        </div>
      </div>

      <style>{`
        @keyframes pvIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
