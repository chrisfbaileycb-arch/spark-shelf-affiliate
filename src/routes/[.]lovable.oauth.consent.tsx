import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const oauth = supabase.auth.oauth as unknown as {
      getAuthorizationDetails: (
        id: string,
      ) => Promise<{
        data?: { redirect_url?: string; redirect_to?: string; client?: { name?: string } };
        error?: { message: string };
      }>;
      approveAuthorization: (
        id: string,
      ) => Promise<{
        data?: { redirect_url?: string; redirect_to?: string };
        error?: { message: string };
      }>;
      denyAuthorization: (
        id: string,
      ) => Promise<{
        data?: { redirect_url?: string; redirect_to?: string };
        error?: { message: string };
      }>;
    };
    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Authorization request failed</h1>
        <p className="mt-2 text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    const oauth = supabase.auth.oauth as unknown as {
      approveAuthorization: (
        id: string,
      ) => Promise<{
        data?: { redirect_url?: string; redirect_to?: string };
        error?: { message: string };
      }>;
      denyAuthorization: (
        id: string,
      ) => Promise<{
        data?: { redirect_url?: string; redirect_to?: string };
        error?: { message: string };
      }>;
    };
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">
          Connect {details?.client?.name ?? "an app"} to your account
        </h1>
        <p className="mt-2 text-muted-foreground">
          This lets {details?.client?.name ?? "the client"} use ReelRipper as you — read your
          products, videos, personas, and create affiliate links on your behalf.
        </p>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="inline-flex flex-1 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            Deny
          </button>
        </div>
      </div>
    </main>
  );
}
