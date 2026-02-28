import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  TrendingUp, Users, Target, BarChart3, CheckCircle,
  ArrowRight, Star, Zap, Shield, Globe, Phone, Mail, Building
} from "lucide-react";

export default function Landing() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", companyName: "", phone: "", email: "",
    serviceType: "", budget: "", message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.email || !form.serviceType) {
      toast({ title: "يرجى ملء الحقول المطلوبة", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const utm = new URLSearchParams(window.location.search).get("utm_source");
      await apiRequest("POST", "/api/leads/public", { ...form, source: utm || "direct" });
      if (typeof window !== "undefined" && (window as any).fbq) {
        (window as any).fbq("track", "Lead");
      }
      toast({ title: "تم إرسال طلبك بنجاح!", description: "سيتواصل معك فريقنا قريباً" });
      setForm({ name: "", companyName: "", phone: "", email: "", serviceType: "", budget: "", message: "" });
    } catch {
      toast({ title: "حدث خطأ، يرجى المحاولة مرة أخرى", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">NexaCRM</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#services" className="hover-elevate rounded-md px-2 py-1 transition-colors">خدماتنا</a>
            <a href="#projects" className="hover-elevate rounded-md px-2 py-1 transition-colors">مشاريعنا</a>
            <a href="#contact" className="hover-elevate rounded-md px-2 py-1 transition-colors">تواصل معنا</a>
          </div>
          <Link href="/login">
            <Button size="sm" data-testid="button-login-nav">تسجيل الدخول</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
              <Zap className="w-4 h-4" />
              <span>نظام CRM الأكثر تطوراً في المنطقة</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
              حوّل عملاءك المحتملين إلى{" "}
              <span className="text-primary">صفقات ناجحة</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              منصة متكاملة لإدارة علاقات العملاء، تتبع المبيعات، وزيادة الإيرادات بكفاءة عالية
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#contact">
                <Button size="lg" data-testid="button-hero-cta" className="gap-2">
                  ابدأ الآن مجاناً
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </a>
              <a href="#services">
                <Button size="lg" variant="outline" data-testid="button-hero-services">
                  اعرف المزيد
                </Button>
              </a>
            </div>
            <div className="flex flex-wrap gap-8 pt-4">
              {[
                { value: "+500", label: "عميل راضٍ" },
                { value: "98%", label: "نسبة الرضا" },
                { value: "+5M", label: "صفقة منجزة" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:flex justify-center">
            <div className="relative w-full max-w-md">
              <div className="rounded-2xl border border-card-border bg-card p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">إجمالي المبيعات</span>
                  <span className="text-xs text-muted-foreground">هذا الشهر</span>
                </div>
                <div className="text-4xl font-bold text-primary">2.4M ر.س</div>
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>+24% عن الشهر الماضي</span>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { label: "عملاء جدد", value: "48", color: "bg-primary/10 text-primary" },
                    { label: "صفقات مغلقة", value: "32", color: "bg-green-500/10 text-green-600" },
                    { label: "عروض مرسلة", value: "67", color: "bg-orange-500/10 text-orange-600" },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-lg p-3 ${item.color}`}>
                      <div className="text-xl font-bold">{item.value}</div>
                      <div className="text-xs mt-1 opacity-80">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 rounded-xl border border-card-border bg-card p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">صفقة جديدة!</div>
                    <div className="text-xs text-muted-foreground">150,000 ر.س تم إغلاقها</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">خدماتنا</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              نقدم حلولاً شاملة لتطوير أعمالك وزيادة مبيعاتك
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Target, title: "إدارة العملاء المحتملين", desc: "تتبع وتأهيل العملاء المحتملين بشكل منظم وفعّال", color: "text-primary bg-primary/10" },
              { icon: BarChart3, title: "تحليلات المبيعات", desc: "تقارير تفصيلية وبيانات دقيقة لاتخاذ قرارات أفضل", color: "text-green-600 bg-green-500/10" },
              { icon: Users, title: "إدارة فريق المبيعات", desc: "تتبع أداء فريقك وتوزيع المهام بكفاءة", color: "text-orange-600 bg-orange-500/10" },
              { icon: Shield, title: "أمان البيانات", desc: "حماية كاملة لبيانات عملائك وصفقاتك التجارية", color: "text-purple-600 bg-purple-500/10" },
              { icon: Globe, title: "التكامل متعدد القنوات", desc: "تكامل مع وسائل التواصل الاجتماعي والمنصات الرقمية", color: "text-blue-600 bg-blue-500/10" },
              { icon: Zap, title: "الأتمتة الذكية", desc: "أتمتة المهام المتكررة لتوفير الوقت والجهد", color: "text-yellow-600 bg-yellow-500/10" },
            ].map((service) => (
              <div key={service.title} className="hover-elevate rounded-xl border border-card-border bg-card p-6 space-y-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${service.color}`}>
                  <service.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold">{service.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">مشاريعنا</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              نماذج من نجاحاتنا مع عملائنا
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { company: "شركة التقنية المتقدمة", sector: "تقنية المعلومات", result: "+180% زيادة في المبيعات", stars: 5 },
              { company: "مجموعة الخليج العقارية", sector: "العقارات", result: "350 صفقة في 6 أشهر", stars: 5 },
              { company: "شركة الفهد للاستيراد", sector: "التجارة", result: "توفير 40% من وقت الفريق", stars: 5 },
              { company: "مؤسسة النور الطبية", sector: "الرعاية الصحية", result: "+220% نمو في العملاء", stars: 5 },
              { company: "شركة الريادة للتعليم", sector: "التعليم", result: "1200 عميل جديد", stars: 5 },
              { company: "مجموعة الأصيل التجارية", sector: "التجزئة", result: "+95% نسبة الإغلاق", stars: 5 },
            ].map((project) => (
              <div key={project.company} className="hover-elevate rounded-xl border border-card-border bg-card p-6 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{project.company}</h3>
                    <span className="text-xs text-muted-foreground">{project.sector}</span>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: project.stars }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-sm font-medium text-primary">
                  {project.result}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto px-6 text-center text-primary-foreground space-y-6">
          <h2 className="text-4xl font-bold">جاهز لتنمية أعمالك؟</h2>
          <p className="text-xl opacity-90">
            انضم إلى أكثر من 500 شركة تستخدم NexaCRM لإدارة مبيعاتها بكفاءة
          </p>
          <a href="#contact">
            <Button size="lg" variant="secondary" data-testid="button-cta-banner" className="gap-2 mt-4">
              ابدأ التجربة المجانية
              <ArrowRight className="w-5 h-5" />
            </Button>
          </a>
        </div>
      </section>

      {/* Contact / Lead Form */}
      <section id="contact" className="py-24 bg-muted/30">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">تواصل معنا</h2>
            <p className="text-xl text-muted-foreground">
              أخبرنا عن احتياجاتك وسيتواصل معك خبراؤنا خلال 24 ساعة
            </p>
          </div>
          <form onSubmit={handleSubmit} className="rounded-2xl border border-card-border bg-card p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">الاسم الكامل *</Label>
                <Input
                  id="name"
                  data-testid="input-lead-name"
                  placeholder="أدخل اسمك الكامل"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">اسم الشركة</Label>
                <Input
                  id="companyName"
                  data-testid="input-lead-company"
                  placeholder="اسم شركتك"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف *</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    data-testid="input-lead-phone"
                    placeholder="05xxxxxxxx"
                    className="pr-10"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني *</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    data-testid="input-lead-email"
                    placeholder="example@company.com"
                    className="pr-10"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>نوع الخدمة *</Label>
                <Select value={form.serviceType} onValueChange={(v) => setForm({ ...form, serviceType: v })}>
                  <SelectTrigger data-testid="select-lead-service">
                    <SelectValue placeholder="اختر نوع الخدمة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crm">نظام CRM</SelectItem>
                    <SelectItem value="sales">استشارات مبيعات</SelectItem>
                    <SelectItem value="marketing">التسويق الرقمي</SelectItem>
                    <SelectItem value="training">التدريب والتطوير</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الميزانية المتوقعة</Label>
                <Select value={form.budget} onValueChange={(v) => setForm({ ...form, budget: v })}>
                  <SelectTrigger data-testid="select-lead-budget">
                    <SelectValue placeholder="حدد الميزانية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under-10k">أقل من 10,000 ر.س</SelectItem>
                    <SelectItem value="10k-50k">10,000 - 50,000 ر.س</SelectItem>
                    <SelectItem value="50k-100k">50,000 - 100,000 ر.س</SelectItem>
                    <SelectItem value="over-100k">أكثر من 100,000 ر.س</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">رسالتك</Label>
              <Textarea
                id="message"
                data-testid="textarea-lead-message"
                placeholder="أخبرنا عن مشروعك واحتياجاتك..."
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>
            <Button type="submit" size="lg" className="w-full gap-2" disabled={loading} data-testid="button-submit-lead">
              {loading ? "جاري الإرسال..." : "إرسال الطلب"}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </Button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold">NexaCRM</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 NexaCRM. جميع الحقوق محفوظة.
            </p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <a href="#services">الخدمات</a>
              <a href="#projects">المشاريع</a>
              <a href="#contact">التواصل</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
