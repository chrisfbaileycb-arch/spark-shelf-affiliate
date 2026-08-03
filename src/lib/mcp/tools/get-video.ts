import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_video",
  title: "Get video details",
  description: "Fetch full details for one video by its ID, including the source product.",
  inputSchema: {
    video_id: z.string().uuid().describe("UUID of the video to fetch."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ video_id }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("You must be signed in to fetch a video.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.from("videos").select("*, products(*)").eq("id", video_id).maybeSingle();
    if (error) throw new ToolError(`Database error: ${error.message}`);
    if (!data) throw new ToolError("Video not found.");
    return {
      content: [
        { type: "text", text: `Video status: ${data.status}` },
        { type: "text", text: JSON.stringify(data, null, 2) },
      ],
    };
  },
});
