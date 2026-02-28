import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSiteConfig } from "@/lib/siteConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { PageItem } from "@shared/schema";
import {
  Code2, Brain, Zap, Settings2, Cloud, Smartphone, Bot,
  UtensilsCrossed, GraduationCap, Truck, ShoppingCart, BarChart3,
  ArrowRight, Star, Phone, Mail, CheckCircle, Globe, Layers,
  Calendar, Clock, ChevronRight, ChevronLeft, X
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Code2, Brain, Zap, Settings2, Cloud, Smartphone, Bot,
  UtensilsCrossed, GraduationCap, Truck, ShoppingCart, BarChart3,
  Globe, Layers, Calendar, Star
};

const serviceColors: Record<string, string> = {
  Code2: "text-blue-600 bg-blue-500/10",
  Brain: "text-purple-600 bg-purple-500/10",
  Zap: "text-yellow-600 bg-yellow-500/10",
  Settings2: "text-green-600 bg-green-500/10",
  Cloud: "text-cyan-600 bg-cyan-500/10",
  Smartphone: "text-pink-600 bg-pink-500/10",
};

const SERVICE_TYPES = [
  { value: "website", label: "موقع ويب", icon: Globe, color: "text-blue-600 bg-blue-500/10 border-blue-200" },
  { value: "mobile", label: "تطبيق موبايل", icon: Smartphone, color: "text-pink-600 bg-pink-500/10 border-pink-200" },
  { value: "ai", label: "ذكاء اصطناعي", icon: Brain, color: "text-purple-600 bg-purple-500/10 border-purple-200" },
  { value: "system", label: "نظام إدارة", icon: Settings2, color: "text-green-600 bg-green-500/10 border-green-200" },
  { value: "automation", label: "أتمتة العمليات", icon: Zap, color: "text-yellow-600 bg-yellow-500/10 border-yellow-200" },
  { value: "consulting", label: "استشارة تقنية", icon: Code2, color: "text-cyan-600 bg-cyan-500/10 border-cyan-200" },
];

const TIME_SLOTS = [
  { group: "الصباح", times: ["9:00", "10:00", "11:00"] },
  { group: "الظهيرة", times: ["12:00", "13:00", "14:00"] },
  { group: "العصر", times: ["15:00", "16:00", "17:00"] },
];

function CustomCalendar({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const dayNames = ["أح","اث","ث","أر","خ","ج","س"];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 30);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const toStr = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const canPrev = new Date(year, month, 1) > new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonthDate = new Date(year, month + 1, 1);
  const canNext = nextMonthDate <= new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 1);

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} disabled={!canPrev} className="p-1 rounded-lg hover:bg-muted disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
        <span className="font-semibold text-sm">{monthNames[month]} {year}</span>
        <button onClick={nextMonth} disabled={!canNext} className="p-1 rounded-lg hover:bg-muted disabled:opacity-30">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = toStr(day);
          const cellDate = new Date(year, month, day);
          const isPast = cellDate < today;
          const isTooFar = cellDate > maxDate;
          const isDisabled = isPast || isTooFar;
          const isSelected = selected === dateStr;
          const isToday = cellDate.getTime() === today.getTime();
          return (
            <button
              key={i}
              disabled={isDisabled}
              onClick={() => onSelect(dateStr)}
              data-testid={`calendar-day-${dateStr}`}
              className={`
                h-9 w-full rounded-lg text-sm font-medium transition-all
                ${isSelected ? "bg-primary text-primary-foreground shadow-sm" : ""}
                ${isToday && !isSelected ? "border border-primary text-primary" : ""}
                ${!isSelected && !isDisabled ? "hover:bg-muted" : ""}
                ${isDisabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Landing() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", companyName: "",
    serviceType: "", consultationDate: "", consultationTime: "", message: ""
  });

  const config = useSiteConfig();
  const siteName = config.logo_text || "Creative Code";

  const { data: items = [] } = useQuery<PageItem[]>({
    queryKey: ["/api/content/items"],
  });

  const services = useMemo(() => items.filter((i) => i.itemType === "service"), [items]);
  const projects = useMemo(() => items.filter((i) => i.itemType === "project"), [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.email || !form.serviceType || !form.consultationDate || !form.consultationTime) {
      toast({ title: "يرجى تعبئة جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await apiRequest("POST", "/api/consultations/public", form);
      if (typeof window !== "undefined" && (window as any).fbq) {
        (window as any).fbq("track", "Schedule");
      }
      toast({ title: "تم حجز استشارتك بنجاح!", description: "سيتواصل معك فريقنا لتأكيد الموعد قريباً" });
      setForm({ name: "", phone: "", email: "", companyName: "", serviceType: "", consultationDate: "", consultationTime: "", message: "" });
    } catch {
      toast({ title: "حدث خطأ، يرجى المحاولة مرة أخرى", variant: "destructive" });
    }
    setLoading(false);
  };

  const selectedServiceLabel = SERVICE_TYPES.find((s) => s.value === form.serviceType)?.label;

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {config.logo_url ? (
              <img src={config.logo_url} alt={siteName} className="h-9 w-auto object-contain max-w-[160px]" />
            ) : (
              <>
                <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg">{siteName}</span>
              </>
            )}
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#services" className="hover:text-foreground transition-colors">خدماتنا</a>
            <a href="#projects" className="hover:text-foreground transition-colors">مشاريعنا</a>
            <a href="#contact" className="hover:text-foreground transition-colors">تواصل معنا</a>
          </div>
          <a href="#contact">
            <Button size="sm" data-testid="button-book-nav" className="gap-2">
              احجز استشارة الآن
              <Calendar className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-500/5 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
              <Zap className="w-4 h-4" />
              <span>نحول أفكارك إلى واقع رقمي</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
              نبني حلولاً تقنية{" "}
              <span className="text-primary">مبتكرة</span>{" "}
              لمستقبلك
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              فريق من المبدعين والمطورين المتخصصين في بناء التطبيقات، الأنظمة الذكية، وحلول الذكاء الاصطناعي
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#contact">
                <Button size="lg" data-testid="button-hero-cta" className="gap-2">
                  احجز استشارة مجانية
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </a>
              <a href="#projects">
                <Button size="lg" variant="outline" data-testid="button-hero-projects">
                  شاهد أعمالنا
                </Button>
              </a>
            </div>
            <div className="flex flex-wrap gap-8 pt-4">
              {[
                { value: "+50", label: "مشروع مكتمل" },
                { value: "+30", label: "عميل سعيد" },
                { value: "+5", label: "سنوات خبرة" },
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
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  {config.logo_url ? (
                    <img src={config.logo_url} alt={siteName} className="h-10 w-auto object-contain max-w-[120px]" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                      <Code2 className="w-5 h-5 text-primary-foreground" />
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-sm">{siteName}</div>
                    <div className="text-xs text-muted-foreground">حلول تقنية متكاملة</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "تطوير ويب", icon: Globe, color: "bg-blue-500/10 text-blue-600" },
                    { label: "ذكاء اصطناعي", icon: Brain, color: "bg-purple-500/10 text-purple-600" },
                    { label: "تطبيقات", icon: Smartphone, color: "bg-pink-500/10 text-pink-600" },
                    { label: "أتمتة", icon: Zap, color: "bg-yellow-500/10 text-yellow-600" },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-xl p-4 flex items-center gap-3 ${item.color}`}>
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <div className="text-sm font-medium">+50 مشروع منجز</div>
                    <div className="text-xs text-muted-foreground">من عملاء في 10+ دول عربية</div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 rounded-xl border border-border bg-card p-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs font-medium">مشروع جديد!</div>
                    <div className="text-xs text-muted-foreground">تطبيق AI جاهز للتسليم</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary mb-4">
              <Layers className="w-4 h-4" />
              <span>خدماتنا</span>
            </div>
            <h2 className="text-4xl font-bold mb-4">حلول تقنية متكاملة</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              نقدم مجموعة شاملة من الخدمات التقنية لتحويل أفكارك إلى منتجات رقمية ناجحة
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => {
              const IconComp = iconMap[service.icon || ""] || Code2;
              const colorClass = serviceColors[service.icon || ""] || "text-primary bg-primary/10";
              return (
                <div key={service.id} data-testid={`card-service-${service.id}`} className="hover:shadow-md rounded-xl border border-border bg-card p-6 space-y-4 transition-all">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
                    <IconComp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{service.title}</h3>
                    {service.subtitle && <p className="text-xs text-primary mt-0.5">{service.subtitle}</p>}
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">{service.description}</p>
                  {service.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {service.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Projects */}
      <section id="projects" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary mb-4">
              <Star className="w-4 h-4" />
              <span>أعمالنا</span>
            </div>
            <h2 className="text-4xl font-bold mb-4">مشاريع نفخر بها</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              نماذج من أعمالنا السابقة التي تعكس جودة وإبداع فريقنا
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const IconComp = iconMap[project.icon || ""] || BarChart3;
              return (
                <div key={project.id} data-testid={`card-project-${project.id}`} className="hover:shadow-md rounded-xl border border-border bg-card p-6 space-y-4 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <IconComp className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{project.title}</h3>
                        {project.subtitle && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary mt-0.5 inline-block">{project.subtitle}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      {[1,2,3,4,5].map((i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">{project.description}</p>
                  {project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
                      {project.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-muted font-mono text-muted-foreground">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto px-6 text-center text-primary-foreground space-y-6">
          <h2 className="text-4xl font-bold">جاهز لتحويل فكرتك إلى واقع رقمي؟</h2>
          <p className="text-xl opacity-90">
            احجز استشارة مجانية مع فريقنا لمناقشة مشروعك والحصول على خطة عمل واضحة
          </p>
          <a href="#contact">
            <Button size="lg" variant="secondary" data-testid="button-cta-banner" className="gap-2 mt-4">
              احجز استشارة مجانية
              <ArrowRight className="w-5 h-5" />
            </Button>
          </a>
        </div>
      </section>

      {/* Consultation Form */}
      <section id="contact" className="py-24 bg-muted/30">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary mb-4">
              <Calendar className="w-4 h-4" />
              <span>احجز موعدك</span>
            </div>
            <h2 className="text-4xl font-bold mb-4">احجز استشارتك المجانية</h2>
            <p className="text-xl text-muted-foreground">
              أخبرنا عن مشروعك وسيتواصل معك خبراؤنا خلال 24 ساعة
            </p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Section 1: Service Type */}
            <div className="p-8 border-b border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div>
                <div>
                  <h3 className="font-semibold">اختر نوع الخدمة</h3>
                  <p className="text-sm text-muted-foreground">ما الذي تحتاجه؟</p>
                </div>
                {form.serviceType && (
                  <div className="mr-auto flex items-center gap-1 text-sm text-primary font-medium">
                    <CheckCircle className="w-4 h-4" />
                    {selectedServiceLabel}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SERVICE_TYPES.map((svc) => {
                  const isSelected = form.serviceType === svc.value;
                  return (
                    <button
                      key={svc.value}
                      type="button"
                      data-testid={`service-card-${svc.value}`}
                      onClick={() => setForm({ ...form, serviceType: svc.value })}
                      className={`
                        flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center
                        ${isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/40 hover:bg-muted/50"
                        }
                      `}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? svc.color : "bg-muted text-muted-foreground"}`}>
                        <svc.icon className="w-5 h-5" />
                      </div>
                      <span className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>{svc.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Personal Info */}
            <div className="p-8 border-b border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div>
                <div>
                  <h3 className="font-semibold">بياناتك الشخصية</h3>
                  <p className="text-sm text-muted-foreground">كيف نتواصل معك؟</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">الاسم الكامل *</Label>
                  <Input
                    id="name"
                    data-testid="input-consult-name"
                    placeholder="أدخل اسمك الكامل"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">اسم الشركة / المؤسسة</Label>
                  <Input
                    id="companyName"
                    data-testid="input-consult-company"
                    placeholder="اختياري"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف *</Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      data-testid="input-consult-phone"
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
                      data-testid="input-consult-email"
                      placeholder="example@company.com"
                      className="pr-10"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Date & Time */}
            <div className="p-8 border-b border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div>
                <div>
                  <h3 className="font-semibold">اختر موعد الاستشارة</h3>
                  <p className="text-sm text-muted-foreground">متاح خلال الـ 30 يوماً القادمة</p>
                </div>
                {form.consultationDate && form.consultationTime && (
                  <div className="mr-auto text-sm text-primary font-medium flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {form.consultationDate} — {form.consultationTime}
                  </div>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    اختر التاريخ
                  </p>
                  <CustomCalendar
                    selected={form.consultationDate}
                    onSelect={(d) => setForm({ ...form, consultationDate: d })}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    اختر الوقت
                  </p>
                  <div className="space-y-4">
                    {TIME_SLOTS.map((group) => (
                      <div key={group.group}>
                        <p className="text-xs text-muted-foreground mb-2">{group.group}</p>
                        <div className="grid grid-cols-3 gap-2">
                          {group.times.map((time) => (
                            <button
                              key={time}
                              type="button"
                              data-testid={`timeslot-${time}`}
                              onClick={() => setForm({ ...form, consultationTime: time })}
                              className={`
                                py-2.5 rounded-lg text-sm font-medium border-2 transition-all
                                ${form.consultationTime === time
                                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                  : "border-border hover:border-primary/40 hover:bg-muted/50"
                                }
                              `}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Message */}
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</div>
                <div>
                  <h3 className="font-semibold">رسالتك</h3>
                  <p className="text-sm text-muted-foreground">أخبرنا عن مشروعك (اختياري)</p>
                </div>
              </div>
              <Textarea
                data-testid="textarea-consult-message"
                placeholder="اشرح لنا فكرتك أو مشروعك باختصار، وما الذي تتوقع الحصول عليه من الاستشارة..."
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
              <Button
                type="submit"
                size="lg"
                className="w-full gap-2 mt-6"
                disabled={loading}
                data-testid="button-submit-consultation"
              >
                {loading ? "جاري الحجز..." : "احجز الاستشارة"}
                {!loading && <ArrowRight className="w-5 h-5" />}
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {config.logo_url ? (
                <img src={config.logo_url} alt={siteName} className="h-7 w-auto object-contain max-w-[120px]" />
              ) : (
                <>
                  <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                    <Code2 className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="font-bold">{siteName}</span>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 {siteName}. جميع الحقوق محفوظة.
            </p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <a href="#services" className="hover:text-foreground transition-colors">الخدمات</a>
              <a href="#projects" className="hover:text-foreground transition-colors">المشاريع</a>
              <a href="#contact" className="hover:text-foreground transition-colors">التواصل</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
