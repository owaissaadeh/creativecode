import { Link, useLocation } from "wouter";
import { usePortalAuthStore } from "@/lib/portalAuth";
import { useSiteConfig } from "@/lib/siteConfig";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LayoutDashboard, LifeBuoy, LogOut, Code2 } from "lucide-react";

interface PortalLayoutProps { children: React.ReactNode; }

export default function PortalLayout({ children }: PortalLayoutProps) {
  const { clientUser, logout } = usePortalAuthStore();
  const [location] = useLocation();
  const siteConfig = useSiteConfig();
  const siteName = siteConfig.logo_text || "Creative Code";

  const navItems = [
    { title: "لوحة التحكم", href: "/portal", icon: LayoutDashboard },
    { title: "تذاكري", href: "/portal/tickets", icon: LifeBuoy },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              {siteConfig.logo_url ? (
                <img src={siteConfig.logo_url} alt={siteName} className="h-7 w-auto object-contain max-w-[120px]" />
              ) : (
                <>
                  <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                    <Code2 className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-sm">{siteName}</span>
                </>
              )}
              <span className="text-xs text-muted-foreground border-r border-border pr-2 mr-1">بوابة العملاء</span>
            </div>
            <nav className="hidden sm:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={`portal-nav-${item.href.replace(/\//g, "-")}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    location === item.href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">{clientUser?.name?.charAt(0) || "ع"}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm font-medium">{clientUser?.name}</span>
            <Button variant="ghost" size="sm" onClick={logout} data-testid="button-portal-logout" className="gap-1.5 text-muted-foreground">
              <LogOut className="w-4 h-4" />
              خروج
            </Button>
          </div>
        </div>
        <nav className="sm:hidden flex items-center gap-1 px-4 pb-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${
                location === item.href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.title}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}
