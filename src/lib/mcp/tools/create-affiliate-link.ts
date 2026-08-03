import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { newShortCode } from "@/lib/short-code";

function applyTemplate(template: string, productUrl: string, trackingId: string): string {
  return template.replace(/\{url\}/g, encodeURIComponent(productUrl)).replace(/\{tracking_id\}/g, trackingId);
}

export default defineTool({
  name: "create_affiliate_link",
  title: "Create affiliate short link",
  description: "Create a tracked short link for a product using a saved affiliate program.",
  inputSchema: {
    product_id: z.string().uuid().describe("UUID of the product to link to."),
    affiliate_program_id: z.string().uuid().optional().describe("Optional saved affiliate program ID. If omitted, the link points to the original product URL."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ product_id, affiliate_program_id }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("You must be signed in to create a short link.");
    const supabase = supabaseForUser(ctx);

    const { data: product, error: pe } = await supabase.from("products").select("source_url").eq("id", product_id).maybeSingle();
    if (pe || !product) throw new ToolError("Product not found");

    let destination = product.source_url;
    if (affiliate_program_id) {
      const { data: prog } = await supabase
        .from("affiliate_programs")
        .select("link_template, tracking_id")
        .eq("id", affiliate_program_id)
        .maybeSingle();
      if (prog) destination = applyTemplate(prog.link_template, product.source_url, prog.tracking_id);
    }

    const short_code = newShortCode();
    const { data: row, error } = await supabase
      .from("affiliate_links")
      .insert({
        user_id: ctx.getUserId(),
        product_id,
        affiliate_program_id: affiliate_program_id ?? null,
        short_code,
        destination_url: destination,
      })
      .select()
      .single();
    if (error) throw new ToolError(`Database error: ${error.message}`);
    return {
      content: [
        { type: "text", text: `Short link created: ${short_code}` },
        { type: "text", text: JSON.stringify(row, null, 2) },
      ],
    };
  },
});
