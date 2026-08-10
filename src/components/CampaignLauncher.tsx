import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listCampaigns, startCampaign } from "@/lib/campaigns.functions";
import { CampaignKitDrawer } from "@/components/CampaignKitDrawer";
import { Loader2, Sparkles, ShoppingBag, Smartphone, Globe } from "lucide-react";
import { toast } from "sonner";

const KINDS = [
  { id: "ecommerce" as const, label: "E-commerce product", icon: ShoppingBag },
  { id: "mobile_app" as const, label: "Mobile app", icon: Smartphone },
  { id: "saas" as const, label: "SaaS / website", icon: Globe },
];

export function CampaignLauncher() {
  const qc = useQueryClient();
  const start = useServerFn(startCampaign);
  const list = useServerFn(listCampaigns);
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<"ecommerce" | "mobile_app" | "saas">("ecommerce");
  const [openId, setOpenId] = useState<string | null>(null);

  const campaigns = useQuery({ queryKey: ["campaigns"], queryFn: () => list() });

  const run = useMutation({
    mutationFn: () => start({ data: { url, asset_kind: kind, include_video: true } }),
    onSuccess: (res) => {
      toast.success("Campaign kit created");
      setUrl("");
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      setOpenId(res.campaign.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card className="max-w-2xl space-y-4 p-6 shadow-pop">
        <div>
          <Label htmlFor="campaign-url">Paste any URL</Label>
          <Input
            id="campaign-url"
            data-testid="campaign-url"
            type="url"
            placeholder="https://apps.apple.com/… or https://yourstore.com/product/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            What is it?
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                data-testid={`kind-${k.id}`}
                onClick={() => setKind(k.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
                  kind === k.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <k.icon className="h-4 w-4" />
                {k.label}
              </button>
            ))}
          </div>
        </div>
        <Button
          data-testid="start-campaign"
          className="w-full"
          size="lg"
          disabled={!url || run.isPending}
          onClick={() => run.mutate()}
        >
          {run.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reading the page &amp; writing copy…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" /> Build campaign kit
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          We pull the page, write Meta-compliant copy, then you render creatives in every ratio and
          an avatar video from the kit drawer.
        </p>
      </Card>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your campaign kits
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.data?.length ? (
            campaigns.data.map((c) => (
              <button
                key={c.id}
                type="button"
                data-testid={`campaign-${c.id}`}
                onClick={() => setOpenId(c.id)}
                className="rounded-2xl border border-border bg-card p-4 text-left transition-transform hover:-translate-y-1 hover:shadow-pop"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-medium">{c.name}</p>
                  <Badge variant={c.status === "complete" ? "default" : "secondary"}>
                    {c.status}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{c.step}</p>
              </button>
            ))
          ) : (
            <Card className="border-dashed p-8 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
              No kits yet — paste a URL above to build your first.
            </Card>
          )}
        </div>
      </div>

      <CampaignKitDrawer
        campaignId={openId}
        open={!!openId}
        onOpenChange={(v) => !v && setOpenId(null)}
      />
    </div>
  );
}
