import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ingestProduct } from "@/lib/products.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Link2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/products/new")({
  head: () => ({
    meta: [
      { title: "Add a new product — Influencer Echo" },
      {
        name: "description",
        content:
          "Paste a product URL to ingest images, price, and details for your next AI affiliate video.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NewProduct,
});

function NewProduct() {
  const navigate = useNavigate();
  const ingest = useServerFn(ingestProduct);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await ingest({ data: { url } });
      toast.success("Product ingested.");
      navigate({ to: "/products/$id", params: { id: res.product!.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to ingest");
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
        <h1 className="mt-1 font-display text-4xl">Paste a product URL</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Amazon, TikTok Shop, AliExpress, Etsy, Shopify, anything with a public product page.
        </p>
      </header>

      <Card className="p-6 shadow-pop">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="url">Product URL</Label>
            <div className="relative mt-1">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="url"
                required
                type="url"
                placeholder="https://www.amazon.com/dp/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Button type="submit" disabled={busy} className="w-full" size="lg">
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scraping & extracting…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Ingest product
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            We scrape with Firecrawl and let Lovable AI pull out the title, photos, price, and a
            buyer-focused summary.
          </p>
        </form>
      </Card>
    </div>
  );
}
