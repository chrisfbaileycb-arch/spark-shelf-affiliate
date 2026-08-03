import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_products",
  title: "List products",
  description: "List the signed-in user's ingested affiliate products, newest first.",
  inputSchema: {
    limit: z.coerce.number().int().min(1).max(100).optional().describe("Maximum products to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      throw new ToolError("You must be signed in to list products.");
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("products")
      .select("id, title, source_domain, price, currency, images, created_at, suggested_network")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (error) throw new ToolError(`Database error: ${error.message}`);
    return {
      content: [
        {
          type: "text",
          text: `Found ${data?.length ?? 0} product(s).`,
        },
        {
          type: "text",
          text: JSON.stringify(data ?? [], null, 2),
        },
      ],
    };
  },
});
