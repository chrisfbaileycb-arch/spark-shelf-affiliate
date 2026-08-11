import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { suggestNetworkForDomain } from "@/lib/affiliate-networks";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1";

async function firecrawlScrape(url: string) {
  const key = (() => {
    const runtime = globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    };
    return runtime.process?.env?.FIRECRAWL_API_KEY;
  })();
  if (!key)
    throw new ToolError("Firecrawl is not connected. Add a Firecrawl API key in project settings.");
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
  if (!res.ok)
    throw new ToolError(`Scrape failed (${res.status}): ${await res.text().catch(() => "")}`);
  const json = (await res.json()) as {
    data?: { markdown?: string; links?: string[]; metadata?: Record<string, unknown> };
  };
  return json.data ?? {};
}

async function extractProductFields(markdown: string, sourceUrl: string) {
  const key = (() => {
    const runtime = globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    };
    return runtime.process?.env?.LOVABLE_API_KEY;
  })();
  if (!key) throw new ToolError("LOVABLE_API_KEY not configured.");
  const res = await fetch(`${AI_GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        {
          role: "system",
          content:
            "Extract product info from scraped page markdown. Reply ONLY with strict minified JSON: {title, description, price, currency, image_urls[]}. description = 1-2 sentence buyer-focused summary. image_urls = up to 4 absolute https URLs of product photos (skip logos/avatars/sprites). If a field is unknown use empty string or [].",
        },
        {
          role: "user",
          content: `Source URL: ${sourceUrl}\n\nMARKDOWN:\n${markdown.slice(0, 12000)}`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    if (res.status === 402) throw new ToolError("Lovable AI credits exhausted.");
    if (res.status === 429) throw new ToolError("Lovable AI rate limit.");
    throw new ToolError(`AI extract failed (${res.status})`);
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

export default defineTool({
  name: "ingest_product",
  title: "Ingest product from URL",
  description:
    "Scrape a product page, extract title/price/images with AI, and save it to the user's catalog. Optionally attach it to a campaign, pre-filling that campaign's product brief.",
  inputSchema: {
    url: z.string().url().describe("Full product page URL (Amazon, AliExpress, Shopify, etc.)."),
    campaign_id: z
      .string()
      .uuid()
      .optional()
      .describe("Optional campaign workflow UUID to attach this product to as the product brief."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
  handler: async ({ url, campaign_id }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("You must be signed in to ingest a product.");
    const supabase = supabaseForUser(ctx);
    const domain = new URL(url).hostname.replace(/^www\./, "");

    const scraped = await firecrawlScrape(url);
    const md = scraped.markdown ?? "";
    const fields = await extractProductFields(md, url);
    const network = suggestNetworkForDomain(domain);

    const { data: row, error } = await supabase
      .from("products")
      .insert({
        user_id: ctx.getUserId(),
        source_url: url,
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
    if (error) throw new ToolError(`Database error: ${error.message}`);

    let attached: string | null = null;
    if (campaign_id) {
      const { campaignCtx, requireWorkflow } = await import("../campaign.server");
      const { orgId, db } = await campaignCtx(ctx);
      await requireWorkflow(db, orgId, campaign_id);
      await db.from("product_briefs").upsert(
        {
          workflow_id: campaign_id,
          org_id: orgId,
          source_url: url,
          product_id: row.id,
          offer: `${row.title}\n\n${row.description ?? ""}`.trim(),
        },
        { onConflict: "workflow_id" },
      );
      await db
        .from("campaign_workflows")
        .update({ product_id: row.id })
        .eq("id", campaign_id)
        .eq("org_id", orgId);
      attached = campaign_id;
    }

    return {
      content: [
        { type: "text", text: `Ingested product: ${row.title}` },
        {
          type: "text",
          text: JSON.stringify(
            { product: row, suggested_network: network, attached_to_campaign: attached },
            null,
            2,
          ),
        },
      ],
    };
  },
});
