import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { syncSubscriptionFromStripe } from "@/lib/billing.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/checkout/return")({
  head: () => ({
    meta: [
      { title: "Finishing checkout — Echo Your Influence" },
      { name: "description", content: "Confirming your Echo Your Influence subscription." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  const sync = useServerFn(syncSubscriptionFromStripe);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [tier, setTier] = useState<string | undefined>();

  useEffect(() => {
    if (!session_id) {
      setState("error");
      return;
    }
    sync({ data: { sessionId: session_id, environment: getStripeEnvironment() } })
      .then((r) => {
        if ("ok" in r && r.ok) {
          setTier(r.tier);
          setState("ok");
        } else setState("error");
      })
      .catch(() => setState("error"));
  }, [session_id, sync]);

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <Card className="max-w-md p-8 text-center">
        {state === "loading" && (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4">Confirming your subscription…</p>
          </>
        )}
        {state === "ok" && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <h1 className="mt-3 font-display text-2xl">You're on {tier}!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your plan is active. Let's make videos.
            </p>
            <Link to="/dashboard">
              <Button className="mt-6">Go to dashboard</Button>
            </Link>
          </>
        )}
        {state === "error" && (
          <>
            <h1 className="font-display text-2xl">Hmm</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We couldn't confirm the session. Check your billing page.
            </p>
            <Link to="/billing">
              <Button className="mt-6">View billing</Button>
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}
