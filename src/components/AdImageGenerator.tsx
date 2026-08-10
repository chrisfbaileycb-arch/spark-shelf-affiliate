import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listProducts } from "@/lib/products.functions";
import { generateAdImage, listAdImages } from "@/lib/ad-images.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, Copy, ImageIcon, Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Ratio = "1:1" | "9:16" | "16:9";

const RATIOS: { value: Ratio; label: string; surface: string; box: string }[] = [
  { value: "1:1", label: "1:1 Feed", surface: "FB / IG feed", box: "aspect-square w-10" },
  { value: "9:16", label: "9:16 Story", surface: "TikTok, Reels", box: "aspect-[9/16] w-6" },
  { value: "16:9", label: "16:9 Landscape", surface: "FB display", box: "aspect-video w-12" },
];

interface Frame {
  ratio: Ratio;
  url: string | null;
  status: "queued" | "rendering" | "ready" | "failed";
  error?: string;
}

async function copyImage(url: string) {
  const blob = await fetch(url).then((r) => r.blob());
  await navigator.clipboard.write([new ClipboardItem({ [blob.type || "image/png"]: blob })]);
}

export function AdImageGenerator() {
  const qc = useQueryClient();
  const lp = useServerFn(listProducts);
  const la = useServerFn(listAdImages);
  const gen = useServerFn(generateAdImage);

  const products = useQuery({ queryKey: ["products"], queryFn: () => lp() });
  const gallery = useQuery({ queryKey: ["ad-images"], queryFn: () => la() });

  const [productId, setProductId] = useState<string>("");
  const [angle, setAngle] = useState("");
  const [selected, setSelected] = useState<Ratio[]>(["1:1"]);
  const [frames, setFrames] = useState<Frame[]>([]);

  const activeProduct = useMemo(
    () => products.data?.find((p) => p.id === productId) ?? null,
    [products.data, productId],
  );

  const run = useMutation({
    mutationFn: async (ratios: Ratio[]) => {
      setFrames(ratios.map((r) => ({ ratio: r, url: null, status: "queued" as const })));
      for (const ratio of ratios) {
        setFrames((f) => f.map((x) => (x.ratio === ratio ? { ...x, status: "rendering" } : x)));
        try {
          const out = await gen({
            data: { product_id: productId, ratio, angle: angle.trim() || undefined },
          });
          setFrames((f) =>
            f.map((x) => (x.ratio === ratio ? { ...x, status: "ready", url: out.url } : x)),
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setFrames((f) =>
            f.map((x) => (x.ratio === ratio ? { ...x, status: "failed", error: message } : x)),
          );
          toast.error(`${ratio} failed: ${message}`);
        }
      }
      await qc.invalidateQueries({ queryKey: ["ad-images"] });
    },
  });

  const busy = run.isPending;

  function start(ratios: Ratio[]) {
    if (!productId) {
      toast.error("Pick a product first");
      return;
    }
    run.mutate(ratios);
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card className="space-y-4 p-6">
            <div>
              <label
                htmlFor="ad-product"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Product
              </label>
              <select
                id="ad-product"
                data-testid="ad-product-select"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm transition-colors hover:border-primary/50"
              >
                <option value="">Select a product…</option>
                {products.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              {activeProduct && (
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  {activeProduct.source_domain}
                  {activeProduct.price ? ` · ${activeProduct.price}` : ""}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="ad-angle"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Selling angle (optional)
              </label>
              <Input
                id="ad-angle"
                data-testid="ad-angle-input"
                value={angle}
                onChange={(e) => setAngle(e.target.value)}
                placeholder="e.g. desk setup upgrade under $30"
                className="mt-2"
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Aspect ratios
              </p>
              <div className="mt-2 grid gap-2">
                {RATIOS.map((r) => {
                  const on = selected.includes(r.value);
                  return (
                    <button
                      key={r.value}
                      type="button"
                      data-testid={`ratio-${r.value.replace(":", "-")}`}
                      aria-pressed={on}
                      onClick={() =>
                        setSelected((s) =>
                          s.includes(r.value) ? s.filter((x) => x !== r.value) : [...s, r.value],
                        )
                      }
                      className={cn(
                        "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                        on
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <span
                        className={cn(
                          "shrink-0 rounded-sm border",
                          r.box,
                          on ? "border-primary bg-primary/30" : "border-muted-foreground/40",
                        )}
                      />
                      <span className="flex-1">
                        <span className="block font-medium">{r.label}</span>
                        <span className="block text-xs text-muted-foreground">{r.surface}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              data-testid="generate-selected"
              disabled={busy || selected.length === 0}
              onClick={() => start(selected)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              Generate {selected.length || 0} image{selected.length === 1 ? "" : "s"}
            </button>
          </Card>

          <Card className="space-y-3 border-primary/40 bg-primary/5 p-6">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Layers className="h-4 w-4" /> $25/day Boost Pack
            </p>
            <p className="text-sm text-muted-foreground">
              One pass, all three ratios. Your $25/day boost rides the video on one platform — these
              images cover every other surface free, so no placement sits empty.
            </p>
            <button
              type="button"
              data-testid="generate-boost-pack"
              disabled={busy}
              onClick={() => {
                setSelected(["9:16", "1:1", "16:9"]);
                start(["9:16", "1:1", "16:9"]);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Generate all 3 ratios
            </button>
          </Card>
        </div>

        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Canvas
          </p>
          {frames.length === 0 ? (
            <div className="mt-4 grid min-h-[320px] place-items-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
              Pick a product and a ratio — renders land here.
            </div>
          ) : (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {frames.map((f) => (
                <FrameCard key={f.ratio} frame={f} />
              ))}
            </div>
          )}
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Image library</h2>
        {gallery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : gallery.data?.length ? (
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {gallery.data.map((g) => (
              <Card key={g.id} className="overflow-hidden p-0">
                <div className="bg-secondary">
                  {g.url ? (
                    <img
                      src={g.url}
                      alt={`Generated ${g.ratio} ad creative`}
                      loading="lazy"
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="h-40" />
                  )}
                </div>
                <div className="flex items-center justify-between p-2 text-xs">
                  <Badge variant="secondary">{g.ratio}</Badge>
                  <span className="font-mono tabular-nums text-muted-foreground">{g.size}</span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
            No ad images yet.
          </Card>
        )}
      </section>
    </div>
  );
}

function FrameCard({ frame }: { frame: Frame }) {
  const aspect =
    frame.ratio === "1:1"
      ? "aspect-square"
      : frame.ratio === "9:16"
        ? "aspect-[9/16]"
        : "aspect-video";
  return (
    <div className="space-y-2" data-testid={`frame-${frame.ratio.replace(":", "-")}`}>
      <div className="flex items-center justify-between">
        <Badge variant={frame.status === "ready" ? "default" : "secondary"}>{frame.ratio}</Badge>
        <span className="text-xs text-muted-foreground">{frame.status}</span>
      </div>
      <div className={cn("overflow-hidden rounded-2xl bg-secondary", aspect)}>
        {frame.url ? (
          <img
            src={frame.url}
            alt={`Generated ${frame.ratio} ad creative`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-xs text-secondary-foreground/60">
            {frame.status === "failed" ? (
              <span className="px-4 text-center text-destructive">{frame.error}</span>
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
          </div>
        )}
      </div>
      {frame.url && (
        <div className="flex gap-2">
          <a
            href={frame.url}
            download={`ad-${frame.ratio.replace(":", "x")}.png`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </a>
          <button
            type="button"
            onClick={async () => {
              try {
                await copyImage(frame.url!);
                toast.success("Image copied");
              } catch {
                toast.error("Copy not supported here — use Download");
              }
            }}
            className="flex items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 text-xs transition-colors hover:bg-card"
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
        </div>
      )}
    </div>
  );
}
