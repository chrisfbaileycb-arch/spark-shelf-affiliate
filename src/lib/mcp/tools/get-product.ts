import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_product",
  title: "Get product details",
  description: "Fetch full details for one product by its ID.",
  inputSchema: {
    product_id: z.string().uuid().describe("UUID of the product to fetch."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ product_id }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("You must be signed in to fetch a product.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.from("products").select("*").eq("id", product_id).maybeSingle();
    if (error) throw new ToolError(`Database error: ${error.message}`);
    if (!data) throw new ToolError("Product not found.");
    return {
      content: [
        { type: "text", text: `Product: ${data.title}` },
        { type: "text", text: JSON.stringify(data, null, 2) },
      ],
    };
  },
});
