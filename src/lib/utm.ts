/** Client-safe UTM link builder for Campaign Kit exports. */
export interface UtmParts {
  destination_url?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
}

export function buildUtmUrl(parts: UtmParts, contentSlot?: string): string {
  const base = parts.destination_url?.trim();
  if (!base) return "";
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return base;
  }
  if (parts.utm_source) url.searchParams.set("utm_source", parts.utm_source);
  if (parts.utm_medium) url.searchParams.set("utm_medium", parts.utm_medium);
  if (parts.utm_campaign) url.searchParams.set("utm_campaign", parts.utm_campaign);
  if (contentSlot) url.searchParams.set("utm_content", contentSlot);
  return url.toString();
}

export const SLOT_LABEL: Record<string, string> = {
  "1:1": "feed",
  "9:16": "stories_reels",
  "16:9": "landscape",
  video: "video",
};
