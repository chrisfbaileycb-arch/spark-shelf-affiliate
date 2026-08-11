import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { AdImageGenerator } from "@/components/AdImageGenerator";
import { CampaignLauncher } from "@/components/CampaignLauncher";
import { listProducts } from "@/lib/products.functions";
import { listPersonas } from "@/lib/personas.functions";
import { generateBRollClip, generateVideo } from "@/lib/videos.functions";
import { Loader2, Video as VideoIcon, Image as ImageIcon, Layers, Film } from "lucide-react";

import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "Creative Studio — Echo Your Influence" },
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
            <VideoIcon className="h-4 w-4" /> AI Video Studio
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

type VideoMode = "avatar" | "broll";

function VideoPanel() {
  const navigate = useNavigate();
  const lp = useServerFn(listProducts);
  const lpe = useServerFn(listPersonas);
  const gv = useServerFn(generateVideo);
  const gb = useServerFn(generateBRollClip);
  const products = useQuery({ queryKey: ["products"], queryFn: () => lp() });
  const personas = useQuery({ queryKey: ["personas"], queryFn: () => lpe() });
  const [mode, setMode] = useState<VideoMode>("avatar");
  const [productId, setProductId] = useState("");
  const [personaId, setPersonaId] = useState("");
  const [duration, setDuration] = useState<15 | 30>(15);
  const [clipSeconds, setClipSeconds] = useState<6 | 10>(6);
  const [styleNote, setStyleNote] = useState("");

  const run = useMutation({
    mutationFn: () =>
      mode === "avatar"
        ? gv({
            data: {
              product_id: productId,
              duration_seconds: duration,
              ...(personaId ? { persona_id: personaId } : {}),
            },
          })
        : gb({
            data: {
              product_id: productId,
              duration_seconds: clipSeconds,
              ...(styleNote.trim() ? { style_note: styleNote.trim() } : {}),
            },
          }),
    onSuccess: (res) => {
      toast.success(mode === "avatar" ? "Avatar render started" : "B-roll render started");
      navigate({ to: "/videos/$id", params: { id: res.video_id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const modes: Array<{
    id: VideoMode;
    title: string;
    engine: string;
    blurb: string;
    icon: typeof VideoIcon;
  }> = [
    {
      id: "avatar",
      title: "AI Influencer Avatar",
      engine: "Powered by HeyGen",
      blurb: "Talking-head UGC with lip-sync, voiceover narration, and burned-in captions.",
      icon: VideoIcon,
    },
    {
      id: "broll",
      title: "Cinematic B-Roll & Motion Clip",
      engine: "Powered by MiniMax",
      blurb: "Silent 6–10s product motion and background b-roll. No voice, no captions.",
      icon: Film,
    },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="grid gap-3 sm:grid-cols-2" data-testid="video-mode-picker">
        {modes.map((m) => {
          const active = mode === m.id;
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              type="button"
              data-testid={`video-mode-${m.id}`}
              aria-pressed={active}
              onClick={() => setMode(m.id)}
              className={`rounded-2xl border p-5 text-left transition-transform hover:-translate-y-0.5 ${
                active
                  ? "border-primary bg-primary/5 shadow-pop"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <Icon className="h-5 w-5 text-primary" />
              <p className="mt-3 font-display text-lg">{m.title}</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {m.engine}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{m.blurb}</p>
            </button>
          );
        })}
      </div>

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

        {mode === "avatar" ? (
          <>
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
            <div>
              <label
                htmlFor="video-duration"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Length
              </label>
              <select
                id="video-duration"
                data-testid="video-duration-select"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) as 15 | 30)}
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm transition-colors hover:border-primary/50"
              >
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
              </select>
            </div>
          </>
        ) : (
          <>
            <div>
              <label
                htmlFor="broll-duration"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Clip length
              </label>
              <select
                id="broll-duration"
                data-testid="broll-duration-select"
                value={clipSeconds}
                onChange={(e) => setClipSeconds(Number(e.target.value) as 6 | 10)}
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm transition-colors hover:border-primary/50"
              >
                <option value={6}>6 seconds</option>
                <option value={10}>10 seconds</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="broll-style"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Art direction (optional)
              </label>
              <input
                id="broll-style"
                data-testid="broll-style-input"
                value={styleNote}
                onChange={(e) => setStyleNote(e.target.value)}
                maxLength={400}
                placeholder="e.g. warm morning light, marble counter, slow dolly-in"
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm transition-colors hover:border-primary/50"
              />
            </div>
          </>
        )}

        <button
          type="button"
          data-testid="generate-video"
          disabled={!productId || run.isPending}
          onClick={() => run.mutate()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {run.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === "avatar" ? (
            <VideoIcon className="h-4 w-4" />
          ) : (
            <Film className="h-4 w-4" />
          )}
          {mode === "avatar"
            ? `Generate ${duration}-second avatar video`
            : `Generate ${clipSeconds}-second b-roll clip`}
        </button>
        <p className="text-xs text-muted-foreground">
          {mode === "avatar"
            ? "Avatar renders usually finish in 30–90 seconds. You'll land on the video page and it updates live."
            : "B-roll clips are silent by design — no voiceover or captions. Renders usually finish in 1–3 minutes."}
        </p>
      </Card>
    </div>
  );
}
