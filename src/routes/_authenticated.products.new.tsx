import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createManualSubject, ingestProduct } from "@/lib/products.functions";
import { CAMPAIGN_MODES, campaignMode, type CampaignModeId } from "@/lib/campaign-modes";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Link2, PencilLine } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/products/new")({
  head: () => ({
    meta: [
      { title: "Add a campaign subject — Echo Your Influence" },
      {
        name: "description",
        content:
          "Start a campaign from a link or describe it yourself: an affiliate product, a listing, a remodel, a menu item, a service, or your own app.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NewProduct,
});

function NewProduct() {
  const navigate = useNavigate();
  const ingest = useServerFn(ingestProduct);
  const manual = useServerFn(createManualSubject);

  const [mode, setMode] = useState<CampaignModeId>("affiliate");
  const [method, setMethod] = useState<"link" | "manual">("link");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);

  const active = campaignMode(mode);
  const canScrape = active.urlPlaceholder !== null;
  const useLink = method === "link" && canScrape;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (useLink) {
        const res = await ingest({ data: { url, campaign_mode: mode } });
        toast.success("Page read and saved.");
        navigate({ to: "/products/$id", params: { id: res.product!.id } });
      } else {
        const res = await manual({
          data: {
            title,
            description: detail,
            price,
            source_url: url.trim(),
            campaign_mode: mode,
          },
        });
        toast.success(`${active.subject[0]!.toUpperCase()}${active.subject.slice(1)} saved.`);
        navigate({ to: "/products/$id", params: { id: res.product!.id } });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Step 1 of 2
        </p>
        <h1 className="mt-1 font-display text-4xl">What are we marketing?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick the kind of campaign first — it changes how the scripts, prompts, and captions are
          written, and whether an affiliate disclosure gets attached.
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        {CAMPAIGN_MODES.map((m) => {
          const Icon = m.icon;
          const selected = m.id === mode;
          return (
            <button
              key={m.id}
              type="button"
              data-testid={`campaign-mode-${m.id}`}
              onClick={() => {
                setMode(m.id);
                if (m.urlPlaceholder === null) setMethod("manual");
              }}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                selected ? "border-primary bg-primary/5" : "hover:bg-muted"
              }`}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{m.label}</span>
                <span className="block text-xs text-muted-foreground">{m.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>

      <Card className="p-6 shadow-pop">
        {canScrape && (
          <div className="mb-5 inline-flex rounded-lg border p-1">
            <button
              type="button"
              data-testid="method-link"
              onClick={() => setMethod("link")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                useLink ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <Link2 className="h-3.5 w-3.5" /> Read a link
            </button>
            <button
              type="button"
              data-testid="method-manual"
              onClick={() => setMethod("manual")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                !useLink ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <PencilLine className="h-3.5 w-3.5" /> Describe it myself
            </button>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {useLink ? (
            <div>
              <Label htmlFor="url">Link to the {active.subject}</Label>
              <div className="relative mt-1">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="url"
                  required
                  type="url"
                  placeholder={active.urlPlaceholder ?? ""}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pl-9"
                  data-testid="subject-url"
                />
              </div>
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="title">Name of the {active.subject}</Label>
                <Input
                  id="title"
                  required
                  className="mt-1"
                  placeholder={active.titlePlaceholder}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="subject-title"
                />
              </div>
              <div>
                <Label htmlFor="detail">The details</Label>
                <Textarea
                  id="detail"
                  rows={5}
                  className="mt-1"
                  placeholder={active.detailPlaceholder}
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  data-testid="subject-detail"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Everything the scripts can claim comes from this box. Nothing gets invented.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="price">Price or range (optional)</Label>
                  <Input
                    id="price"
                    className="mt-1 font-mono tabular-nums"
                    placeholder="$450,000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    data-testid="subject-price"
                  />
                </div>
                <div>
                  <Label htmlFor="link">Link for the caption (optional)</Label>
                  <Input
                    id="link"
                    className="mt-1"
                    placeholder="https://…"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    data-testid="subject-optional-url"
                  />
                </div>
              </div>
            </>
          )}

          <Button type="submit" disabled={busy} className="w-full" size="lg">
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {useLink ? "Reading the page…" : "Saving…"}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {useLink ? "Read this link" : `Save this ${active.subject}`}
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            {useLink
              ? "We read the page with Firecrawl and pull out the title, photos, price, and a short summary."
              : active.disclosureRule === "affiliate"
                ? "Affiliate mode: every generated caption carries an FTC disclosure."
                : "You're marketing your own work, so no affiliate disclosure is attached."}
          </p>
        </form>
      </Card>
    </div>
  );
}
