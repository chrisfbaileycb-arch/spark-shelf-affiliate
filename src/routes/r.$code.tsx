import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/r/$code")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: dest, error } = await supabaseAdmin.rpc("resolve_affiliate_redirect", {
          _code: params.code,
          _referer: request.headers.get("referer") ?? undefined,
          _user_agent: request.headers.get("user-agent") ?? undefined,

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
