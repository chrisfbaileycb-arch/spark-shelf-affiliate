import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/r/$code")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !key) return new Response("Misconfigured", { status: 500 });
        const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data: link } = await sb
          .from("affiliate_links")
          .select("id, destination_url")
          .eq("short_code", params.code)
          .maybeSingle();
        if (!link) return new Response("Link not found", { status: 404 });

        // Fire-and-forget click insert
        sb.from("link_clicks").insert({
          affiliate_link_id: link.id,
          referer: request.headers.get("referer"),
          user_agent: request.headers.get("user-agent"),
        }).then(() => sb.rpc("increment_link_clicks", { _id: link.id }).then?.(() => {})).catch(() => {});

        return new Response(null, {
          status: 302,
          headers: { Location: link.destination_url, "Cache-Control": "no-store" },
        });
      },
    },
  },
});
