import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMySubscription, createPortalSession } from "@/lib/billing.functions";
import { getMyReferralStats } from "@/lib/referrals.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Gift } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Billing & referrals — Echo Your Influence" },
      {
        name: "description",
        content:
          "Manage your Echo Your Influence subscription, video quota, and refer-and-earn credits.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Billing,
});

function Billing() {
  const ms = useServerFn(getMySubscription);
  const ps = useServerFn(createPortalSession);
  const rs = useServerFn(getMyReferralStats);
  const q = useQuery({ queryKey: ["mySub"], queryFn: () => ms() });
  const refQ = useQuery({ queryKey: ["myReferrals"], queryFn: () => rs() });

  const portal = useMutation({
    mutationFn: async () => {
      const res = await ps({
        data: { returnUrl: window.location.href, environment: getStripeEnvironment() },
      });
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: (r) => {
      window.location.href = r.url;
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const tier = q.data?.tier ?? "trial";
  const used = q.data?.used ?? 0;
  const cap = q.data?.cap ?? 3;
  const pct = Math.min(100, Math.round((used / cap) * 100));

  const refCode = refQ.data?.referralCode;
  const refLink =
    refCode && typeof window !== "undefined" ? `${window.location.origin}/auth?ref=${refCode}` : "";
  const credited = ((refQ.data?.totalCreditedCents ?? 0) / 100).toFixed(2);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Account
        </p>
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
            <span className="text-muted-foreground">
              {used} / {cap}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {tier === "trial" ? (
            <Link to="/upgrade">
              <Button>Upgrade to a paid plan</Button>
            </Link>
          ) : (
            <>
              <Link to="/upgrade">
                <Button variant="secondary">Change plan</Button>
              </Link>
              <Button onClick={() => portal.mutate()} disabled={portal.isPending}>
                {portal.isPending ? "…" : "Manage payment & invoices"}
              </Button>
            </>
          )}
        </div>
      </Card>

      <Card className="space-y-4 bg-gradient-brand p-6 text-primary-foreground shadow-pop">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background/20">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
              Refer & earn
            </p>
            <p className="mt-1 font-display text-2xl leading-tight">
              Get 2 months free for every signup who upgrades
            </p>
            <p className="mt-1 text-sm opacity-80">
              Credit lands automatically on your next invoice when someone you referred subscribes
              to Starter or Pro.
            </p>
          </div>
        </div>

        {refLink ? (
          <div className="flex items-center gap-2 rounded-xl bg-background/15 p-2">
            <code className="flex-1 truncate px-2 text-sm">{refLink}</code>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(refLink);
                toast.success("Link copied");
              }}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
            </Button>
          </div>
        ) : (
          <p className="text-sm opacity-70">Generating your referral link…</p>
        )}

        <div className="grid grid-cols-3 gap-3 border-t border-background/20 pt-4 text-center">
          <div>
            <p className="font-display text-2xl">{refQ.data?.conversionCount ?? 0}</p>
            <p className="text-xs opacity-70">Friends upgraded</p>
          </div>
          <div>
            <p className="font-display text-2xl">${credited}</p>
            <p className="text-xs opacity-70">Credited to you</p>
          </div>
          <div>
            <p className="font-display text-2xl">{refQ.data?.pendingCount ?? 0}</p>
            <p className="text-xs opacity-70">Pending payout</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
