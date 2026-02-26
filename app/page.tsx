"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("بيانات الدخول غير صحيحة");
      setLoading(false);
      return;
    }

    // Get user role
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (!profile) {
      setError("لم يتم العثور على صلاحيات المستخدم");
      setLoading(false);
      return;
    }

    // Route based on role
    switch (profile.role) {
      case "admin":
        router.push("/dashboard");
        break;
      case "data_entry":
        router.push("/orders");
        break;
      case "check_user":
        router.push("/check");
        break;
      case "driver":
        router.push("/schedule");
        break;
      case "owner":
        router.push("/reports/owner");
        break;
      default:
        router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-500 to-navy-700 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-32 h-32 mx-auto mb-4 bg-white rounded-full flex items-center justify-center shadow-lg">
            <img
              src="/logo.png"
              alt="حنين الشرق"
              className="w-24 h-24 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            حنين الشرق للاستقدام
          </h1>
          <p className="text-navy-200 text-sm">Haneen Al Sharq Recruitment</p>
        </div>

        {/* Login Form */}
        <div className="card">
          <h2 className="text-xl font-bold text-navy-500 text-center mb-6">
            تسجيل الدخول
          </h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm mb-2 text-gray-700">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="أدخل البريد الإلكتروني"
                className="w-full"
                required
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                className="w-full"
                required
                dir="ltr"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-center flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "دخول"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-navy-200 text-xs mt-6">
          نظام إدارة مكتب حنين الشرق للاستقدام &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
