import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getCampaignKit, generateCampaignImage, updateCampaign } from "@/lib/campaigns.functions";
import { generateVideo } from "@/lib/videos.functions";
import { queueCampaignForPublishing } from "@/lib/publishing.functions";
import { attachCampaignVideo } from "@/lib/campaigns.functions";
import { buildUtmUrl, SLOT_LABEL } from "@/lib/utm";
import { Copy, Download, Loader2, Video as VideoIcon, Check } from "lucide-react";
import { toast } from "sonner";

const RATIOS = [
  { id: "1:1" as const, label: "Feed 1:1" },
  { id: "9:16" as const, label: "Stories / Reels 9:16" },
  { id: "16:9" as const, label: "Landscape 16:9" },
];

export function CampaignKitDrawer({
  campaignId,
  open,
  onOpenChange,
}: {
  campaignId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const kitFn = useServerFn(getCampaignKit);
  const genImg = useServerFn(generateCampaignImage);
  const genVid = useServerFn(generateVideo);
  const attach = useServerFn(attachCampaignVideo);
  const patch = useServerFn(updateCampaign);
  const [copied, setCopied] = useState<string | null>(null);

  const kit = useQuery({
    queryKey: ["campaign-kit", campaignId],
    queryFn: () => kitFn({ data: { id: campaignId! } }),
    enabled: !!campaignId && open,
  });

  const campaign = kit.data?.campaign as
    | (Record<string, unknown> & {
        id: string;
        name: string;
        headline: string | null;
        primary_text: string | null;
        ad_description: string | null;
        destination_url: string | null;
        utm_source: string | null;
        utm_medium: string | null;
        utm_campaign: string | null;
        product_id: string | null;
        video_id: string | null;
        videos?: { id: string; status: string; video_url: string | null } | null;
      })
    | undefined;
  const assets = kit.data?.assets ?? [];

  const image = useMutation({
    mutationFn: (ratio: "1:1" | "9:16" | "16:9") =>
      genImg({ data: { campaign_id: campaignId!, ratio, with_overlay: true } }),
    onSuccess: () => {
      toast.success("Creative rendered");
      qc.invalidateQueries({ queryKey: ["campaign-kit", campaignId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const video = useMutation({
    mutationFn: async (seconds: 15 | 30) => {
      const res = await genVid({
        data: { product_id: campaign!.product_id!, duration_seconds: seconds },
      });
      await attach({ data: { campaign_id: campaignId!, video_id: res.video_id } });
      return res;
    },
    onSuccess: () => {
      toast.success("Video render started");
      qc.invalidateQueries({ queryKey: ["campaign-kit", campaignId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function copy(text: string, key: string) {
    void navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
    toast.success("Copied");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        data-testid="campaign-kit-drawer"
        className="w-full overflow-y-auto sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">
            {campaign?.name ?? "Campaign kit"}
          </SheetTitle>
          <SheetDescription>
            Every ratio, the ad copy, and your tracked link — download and post.
          </SheetDescription>
        </SheetHeader>

        {kit.isLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading kit…</p>
        ) : !campaign ? null : (
          <div className="mt-6 space-y-8 pb-16">
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ad copy
              </h3>
              {(
                [
                  ["Headline (40)", campaign.headline],
                  ["Primary text (125)", campaign.primary_text],
                  ["Description (30)", campaign.ad_description],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <button
                      type="button"
                      data-testid={`copy-${label.split(" ")[0]?.toLowerCase()}`}
                      onClick={() => copy(value ?? "", label)}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={`Copy ${label}`}
                    >
                      {copied === label ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-sm">{value || "—"}</p>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tracked link
              </h3>
              <div className="grid gap-2 sm:grid-cols-3">
                {(["utm_source", "utm_medium", "utm_campaign"] as const).map((f) => (
                  <div key={f}>
                    <Label htmlFor={f} className="text-xs">
                      {f}
                    </Label>
                    <Input
                      id={f}
                      defaultValue={(campaign[f] as string) ?? ""}
                      onBlur={(e) =>
                        patch({ data: { id: campaign.id, [f]: e.target.value } }).then(() =>
                          qc.invalidateQueries({ queryKey: ["campaign-kit", campaignId] }),
                        )
                      }
                      className="mt-1"
                    />
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="break-all font-mono text-xs tabular-nums">
                  {buildUtmUrl(campaign, SLOT_LABEL["1:1"]) || "Add a destination URL"}
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  data-testid="copy-tracked-link"
                  onClick={() => copy(buildUtmUrl(campaign, SLOT_LABEL["1:1"]), "link")}
                >
                  <Copy className="mr-2 h-3.5 w-3.5" /> Copy link
                </Button>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Creatives
              </h3>
              <div className="flex flex-wrap gap-2">
                {RATIOS.map((r) => (
                  <Button
                    key={r.id}
                    size="sm"
                    variant="secondary"
                    data-testid={`render-${r.id.replace(":", "-")}`}
                    disabled={image.isPending}
                    onClick={() => image.mutate(r.id)}
                  >
                    {image.isPending && image.variables === r.id ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    {r.label}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {assets.map((a) => (
                  <figure key={a.id} className="overflow-hidden rounded-xl border border-border">
                    {a.url ? (
                      <img
                        src={a.url}
                        alt={`${a.ratio} ad creative${a.headline ? `: ${a.headline}` : ""}`}
                        className="w-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    <figcaption className="flex items-center justify-between p-2 text-xs">
                      <Badge variant="secondary">{a.ratio}</Badge>
                      {a.url ? (
                        <a
                          href={a.url}
                          download
                          className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Download className="h-3.5 w-3.5" /> Save
                        </a>
                      ) : null}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Video
              </h3>
              {campaign.videos?.video_url ? (
                <video
                  src={campaign.videos.video_url}
                  controls
                  className="w-full rounded-xl border border-border"
                />
              ) : campaign.video_id ? (
                <p className="text-sm text-muted-foreground">
                  Rendering… status: {campaign.videos?.status ?? "queued"}
                </p>
              ) : (
                <div className="flex gap-2">
                  {([15, 30] as const).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      data-testid={`render-video-${s}`}
                      disabled={video.isPending || !campaign.product_id}
                      onClick={() => video.mutate(s)}
                    >
                      {video.isPending ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <VideoIcon className="mr-2 h-3.5 w-3.5" />
                      )}
                      {s}s avatar video
                    </Button>
                  ))}
                </div>
              )}
            </section>

            <SendToPublishing campaignId={campaign.id} hasVideo={!!campaign.videos?.video_url} />
          </div>

        )}
      </SheetContent>
    </Sheet>
  );
}

const HANDOFF_PLATFORMS = [
  { id: "tiktok" as const, label: "TikTok" },
  { id: "instagram" as const, label: "Instagram Reel" },
  { id: "youtube" as const, label: "YouTube Short" },
  { id: "linkedin" as const, label: "LinkedIn" },
];

function SendToPublishing({ campaignId, hasVideo }: { campaignId: string; hasVideo: boolean }) {
  const queueFn = useServerFn(queueCampaignForPublishing);
  const [platforms, setPlatforms] = useState<string[]>(["tiktok", "instagram"]);
  const [when, setWhen] = useState("");

  const send = useMutation({
    mutationFn: () =>
      queueFn({
        data: {
          campaign_id: campaignId,
          platforms: platforms as ("tiktok" | "instagram" | "youtube" | "linkedin")[],
          scheduled_at: when ? new Date(when).toISOString() : null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        },
      }),
    onSuccess: () => toast.success("Queued in the publishing portal"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="space-y-3" data-testid="send-to-publishing">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Send to publishing
      </h3>
      <p className="text-xs text-muted-foreground">
        Schedules the hand-off. At the due time you tap Post now and pick the app from your
        device&apos;s share menu — Echo Your Influence never posts for you.
      </p>
      <div className="flex flex-wrap gap-2">
        {HANDOFF_PLATFORMS.map((p) => {
          const on = platforms.includes(p.id);
          return (
            <Button
              key={p.id}
              type="button"
              size="sm"
              variant={on ? "default" : "outline"}
              data-testid={`platform-${p.id}`}
              onClick={() =>
                setPlatforms((cur) =>
                  cur.includes(p.id) ? cur.filter((x) => x !== p.id) : [...cur, p.id],
                )
              }
            >
              {p.label}
            </Button>
          );
        })}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="h-9 text-xs"
          data-testid="handoff-schedule"
        />
        <Button
          size="sm"
          disabled={send.isPending || platforms.length === 0 || !hasVideo}
          onClick={() => send.mutate()}
          data-testid="queue-campaign"
        >
          {send.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
          Add to queue
        </Button>
      </div>
      {!hasVideo ? (
        <p className="text-xs text-muted-foreground">
          Render the video first — a variant is only &ldquo;Ready to post&rdquo; once the mp4
          exists.
        </p>
      ) : null}
    </section>
  );
}
