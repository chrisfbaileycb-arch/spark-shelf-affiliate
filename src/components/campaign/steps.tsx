import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  attachCampaignKit,
  generateContentPack,
  generateStrategy,
  getWorkflow,
  ingestBriefFromUrl,
  saveBrief,
  saveStrategy,
} from "@/lib/workflows.functions";
import { listCampaigns } from "@/lib/campaigns.functions";

export type WorkflowData = Awaited<ReturnType<typeof getWorkflow>>;

export interface StepProps {
  id: string;
  data: WorkflowData;
  refresh: () => void;
}

export function Field({
  label,
  value,
  onChange,
  rows = 3,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  testId?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Textarea
        className="mt-1"
        rows={rows}
        value={value}
        data-testid={testId}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
        {items.map((h, i) => (
          <li key={i}>{h}</li>
        ))}
      </ul>
    </div>
  );
}

export function BriefStep({ id, data, refresh }: StepProps) {
  const save = useServerFn(saveBrief);
  const ingest = useServerFn(ingestBriefFromUrl);
  const brief = data.brief;
  const [offer, setOffer] = useState(brief?.offer ?? "");
  const [audience, setAudience] = useState(brief?.audience ?? "");
  const [proof, setProof] = useState(((brief?.proof_points as string[]) ?? []).join("\n"));
  const [constraints, setConstraints] = useState(brief?.constraints ?? "");
  const [url, setUrl] = useState(brief?.source_url ?? "");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const payload = (approve: boolean) => ({
    data: {
      workflow_id: id,
      offer,
      audience,
      proof_points: proof.split("\n").map((s) => s.trim()).filter(Boolean),
      constraints,
      source_url: url.trim() || null,
      product_id: brief?.product_id ?? null,
      approve,
    },
  });

  const m = useMutation({
    mutationFn: (approve: boolean) => save(payload(approve)),
    onSuccess: (r) => {
      setSavedAt(r.savedAt);
      refresh();
      toast.success("Brief saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ing = useMutation({
    mutationFn: () => ingest({ data: { workflow_id: id, url: url.trim(), asset_kind: "ecommerce" } }),
    onSuccess: (r) => {
      if (r.product) {
        setOffer(`${r.product.title}\n\n${r.product.description ?? ""}`.trim());
        setProof(r.angles.join("\n"));
      }
      refresh();
      toast.success("Page ingested");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="max-w-3xl space-y-4 p-6">
      <div>
        <Label htmlFor="brief-url">Product URL</Label>
        <div className="mt-1 flex gap-2">
          <Input id="brief-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          <Button
            variant="outline"
            data-testid="ingest-url"
            disabled={!url.trim() || ing.isPending}
            onClick={() => ing.mutate()}
          >
            {ing.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ingest"}
          </Button>
        </div>
      </div>
      <Field label="Offer" value={offer} onChange={setOffer} rows={5} testId="brief-offer" />
      <Field label="Audience" value={audience} onChange={setAudience} rows={3} testId="brief-audience" />
      <Field
        label="Proof points (one per line — real facts only)"
        value={proof}
        onChange={setProof}
        rows={4}
        testId="brief-proof"
      />
      <Field label="Constraints" value={constraints} onChange={setConstraints} rows={3} testId="brief-constraints" />
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" data-testid="save-brief" disabled={m.isPending} onClick={() => m.mutate(false)}>
          Save draft
        </Button>
        <Button data-testid="approve-brief" disabled={m.isPending || !offer.trim()} onClick={() => m.mutate(true)}>
          Approve &amp; continue
        </Button>
        <span className="text-xs text-muted-foreground">
          {savedAt
            ? `Saved ${new Date(savedAt).toLocaleTimeString()}`
            : brief?.approved_at
              ? "Approved"
              : "Not saved yet"}
        </span>
      </div>
    </Card>
  );
}

export function StrategyStep({ id, data, refresh }: StepProps) {
  const gen = useServerFn(generateStrategy);
  const save = useServerFn(saveStrategy);
  const s = data.strategy;
  const [positioning, setPositioning] = useState(s?.positioning ?? "");
  const [angles, setAngles] = useState(((s?.angles as string[]) ?? []).join("\n"));
  const [pillars, setPillars] = useState(((s?.pillars as string[]) ?? []).join("\n"));
  const [objections, setObjections] = useState(((s?.objections as string[]) ?? []).join("\n"));
  const [cta, setCta] = useState(s?.cta ?? "");

  const g = useMutation({
    mutationFn: () => gen({ data: { workflow_id: id } }),
    onSuccess: (r) => {
      setPositioning(r.positioning);
      setAngles(r.angles.join("\n"));
      setPillars(r.pillars.join("\n"));
      setObjections(r.objections.join("\n"));
      setCta(r.cta);
      refresh();
      toast.success("Strategy generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);
  const m = useMutation({
    mutationFn: (approve: boolean) =>
      save({
        data: {
          workflow_id: id,
          positioning,
          angles: lines(angles),
          pillars: lines(pillars),
          objections: lines(objections),
          cta,
          approve,
        },
      }),
    onSuccess: () => {
      refresh();
      toast.success("Strategy saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">ICP, positioning and angles</p>
          <p className="text-xs text-muted-foreground">
            {s?.generated_at
              ? `Generated ${new Date(s.generated_at).toLocaleString()} · ${s.model ?? ""}`
              : "Not generated yet"}
          </p>
        </div>
        <Button variant="outline" data-testid="generate-strategy" disabled={g.isPending} onClick={() => g.mutate()}>
          {g.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {s ? "Regenerate" : "Generate"}
        </Button>
      </div>
      {s?.icp ? (
        <pre className="max-h-56 overflow-auto rounded-xl bg-muted p-3 text-xs">
          {JSON.stringify(s.icp, null, 2)}
        </pre>
      ) : null}
      <Field label="Positioning" value={positioning} onChange={setPositioning} rows={4} testId="strategy-positioning" />
      <Field label="Campaign angles (one per line)" value={angles} onChange={setAngles} rows={4} />
      <Field label="Messaging pillars" value={pillars} onChange={setPillars} rows={4} />
      <Field label="Objections" value={objections} onChange={setObjections} rows={3} />
      <div>
        <Label>Primary CTA</Label>
        <Input className="mt-1" value={cta} onChange={(e) => setCta(e.target.value)} />
      </div>
      <div className="flex gap-3">
        <Button variant="outline" disabled={m.isPending} onClick={() => m.mutate(false)}>
          Save
        </Button>
        <Button
          data-testid="approve-strategy"
          disabled={m.isPending || !positioning.trim()}
          onClick={() => m.mutate(true)}
        >
          Approve &amp; continue
        </Button>
      </div>
    </Card>
  );
}

export function ContentStep({ id, data, refresh }: StepProps) {
  const gen = useServerFn(generateContentPack);
  const attach = useServerFn(attachCampaignKit);
  const list = useServerFn(listCampaigns);
  const kits = useQuery({ queryKey: ["campaigns"], queryFn: () => list() });
  const pack = data.contentPack;

  const g = useMutation({
    mutationFn: () => gen({ data: { workflow_id: id } }),
    onSuccess: () => {
      refresh();
      toast.success("Content pack generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const a = useMutation({
    mutationFn: (campaign_id: string) => attach({ data: { workflow_id: id, campaign_id } }),
    onSuccess: () => {
      refresh();
      toast.success("Campaign kit linked");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl space-y-4">
      <Card className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Hooks, scripts, captions, hashtags</p>
            <p className="text-xs text-muted-foreground">
              {pack?.generated_at ? `Generated ${new Date(pack.generated_at).toLocaleString()}` : "Not generated yet"}
            </p>
          </div>
          <Button variant="outline" data-testid="generate-content" disabled={g.isPending} onClick={() => g.mutate()}>
            {g.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {pack ? "Regenerate" : "Generate"}
          </Button>
        </div>
        {pack ? (
          <div className="space-y-3 text-sm">
            <ListBlock title="Hooks" items={(pack.hooks as string[]) ?? []} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scripts</p>
              {((pack.scripts as Array<{ title: string; script: string }>) ?? []).map((s, i) => (
                <div key={i} className="mt-2 rounded-xl border border-border p-3">
                  <p className="font-medium">{s.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{s.script}</p>
                </div>
              ))}
            </div>
            <ListBlock title="Captions (disclosure included)" items={(pack.captions as string[]) ?? []} />
            <ListBlock title="Hashtags" items={(pack.hashtags as string[]) ?? []} />
            {pack.email_angle ? (
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Email angle: </span>
                {pack.email_angle}
              </p>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card className="space-y-3 p-6">
        <p className="text-sm font-medium">Link a rendered Campaign Kit</p>
        <p className="text-xs text-muted-foreground">
          Render images and video in Studio, then link the kit here. Video state is read from the kit
          itself — nothing shows as ready without a playable file.
        </p>
        <div className="flex flex-wrap gap-2">
          {kits.data?.length ? (
            kits.data.map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={data.workflow.campaign_id === c.id ? "default" : "outline"}
                onClick={() => a.mutate(c.id)}
              >
                {c.name}
              </Button>
            ))
          ) : (
            <Link to="/studio" className="text-sm underline">
              Build a campaign kit in Studio →
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
