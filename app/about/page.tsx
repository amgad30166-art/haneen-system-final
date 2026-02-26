"use client";

import Link from "next/link";
import {
  Phone, Mail, MapPin, Clock, MessageCircle,
  Globe, Star, Shield, Users, Award, ArrowLeft,
} from "lucide-react";
import { COMPANY_INFO } from "@/lib/constants";

export default function AboutPage() {
  return (
    <div
      className="min-h-screen bg-gray-50 font-cairo"
      dir="rtl"
      style={{ fontFamily: "'Cairo', Arial, sans-serif" }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="bg-[#1B2B6B] sticky top-0 z-40 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <img src="/logo.png" alt="" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-tight">حنين الشرق للاستقدام</h1>
              <p className="text-blue-200 text-xs">Haneen Al Sharq Recruitment</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/workers"
              className="hidden sm:flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
            >
              <Users size={14} />
              العاملات المتاحة
            </Link>
            <a
              href={`https://wa.me/${COMPANY_INFO.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
            >
              <MessageCircle size={14} />
              واتساب
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-[#1B2B6B] to-[#0F1D4A] text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <img src="/logo.png" alt="حنين الشرق" className="w-20 h-20 object-contain" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">{COMPANY_INFO.nameAr}</h2>
          <p className="text-blue-200 text-lg mb-2">{COMPANY_INFO.nameEn}</p>
          <p className="text-blue-300 flex items-center justify-center gap-2 mt-4 text-sm">
            <MapPin size={16} />
            {COMPANY_INFO.location}
          </p>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h3 className="text-center text-2xl font-bold text-[#1B2B6B] mb-8">لماذا حنين الشرق؟</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: <Star size={28} className="text-yellow-500" />,
              title: "خبرة وكفاءة",
              desc: "سنوات من الخبرة في استقدام العمالة المنزلية المدربة والمؤهلة",
            },
            {
              icon: <Shield size={28} className="text-emerald-600" />,
              title: "ضمان الجودة",
              desc: "جميع العاملات لائقات طبياً ومكتملات الأوراق الرسمية",
            },
            {
              icon: <Users size={28} className="text-[#1B2B6B]" />,
              title: "تنوع الجنسيات",
              desc: "إثيوبيا، كينيا، أوغندا، الفلبين، الهند — لتناسب كل الاحتياجات",
            },
            {
              icon: <Award size={28} className="text-purple-600" />,
              title: "متابعة مستمرة",
              desc: "تتبع مراحل طلبك خطوة بخطوة عبر رابط خاص بك",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center"
            >
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                {f.icon}
              </div>
              <h4 className="font-bold text-[#1B2B6B] mb-2">{f.title}</h4>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Contact ─────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-12">
        <h3 className="text-center text-2xl font-bold text-[#1B2B6B] mb-8">تواصل معنا</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Info */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
            {/* Working hours */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[#EBF0FF] rounded-xl flex items-center justify-center shrink-0">
                <Clock size={20} className="text-[#1B2B6B]" />
              </div>
              <div>
                <p className="font-bold text-[#1B2B6B] mb-1">ساعات العمل</p>
                <p className="text-gray-600 text-sm leading-relaxed">{COMPANY_INFO.workingHours}</p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[#EBF0FF] rounded-xl flex items-center justify-center shrink-0">
                <MapPin size={20} className="text-[#1B2B6B]" />
              </div>
              <div>
                <p className="font-bold text-[#1B2B6B] mb-1">العنوان</p>
                <p className="text-gray-600 text-sm">{COMPANY_INFO.location}</p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[#EBF0FF] rounded-xl flex items-center justify-center shrink-0">
                <Mail size={20} className="text-[#1B2B6B]" />
              </div>
              <div>
                <p className="font-bold text-[#1B2B6B] mb-1">البريد الإلكتروني</p>
                <a
                  href={`mailto:${COMPANY_INFO.email}`}
                  className="text-[#1B2B6B] text-sm hover:underline"
                >
                  {COMPANY_INFO.email}
                </a>
              </div>
            </div>

            {/* Website */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[#EBF0FF] rounded-xl flex items-center justify-center shrink-0">
                <Globe size={20} className="text-[#1B2B6B]" />
              </div>
              <div>
                <p className="font-bold text-[#1B2B6B] mb-1">الموقع الإلكتروني</p>
                <a
                  href={COMPANY_INFO.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1B2B6B] text-sm hover:underline"
                >
                  {COMPANY_INFO.website}
                </a>
              </div>
            </div>
          </div>

          {/* Phones */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-[#EBF0FF] rounded-xl flex items-center justify-center shrink-0">
                <Phone size={20} className="text-[#1B2B6B]" />
              </div>
              <p className="font-bold text-[#1B2B6B]">أرقام التواصل</p>
            </div>
            <div className="space-y-3">
              {COMPANY_INFO.phones.map((phone, i) => (
                <a
                  key={phone}
                  href={`tel:${phone}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-[#1B2B6B] hover:bg-[#EBF0FF] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#1B2B6B] rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {i + 1}
                    </div>
                    <span className="font-bold text-gray-800 group-hover:text-[#1B2B6B]">
                      {phone}
                    </span>
                  </div>
                  <Phone size={14} className="text-gray-300 group-hover:text-[#1B2B6B]" />
                </a>
              ))}
            </div>

            {/* WhatsApp button */}
            <a
              href={`https://wa.me/${COMPANY_INFO.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 w-full flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold transition-colors"
            >
              <MessageCircle size={20} />
              تواصل عبر واتساب
            </a>
          </div>
        </div>
      </section>

      {/* ── CTA Section ─────────────────────────────────────────── */}
      <section className="bg-[#1B2B6B] py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-2xl font-bold text-white mb-3">
            هل أنت مستعد للاستقدام؟
          </h3>
          <p className="text-blue-200 mb-8 text-sm sm:text-base">
            تصفح العاملات المتاحة الآن أو تواصل معنا مباشرة للحصول على أفضل الخيارات
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/workers"
              className="flex items-center justify-center gap-2 bg-white text-[#1B2B6B] px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors"
            >
              <Users size={18} />
              تصفح العاملات المتاحة
              <ArrowLeft size={16} />
            </Link>
            <a
              href={`https://wa.me/${COMPANY_INFO.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold transition-colors"
            >
              <MessageCircle size={18} />
              استفسر الآن
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="bg-[#0F1D4A] py-6 px-4 text-center">
        <p className="text-blue-300 text-sm">
          © {new Date().getFullYear()} {COMPANY_INFO.nameAr} — جميع الحقوق محفوظة
        </p>
      </footer>
    </div>
  );
}
