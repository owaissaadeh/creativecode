import { useLocation, Link } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarProvider, SidebarTrigger, SidebarFooter, SidebarHeader
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Users, UserCheck, TrendingUp, DollarSign,
  LogOut, Target, Code2, Layers, CalendarCheck
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface LayoutProps { children: React.ReactNode; }

export default function Layout({ children }: LayoutProps) {
  const { user, logout, isAdmin } = useAuthStore();
  const [location] = useLocation();

  const { data: stats } = useQuery<{ pendingConsultations?: number }>({
    queryKey: ["/api/admin/stats"],
    enabled: isAdmin(),
  });

  const adminNav = [
    { title: "لوحة التحكم", href: "/admin", icon: LayoutDashboard },
    { title: "المستخدمين", href: "/admin/users", icon: Users },
    { title: "العملاء المحتملون", href: "/admin/leads", icon: Target },
    { title: "العملاء", href: "/admin/clients", icon: UserCheck },
    { title: "العمولات", href: "/admin/commissions", icon: DollarSign },
    { title: "التقارير", href: "/admin/reports", icon: TrendingUp },
    { title: "إدارة المحتوى", href: "/admin/content", icon: Layers },
    {
      title: "الاستشارات",
      href: "/admin/consultations",
      icon: CalendarCheck,
      badge: stats?.pendingConsultations && stats.pendingConsultations > 0 ? stats.pendingConsultations : undefined
    },
  ];

  const salesNav = [
    { title: "لوحة التحكم", href: "/sales", icon: LayoutDashboard },
    { title: "عملائي المحتملون", href: "/sales/leads", icon: Target },
    { title: "عملائي", href: "/sales/clients", icon: UserCheck },
    { title: "عمولاتي", href: "/sales/commissions", icon: DollarSign },
  ];

  const navItems = isAdmin() ? adminNav : salesNav;

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  const currentTitle = navItems.find((n) => n.href === location)?.title || "Creative Code";

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <Sidebar side="right">
            <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
                  <Code2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm truncate">Creative Code</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {isAdmin() ? "لوحة المدير" : "لوحة المبيعات"}
                  </span>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>القائمة الرئيسية</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navItems.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={location === item.href}
                          data-testid={`nav-${item.href.replace(/\//g, "-")}`}
                        >
                          <Link href={item.href} className="flex items-center gap-2 w-full">
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span className="flex-1">{item.title}</span>
                            {"badge" in item && item.badge ? (
                              <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                                {item.badge}
                              </span>
                            ) : null}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="border-t border-sidebar-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium truncate">{user?.name}</span>
                  <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground"
                onClick={logout}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
                تسجيل الخروج
              </Button>
            </SidebarFooter>
          </Sidebar>

          <div className="flex flex-col flex-1 min-w-0">
            <header className="flex items-center gap-3 border-b border-border px-4 py-3 sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="h-5 w-px bg-border" />
              <h1 className="text-sm font-medium text-muted-foreground">{currentTitle}</h1>
            </header>
            <main className="flex-1 overflow-auto p-6">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
