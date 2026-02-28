import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export type SiteConfig = {
  logo_text: string;
  logo_url: string;
  favicon_url: string;
};

const DEFAULTS: SiteConfig = {
  logo_text: "Creative Code",
  logo_url: "",
  favicon_url: "",
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
