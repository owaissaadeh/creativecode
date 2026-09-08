export function injectFavicon(html: string, faviconUrl: string | null | undefined): string {
  if (!faviconUrl) return html;
  return html.replace(
    /<link\s+rel="icon"[^>]*>/,
    `<link rel="icon" href="${faviconUrl}">`
  );
}
