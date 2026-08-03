import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/r/$code")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !key) return new Response("Misconfigured", { status: 500 });
        const sb = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: dest, error } = await sb.rpc("resolve_affiliate_redirect", {
          _code: params.code,
          _referer: request.headers.get("referer"),
          _user_agent: request.headers.get("user-agent"),
        });

        if (error || !dest) return new Response("Link not found", { status: 404 });

        return new Response(null, {
          status: 302,
          headers: { Location: dest as string, "Cache-Control": "no-store" },
        });
      },
    },
  },
});
