import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_affiliate_program",
  title: "Create affiliate program",
  description: "Save an affiliate program with its tracking ID and link template for later use when building short links.",
  inputSchema: {
    name: z.string().min(1).max(100).describe("Program/network name, e.g. Amazon Associates."),
    network: z.string().min(1).max(80).describe("Slug identifier for the network."),
    tracking_id: z.string().min(1).max(120).describe("Your affiliate tracking ID or tag."),
    link_template: z.string().min(4).max(1000).describe("URL template. Use {url} for the product URL and {tracking_id} for your tag."),
    notes: z.string().max(2000).optional().describe("Optional notes."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ name, network, tracking_id, link_template, notes }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("You must be signed in to create an affiliate program.");
    const supabase = supabaseForUser(ctx);
    const { data: row, error } = await supabase
      .from("affiliate_programs")
      .insert({ user_id: ctx.getUserId(), name, network, tracking_id, link_template, notes })
      .select()
      .single();
    if (error) throw new ToolError(`Database error: ${error.message}`);
    return {
      content: [
        { type: "text", text: `Saved affiliate program: ${row.name}` },
        { type: "text", text: JSON.stringify(row, null, 2) },
      ],
    };
  },
});
