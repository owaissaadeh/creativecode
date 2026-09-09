import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export type SiteConfig = {
  logo_text: string;
  logo_url: string;
  favicon_url: string;
  heroImages: string[];
  heroTitleBefore: string;
  heroTitleAccent: string;
  heroTitleAfter: string;
  heroSubtitle: string;
  heroFeatures: { icon: string; label: string }[];
  heroCtaText: string;
  heroAnnotationText: string;
  heroRatingText: string;
  heroSecondaryText: string;
  heroStats: { value: string; label: string }[];
};

const DEFAULTS: SiteConfig = {
  logo_text: "Creative Code",
  logo_url: "",
  favicon_url: "",
  heroImages: [],
  heroTitleBefore: "نبني حلولاً تقنية",
  heroTitleAccent: "مبتكرة",
  heroTitleAfter: "لمستقبلك",
  heroSubtitle:
    "فريق من المبدعين والمطورين المتخصصين في بناء التطبيقات، الأنظمة الذكية، وحلول الذكاء الاصطناعي",
  heroFeatures: [
    { icon: "Zap", label: "تسليم سريع" },
    { icon: "CheckCircle", label: "فريق متخصص" },
    { icon: "Clock", label: "دعم مستمر" },
  ],
  heroCtaText: "احجز استشارة مجانية",
  heroAnnotationText: "بدون أي التزام",
  heroRatingText: "تقييم 5 نجوم من عملائنا",
  heroSecondaryText: "شاهد أعمالنا",
  heroStats: [
    { value: "+50", label: "مشروع مكتمل" },
    { value: "+30", label: "عميل سعيد" },
    { value: "+5", label: "سنوات خبرة" },
  ],
};

export function useSiteConfig() {
  const { data } = useQuery<SiteConfig>({
    queryKey: ["/api/content/config"],
    staleTime: 1000 * 60 * 5,
  });
  return data ?? DEFAULTS;
}

export function useFaviconSync() {
  const config = useSiteConfig();
  useEffect(() => {
    if (!config.favicon_url) return;
    const link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (link) link.href = config.favicon_url;
  }, [config.favicon_url]);
}
