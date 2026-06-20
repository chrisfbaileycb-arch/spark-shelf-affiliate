import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { suggestNetworkForDomain } from "./affiliate-networks";

const UrlInput = z.object({ url: z.string().url() });

// --- Firecrawl scrape ---
async function firecrawlScrape(url: string) {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("Firecrawl is not connected");
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      formats: ["markdown", "links"],
      onlyMainContent: true,
      waitFor: 1500,
    }),
  });
  if (!res.ok) throw new Error(`Scrape failed (${res.status}): ${await res.text().catch(() => "")}`);
  const json = (await res.json()) as { data?: { markdown?: string; links?: string[]; metadata?: Record<string, unknown> } };
  return json.data ?? {};
}

// --- Lovable AI extraction of product fields ---
async function extractProductFields(markdown: string, sourceUrl: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "Extract product info from scraped page markdown. Reply ONLY with strict minified JSON: {title, description, price, currency, image_urls[]}. description = 1-2 sentence buyer-focused summary. image_urls = up to 4 absolute https URLs of product photos (skip logos/avatars/sprites). If a field is unknown use empty string or [].",
        },
        { role: "user", content: `Source URL: ${sourceUrl}\n\nMARKDOWN:\n${markdown.slice(0, 12000)}` },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    if (res.status === 402) throw new Error("Lovable AI credits exhausted. Add credits to keep generating.");
    if (res.status === 429) throw new Error("Lovable AI rate limit. Try again in a moment.");
    throw new Error(`AI extract failed (${res.status})`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content) as {
      title?: string;
      description?: string;
      price?: string;
      currency?: string;
      image_urls?: string[];
    };
  } catch {
    return {};
  }
}

export const ingestProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UrlInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const domain = new URL(data.url).hostname.replace(/^www\./, "");

    const scraped = await firecrawlScrape(data.url);
    const md = scraped.markdown ?? "";
    const fields = await extractProductFields(md, data.url);
    const network = suggestNetworkForDomain(domain);

    const { data: row, error } = await supabase
      .from("products")
      .insert({
        user_id: userId,
        source_url: data.url,
        source_domain: domain,
        title: fields.title || "Untitled product",
        description: fields.description ?? "",
        price: fields.price ?? "",
        currency: fields.currency ?? "",
        images: fields.image_urls ?? [],
        raw: { markdown: md.slice(0, 4000) },
        suggested_network: network.network,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { product: row, suggested: network };
  });

export const listProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("products")
      .select("id, title, source_domain, price, currency, images, created_at, suggested_network")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("products").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Product not found");
    return row;
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
