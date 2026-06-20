import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMySubscription, createPortalSession } from "@/lib/billing.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/billing")({
  component: Billing,
});

function Billing() {
  const ms = useServerFn(getMySubscription);
  const ps = useServerFn(createPortalSession);
  const q = useQuery({ queryKey: ["mySub"], queryFn: () => ms() });

  const portal = useMutation({
    mutationFn: async () => {
      const res = await ps({ data: { returnUrl: window.location.href, environment: getStripeEnvironment() } });
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: (r) => { window.location.href = r.url; },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const tier = q.data?.tier ?? "trial";
  const used = q.data?.used ?? 0;
  const cap = q.data?.cap ?? 3;
  const pct = Math.min(100, Math.round((used / cap) * 100));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</p>
        <h1 className="mt-1 font-display text-4xl">Billing</h1>
      </header>

      <Card className="space-y-4 p-6">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Current plan</p>
            <p className="font-display text-2xl capitalize">{tier}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase text-muted-foreground">Status</p>
            <p className="capitalize">{q.data?.status}</p>
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span>{tier === "trial" ? "Trial videos" : "Videos this month"}</span>
            <span className="text-muted-foreground">{used} / {cap}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {tier === "trial" ? (
            <Link to="/pricing"><Button>Upgrade to a paid plan</Button></Link>
          ) : (
            <>
              <Link to="/pricing"><Button variant="secondary">Change plan</Button></Link>
              <Button onClick={() => portal.mutate()} disabled={portal.isPending}>
                {portal.isPending ? "…" : "Manage payment & invoices"}
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
