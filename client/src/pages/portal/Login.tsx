import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { usePortalAuthStore, type PortalUser } from "@/lib/portalAuth";
import { useSiteConfig } from "@/lib/siteConfig";
import { Code2, Mail, Lock } from "lucide-react";

export default function PortalLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { setAuth } = usePortalAuthStore();
  const siteConfig = useSiteConfig();
  const siteName = siteConfig.logo_text || "Creative Code";
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = (await apiRequest("POST", "/api/portal/login", form)) as { token: string; clientUser: PortalUser };
      setAuth(res.clientUser, res.token);
      navigate("/portal");
    } catch (err: unknown) {
      toast({ title: (err as Error).message || "بيانات الدخول غير صحيحة", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            {siteConfig.logo_url ? (
              <img src={siteConfig.logo_url} alt={siteName} className="h-10 w-auto object-contain max-w-[160px]" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <Code2 className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="font-bold text-xl">{siteName}</span>
              </div>
            )}
          </div>
          <h2 className="text-3xl font-bold">بوابة العملاء</h2>
          <p className="text-muted-foreground">تابع تفاصيل مشروعك خطوة بخطوة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="email"
                type="email"
                data-testid="input-portal-login-email"
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
                data-testid="input-portal-login-password"
                placeholder="أدخل كلمة المرور"
                className="pr-10"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={loading} data-testid="button-portal-login-submit">
            {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
          </Button>
        </form>
      </div>
    </div>
  );
}
