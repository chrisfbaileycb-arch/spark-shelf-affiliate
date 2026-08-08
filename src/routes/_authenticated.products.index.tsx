import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listProducts } from "@/lib/products.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/products/")({
  head: () => ({
    meta: [
      { title: "Products — Influencer Echo" },
      {
        name: "description",
        content:
          "Every product you've ripped into Influencer Echo, ready to turn into a 15-second affiliate video.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProductsList,
});

function ProductsList() {
  const navigate = useNavigate();
  const lp = useServerFn(listProducts);
  const q = useQuery({ queryKey: ["products"], queryFn: () => lp() });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Library
          </p>
          <h1 className="mt-1 font-display text-4xl">Products</h1>
        </div>
        <Button onClick={() => navigate({ to: "/products/new" })}>
          <Plus className="mr-2 h-4 w-4" /> New
        </Button>
      </header>

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : q.data?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {q.data.map((p) => {
            const imgs = (p.images as string[] | null) ?? [];
            return (
              <Link to="/products/$id" params={{ id: p.id }} key={p.id}>
                <Card className="flex gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-pop">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {imgs[0] ? (
                      <img
                        src={imgs[0]}
                        alt={`${p.title} product image`}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium leading-snug">{p.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{p.source_domain}</p>
                    {p.price ? (
                      <p className="mt-2 text-sm font-semibold text-primary">
                        {p.price} {p.currency}
                      </p>
                    ) : null}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed p-12 text-center">
          <p className="font-display text-2xl">No products yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Paste any product URL — Amazon, TikTok Shop, AliExpress, Etsy, Shopify store — and we'll
            handle the rest.
          </p>
          <Button className="mt-6" onClick={() => navigate({ to: "/products/new" })}>
            <Plus className="mr-2 h-4 w-4" /> Ingest first product
          </Button>
        </Card>
      )}
    </div>
  );
}
