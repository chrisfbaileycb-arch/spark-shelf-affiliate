import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_personas",
  title: "List personas",
  description: "List the signed-in user's AI influencer personas.",
  inputSchema: {
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum personas to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("You must be signed in to list personas.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("personas")
      .select(
        "id, name, bio, gender, age_range, vibe, niche, voice_tone, catchphrases, speech_quirks, is_default, created_at",
      )
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (error) throw new ToolError(`Database error: ${error.message}`);
    return {
      content: [
        { type: "text", text: `Found ${data?.length ?? 0} persona(s).` },
        { type: "text", text: JSON.stringify(data ?? [], null, 2) },
      ],
    };
  },
});
