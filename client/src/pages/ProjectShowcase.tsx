import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useSiteConfig } from "@/lib/siteConfig";
import { Button } from "@/components/ui/button";
import type { PageItem } from "@shared/schema";
import {
  Code2, Brain, Zap, Settings2, Cloud, Smartphone, Bot,
  UtensilsCrossed, GraduationCap, Truck, ShoppingCart, BarChart3,
  ArrowRight, Star, Globe, Layers, Calendar, ChevronRight, ChevronLeft,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Code2, Brain, Zap, Settings2, Cloud, Smartphone, Bot,
  UtensilsCrossed, GraduationCap, Truck, ShoppingCart, BarChart3,
  Globe, Layers, Calendar, Star
};

export default function ProjectShowcase() {
  const { id } = useParams<{ id: string }>();
  const config = useSiteConfig();
  const siteName = config.logo_text || "Creative Code";
  const [activeImage, setActiveImage] = useState(0);

  const { data: project, isLoading, isError } = useQuery<PageItem>({
    queryKey: [`/api/content/items/${id}`],
  });

  const IconComp = iconMap[project?.icon || ""] || BarChart3;
  const images = project?.imageUrls || [];

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground font-sans">
      <nav className="fixed top-0 w-full z-50 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
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
          </Link>
          <Link href="/#projects">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-back-projects">
              <ArrowRight className="w-4 h-4" />
              رجوع للمشاريع
            </Button>
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 pt-28 pb-24">
        {isLoading ? (
          <div className="text-center py-24 text-muted-foreground">جاري التحميل...</div>
        ) : isError || !project ? (
          <div className="text-center py-24 space-y-4">
            <p className="text-muted-foreground">المشروع غير موجود</p>
            <Link href="/#projects">
              <Button variant="outline" size="sm">رجوع للمشاريع</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {images.length > 0 ? (
              <div className="space-y-3">
                <div className="w-full h-72 md:h-96 rounded-2xl overflow-hidden border border-border bg-muted/40">
                  <img src={images[activeImage]} alt={project.title} className="w-full h-full object-cover" data-testid="showcase-main-image" />
                </div>
                {images.length > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveImage((i) => (i - 1 + images.length) % images.length)}
                      className="p-2 rounded-lg border border-border hover:bg-muted shrink-0"
                      data-testid="showcase-prev"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="flex gap-2 overflow-x-auto flex-1">
                      {images.map((url, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveImage(i)}
                          className={`w-16 h-12 rounded-lg overflow-hidden border-2 shrink-0 ${i === activeImage ? "border-primary" : "border-transparent"}`}
                          data-testid={`showcase-thumb-${i}`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setActiveImage((i) => (i + 1) % images.length)}
                      className="p-2 rounded-lg border border-border hover:bg-muted shrink-0"
                      data-testid="showcase-next"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-56 rounded-2xl bg-primary/10 flex items-center justify-center">
                <IconComp className="w-16 h-16 text-primary" />
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold" data-testid="showcase-title">{project.title}</h1>
                {project.subtitle && (
                  <span className="text-sm px-3 py-1 rounded-full bg-primary/10 text-primary">{project.subtitle}</span>
                )}
              </div>
              {project.description && (
                <p className="text-lg text-muted-foreground leading-relaxed" data-testid="showcase-description">
                  {project.description}
                </p>
              )}
              {project.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {project.tags.map((tag) => (
                    <span key={tag} className="text-sm px-3 py-1 rounded-full bg-muted font-mono text-muted-foreground">{tag}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
              <h2 className="text-xl font-bold">عجبك المشروع؟</h2>
              <p className="text-muted-foreground">احجز استشارة مجانية ونساعدك تحقق فكرتك</p>
              <Link href="/#contact">
                <Button size="lg" className="gap-2" data-testid="button-book-showcase">
                  احجز استشارة الآن
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
