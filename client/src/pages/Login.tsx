import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuthStore } from "@/lib/auth";
import { useSiteConfig } from "@/lib/siteConfig";
import { Code2, Mail, Lock } from "lucide-react";
import type { AuthUser } from "@/lib/auth";

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { setAuth } = useAuthStore();
  const siteConfig = useSiteConfig();
  const siteName = siteConfig.logo_text || "Creative Code";
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", form) as { token: string; user: AuthUser };
      setAuth(res.user, res.token);
      navigate(res.user.role === "admin" ? "/admin" : "/sales");
    } catch (err: unknown) {
      toast({ title: (err as Error).message || "بيانات الدخول غير صحيحة", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background flex">
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full bg-white/20 blur-3xl" />
        </div>
        <div className="relative z-10 flex items-center gap-3">
          {siteConfig.logo_url ? (
            <img src={siteConfig.logo_url} alt={siteName} className="h-10 w-auto object-contain max-w-[160px] brightness-0 invert" />
          ) : (
            <>
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-white font-bold text-xl">{siteName}</span>
            </>
          )}
        </div>
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            نحول أفكارك إلى واقع رقمي
          </h1>
          <p className="text-white/80 text-lg">
            فريق متخصص في تطوير التطبيقات، الذكاء الاصطناعي، وحلول الأعمال الرقمية
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "مشروع مكتمل", value: "+50" },
              { label: "عميل سعيد", value: "+30" },
              { label: "سنوات خبرة", value: "+5" },
              { label: "دولة", value: "10+" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-white/10 p-4">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-white/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-white/60 text-sm">
          © 2026 {siteName}. جميع الحقوق محفوظة.
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="flex lg:hidden justify-center mb-6">
              <div className="flex items-center gap-2">
                {siteConfig.logo_url ? (
                  <img src={siteConfig.logo_url} alt={siteName} className="h-9 w-auto object-contain max-w-[160px]" />
                ) : (
                  <>
                    <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                      <Code2 className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-xl">{siteName}</span>
                  </>
                )}
              </div>
            </div>
            <h2 className="text-3xl font-bold">مرحباً بعودتك</h2>
            <p className="text-muted-foreground">بوابة الوصول للوحة إدارة {siteName}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  data-testid="input-login-email"
                  placeholder="example@company.com"
                  className="pr-10"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  data-testid="input-login-password"
                  placeholder="أدخل كلمة المرور"
                  className="pr-10"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading}
              data-testid="button-login-submit"
            >
              {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
}
