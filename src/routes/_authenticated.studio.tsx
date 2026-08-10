import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { AdImageGenerator } from "@/components/AdImageGenerator";
import { listProducts } from "@/lib/products.functions";
import { listPersonas } from "@/lib/personas.functions";
import { generateVideo } from "@/lib/videos.functions";
import { Loader2, Video as VideoIcon, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "Creative Studio — Influencer Echo" },
      {
        name: "description",
        content:
          "Generate influencer-style videos and every-ratio ad images for your affiliate products in one place.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Studio,
});

function Studio() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Studio
        </p>
        <h1 className="mt-1 font-display text-4xl">Make the campaign</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          One URL in, a full campaign kit out — ad copy, creatives sized for every surface, and an
          avatar video, all tracked with your own UTMs.
        </p>
      </header>

      <Tabs defaultValue="campaign">
        <TabsList data-testid="studio-tabs">
          <TabsTrigger value="campaign" data-testid="tab-campaign" className="gap-2">
            <Layers className="h-4 w-4" /> Campaign Kit
          </TabsTrigger>
          <TabsTrigger value="video" data-testid="tab-video" className="gap-2">
            <VideoIcon className="h-4 w-4" /> AI Video Generator
          </TabsTrigger>
          <TabsTrigger value="image" data-testid="tab-image" className="gap-2">
            <ImageIcon className="h-4 w-4" /> AI Marketing Image Generator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaign" className="mt-6">
          <CampaignLauncher />
        </TabsContent>
        <TabsContent value="video" className="mt-6">
          <VideoPanel />
        </TabsContent>
        <TabsContent value="image" className="mt-6">
          <AdImageGenerator />
        </TabsContent>
      </Tabs>

    </div>
  );
}

function VideoPanel() {
  const navigate = useNavigate();
  const lp = useServerFn(listProducts);
  const lpe = useServerFn(listPersonas);
  const gv = useServerFn(generateVideo);
  const products = useQuery({ queryKey: ["products"], queryFn: () => lp() });
  const personas = useQuery({ queryKey: ["personas"], queryFn: () => lpe() });
  const [productId, setProductId] = useState("");
  const [personaId, setPersonaId] = useState("");

  const run = useMutation({
    mutationFn: () =>
      gv({
        data: { product_id: productId, ...(personaId ? { persona_id: personaId } : {}) },
      }),
    onSuccess: (res) => {
      toast.success("Rendering started");
      navigate({ to: "/videos/$id", params: { id: res.video_id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="max-w-xl space-y-4 p-6">
      <div>
        <label
          htmlFor="video-product"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Product
        </label>
        <select
          id="video-product"
          data-testid="video-product-select"
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
      </div>
      <div>
        <label
          htmlFor="video-persona"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Persona
        </label>
        <select
          id="video-persona"
          data-testid="video-persona-select"
          value={personaId}
          onChange={(e) => setPersonaId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm transition-colors hover:border-primary/50"
        >
          <option value="">Use my default persona</option>
          {personas.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        data-testid="generate-video"
        disabled={!productId || run.isPending}
        onClick={() => run.mutate()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {run.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <VideoIcon className="h-4 w-4" />
        )}
        Generate 15-second video
      </button>
      <p className="text-xs text-muted-foreground">
        Renders usually finish in 30–90 seconds. You&apos;ll land on the video page and it updates
        live.
      </p>
    </Card>
  );
}
