import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import {
  attachCampaignKit,
  generateContentPack,
  generateStrategy,
  getCampaignAnalytics,
  getWorkflow,
  ingestBriefFromUrl,
  saveBrief,
  saveStrategy,
} from "@/lib/workflows.functions";
import {
  enrichLeads,
  enrollLeads,
  generateSequenceCopy,
  getApolloStatus,
  listApolloSendingOptions,
  previewApolloSearch,
  probeApolloCapabilities,
  pushSequenceToApollo,
  qualifyLeads,
  saveOutboundFilters,
  saveSequenceDraft,
  sourceLeads,
  validateApolloCredential,
} from "@/lib/outbound/apollo.functions";
import { listCampaigns } from "@/lib/campaigns.functions";
import { queueCampaignForPublishing } from "@/lib/publishing.functions";
import {
  BriefStep,
  ContentStep,
  StrategyStep,
  type StepProps,
  type WorkflowData,
} from "@/components/campaign/steps";

export const Route = createFileRoute("/_authenticated/campaigns/$id")({
  component: CampaignWizard,
  head: () => ({
    meta: [
      { title: "Campaign workspace — Echo Your Influence" },
      {
        name: "description",
        content: "Resumable campaign: brief, strategy, content, outbound pipeline, publishing and a fact-based report.",
      },
    ],
  }),
});

const STEPS = [
  "Product brief",
  "Strategy",
  "Content pack",
  "Outbound",
  "Publishing",
  "Analytics",
] as const;

function CampaignWizard() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const load = useServerFn(getWorkflow);
  const [step, setStep] = useState(1);

  const wf = useQuery({ queryKey: ["workflow", id], queryFn: () => load({ data: { id } }) });

  useEffect(() => {
    if (wf.data?.workflow?.current_step) setStep(wf.data.workflow.current_step);
  }, [wf.data?.workflow?.current_step]);

  if (wf.isLoading) return <p className="text-sm text-muted-foreground">Loading campaign…</p>;
  if (wf.error)
    return (
      <Card className="max-w-xl p-6 text-sm">
        <p className="font-medium">This campaign could not be opened.</p>
        <p className="mt-1 text-muted-foreground">{(wf.error as Error).message}</p>
      </Card>
    );
  const data = wf.data!;
  const refresh = () => qc.invalidateQueries({ queryKey: ["workflow", id] });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link to="/campaigns" className="text-xs text-muted-foreground hover:text-foreground">
          ← All campaigns
        </Link>
        <h1 className="font-display text-3xl font-semibold">{data.workflow.name}</h1>
      </header>

      <nav className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            data-testid={`wizard-step-${i + 1}`}
            onClick={() => setStep(i + 1)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              step === i + 1
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:border-primary/50"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
        <Link
          to="/media-plan/$id"
          params={{ id }}
          data-testid="open-media-plan"
          className="rounded-full border border-primary/50 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary/10"
        >
          Media plan &amp; budget split →
        </Link>
      </nav>


      {step === 1 && <BriefStep id={id} data={data} refresh={refresh} />}
      {step === 2 && <StrategyStep id={id} data={data} refresh={refresh} />}
      {step === 3 && <ContentStep id={id} data={data} refresh={refresh} />}
      {step === 4 && <OutboundStep id={id} data={data} refresh={refresh} />}
      {step === 5 && <PublishingStep data={data} />}
      {step === 6 && <AnalyticsStep id={id} />}
    </div>
  );
}

// Steps 1–3 now live in src/components/campaign/steps.tsx so the standalone
// /intake, /strategy and /content pages share the exact same UI.

// --- Step 4 -----------------------------------------------------------------

function OutboundStep({ id, data, refresh }: StepProps) {
  const status = useQuery({ queryKey: ["apollo-status"], queryFn: useServerFn(getApolloStatus) });
  const validate = useServerFn(validateApolloCredential);
  const probe = useServerFn(probeApolloCapabilities);
  const saveFilters = useServerFn(saveOutboundFilters);
  const preview = useServerFn(previewApolloSearch);
  const source = useServerFn(sourceLeads);
  const qualify = useServerFn(qualifyLeads);
  const enrich = useServerFn(enrichLeads);
  const genSeq = useServerFn(generateSequenceCopy);
  const saveSeq = useServerFn(saveSequenceDraft);
  const push = useServerFn(pushSequenceToApollo);
  const enroll = useServerFn(enrollLeads);
  const options = useServerFn(listApolloSendingOptions);

  const stored = (data.outbound?.icp_filters ?? {}) as Record<string, unknown>;
  const [titles, setTitles] = useState(((stored["titles"] as string[]) ?? []).join(", "));
  const [locations, setLocations] = useState(((stored["locations"] as string[]) ?? []).join(", "));
  const [keywords, setKeywords] = useState((stored["keywords"] as string) ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmCredits, setConfirmCredits] = useState(false);
  const [seqSteps, setSeqSteps] = useState<Array<{ step_number: number; subject: string; body: string; delay_days: number }>>([]);
  const [emailAccount, setEmailAccount] = useState("");
  const [capabilities, setCapabilities] = useState<Array<{ id: string; label: string; state: string; detail: string }>>([]);
  const [previewRows, setPreviewRows] = useState<Array<{ name: string | null; title: string | null; organization: string | null }>>([]);

  const filters = useMemo(
    () => ({
      titles: titles.split(",").map((s) => s.trim()).filter(Boolean),
      locations: locations.split(",").map((s) => s.trim()).filter(Boolean),
      industries: [],
      employeeRanges: [],
      keywords,
    }),
    [titles, locations, keywords],
  );

  const sendOptions = useQuery({
    queryKey: ["apollo-send-options"],
    queryFn: () => options({}),
    enabled: status.data?.truthStatus === "connected" || status.data?.truthStatus === "working",
  });

  const run = <T,>(fn: () => Promise<T>, onOk?: (r: T) => void) =>
    fn()
      .then((r) => {
        const res = r as unknown as { ok?: boolean; message?: string };
        if (res && res.ok === false) toast.error(res.message ?? "That call failed.");
        else onOk?.(r);
      })
      .catch((e: Error) => toast.error(e.message));

  const st = status.data;

  return (
    <div className="max-w-4xl space-y-4">
      <Card className="space-y-3 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Apollo.io</p>
            <p className="text-xs text-muted-foreground">
              {st?.maskedHint ? `Key ${st.maskedHint} · ` : "No key saved · "}
              {st?.lastValidatedAt
                ? `Last validated ${new Date(st.lastValidatedAt).toLocaleString()}`
                : "Never validated"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={st?.truthStatus === "working" ? "default" : "secondary"}>
              {st?.truthStatus ?? "…"}
            </Badge>
            <Button
              size="sm"
              data-testid="validate-apollo"
              onClick={() => run(() => validate({}), () => { status.refetch(); toast.success("Apollo key validated"); })}
            >
              Validate Apollo key
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => run(() => probe({}), (r) => setCapabilities(r.capabilities))}
            >
              Probe capabilities
            </Button>
          </div>
        </div>
        {st?.lastError ? (
          <p className="flex items-start gap-2 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5" /> {st.lastError}
          </p>
        ) : null}
        {st?.truthStatus !== "working" ? (
          <p className="text-xs text-muted-foreground">
            "Working" is only set automatically once every step of a real end-to-end test run passes.
            No manual override exists.
          </p>
        ) : null}
        {capabilities.length ? (
          <ul className="space-y-1 text-xs">
            {capabilities.map((c) => (
              <li key={c.id} className="flex gap-2">
                <Badge variant={c.state === "supported" ? "default" : "secondary"}>{c.state}</Badge>
                <span className="font-medium">{c.label}</span>
                <span className="text-muted-foreground">{c.detail}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <Separator />
        <div className="grid gap-1 text-xs sm:grid-cols-3">
          {st?.steps.map((s) => (
            <div key={s.step} className="flex items-center gap-2">
              {s.status === "passed" ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : (
                <span className="h-3.5 w-3.5 rounded-full border border-border" />
              )}
              <span className={s.status === "passed" ? "" : "text-muted-foreground"}>{s.step}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3 p-6">
        <p className="text-sm font-medium">Search filters</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Titles (comma separated)</Label>
            <Input className="mt-1" value={titles} onChange={(e) => setTitles(e.target.value)} />
          </div>
          <div>
            <Label>Locations</Label>
            <Input className="mt-1" value={locations} onChange={(e) => setLocations(e.target.value)} />
          </div>
          <div>
            <Label>Keywords</Label>
            <Input className="mt-1" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          People search costs 0 Apollo credits and returns no email or phone numbers. Emails require
          the separate enrichment step, which can consume your Apollo credits.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => run(() => saveFilters({ data: { workflow_id: id, filters } }), () => toast.success("Filters saved"))}>
            Save filters
          </Button>
          <Button size="sm" variant="outline" data-testid="preview-search" onClick={() => run(() => preview({ data: { filters } }), (r) => setPreviewRows(r.people))}>
            Preview search
          </Button>
          <Button size="sm" data-testid="source-leads" onClick={() => run(() => source({ data: { workflow_id: id, filters, pages: 1, perPage: 10 } }), (r) => { refresh(); toast.success(`${r.inserted} new leads (${r.seen} returned)`); })}>
            Source leads
          </Button>
          <Button size="sm" variant="outline" onClick={() => run(() => qualify({ data: { workflow_id: id } }), (r) => { refresh(); toast.success(`${r.scored} leads scored`); })}>
            Qualify with AI
          </Button>
        </div>
        {previewRows.length ? (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {previewRows.map((p, i) => (
              <li key={i}>
                {p.name} — {p.title} @ {p.organization} <span className="opacity-60">(no email until enrichment)</span>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <Card className="space-y-3 p-6">
        <p className="text-sm font-medium">Leads ({data.leads.length})</p>
        <div className="max-h-72 space-y-1 overflow-auto text-xs">
          {data.leads.map((l) => (
            <label key={l.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
              <Checkbox
                checked={selected.includes(l.id)}
                onCheckedChange={(v) =>
                  setSelected((prev) => (v ? [...prev, l.id] : prev.filter((x) => x !== l.id)))
                }
              />
              <span className="flex-1">
                <span className="font-medium">{l.full_name ?? "Unnamed"}</span> — {l.title ?? "—"} @{" "}
                {l.company ?? "—"}
              </span>
              <span className="text-muted-foreground">{l.email ?? "no email yet"}</span>
              <Badge variant="secondary">
                {l.qualification_score == null ? "unscored" : `${l.qualification_score}`}
              </Badge>
              <Badge variant="secondary">{l.status}</Badge>
            </label>
          ))}
          {!data.leads.length ? <p className="text-muted-foreground">No leads sourced yet.</p> : null}
        </div>
        <label className="flex items-start gap-2 text-xs">
          <Checkbox checked={confirmCredits} onCheckedChange={(v) => setConfirmCredits(Boolean(v))} />
          <span>
            I understand enrichment can consume up to {selected.length} Apollo credits (one per
            selected lead) on my own Apollo plan.
          </span>
        </label>
        <Button
          size="sm"
          data-testid="enrich-leads"
          disabled={!confirmCredits || selected.length === 0}
          onClick={() =>
            run(
              () => enrich({ data: { workflow_id: id, leadIds: selected, confirmCreditUse: true } }),
              (r) => { refresh(); toast.success(`${r.enriched} emails found`); },
            )
          }
        >
          Enrich selected
        </Button>
      </Card>

      <Card className="space-y-3 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Email sequence</p>
          <Button size="sm" variant="outline" onClick={() => run(() => genSeq({ data: { workflow_id: id } }), (r) => setSeqSteps(r))}>
            Draft with AI
          </Button>
        </div>
        {seqSteps.map((s, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-border p-3">
            <Input
              value={s.subject}
              onChange={(e) =>
                setSeqSteps((prev) => prev.map((x, j) => (j === i ? { ...x, subject: e.target.value } : x)))
              }
            />
            <Textarea
              rows={4}
              value={s.body}
              onChange={(e) =>
                setSeqSteps((prev) => prev.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))
              }
            />
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!seqSteps.length}
            onClick={() =>
              run(
                () => saveSeq({ data: { workflow_id: id, name: data.workflow.name, steps: seqSteps } }),
                () => { refresh(); toast.success("Sequence saved locally"); },
              )
            }
          >
            Save locally
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!data.sequences.length}
            onClick={() =>
              run(
                () => push({ data: { workflow_id: id, sequence_id: data.sequences[0]!.id } }),
                () => { refresh(); toast.success("Sequence created in Apollo (inactive)"); },
              )
            }
          >
            Push to Apollo (inactive)
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label>Sending email account</Label>
            <select
              className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm"
              value={emailAccount}
              onChange={(e) => setEmailAccount(e.target.value)}
            >
              <option value="">Select…</option>
              {(sendOptions.data?.accounts ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.email ?? a.id}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button
          size="sm"
          data-testid="enroll-leads"
          disabled={!emailAccount || !selected.length || !data.sequences.length}
          onClick={() =>
            run(
              () =>
                enroll({
                  data: {
                    workflow_id: id,
                    sequence_id: data.sequences[0]!.id,
                    leadIds: selected,
                    email_account_id: emailAccount,
                    confirmEnroll: true,
                  },
                }),
              (r) => { refresh(); toast.success(r.note ?? "Enrolled (paused)"); },
            )
          }
        >
          Enroll selected (paused for review)
        </Button>
        <p className="text-xs text-muted-foreground">
          Customer Zero: remote sequences are created inactive and enrollments land paused. Nothing
          is sent until you explicitly resume sending inside Apollo.
        </p>
      </Card>
    </div>
  );
}

// --- Step 5 -----------------------------------------------------------------

const PLATFORMS = ["tiktok", "instagram", "youtube", "facebook"] as const;

function PublishingStep({ data }: { data: WorkflowData }) {
  const queue = useServerFn(queueCampaignForPublishing);
  const [platforms, setPlatforms] = useState<string[]>(["tiktok"]);
  const [when, setWhen] = useState("");

  const m = useMutation({
    mutationFn: () =>
      queue({
        data: {
          campaign_id: data.workflow.campaign_id!,
          platforms: platforms as unknown as Array<(typeof PLATFORMS)[number]>,
          scheduled_at: when ? new Date(when).toISOString() : null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      }),
    onSuccess: (r) => toast.success(`${r.variants} variants queued`),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!data.workflow.campaign_id)
    return (
      <Card className="max-w-2xl p-6 text-sm text-muted-foreground">
        Link a rendered Campaign Kit in step 3 before scheduling. The Share Sheet queue only accepts
        posts with a real media asset and caption.
      </Card>
    );

  return (
    <Card className="max-w-2xl space-y-4 p-6">
      <p className="text-sm font-medium">Schedule to the Share Sheet queue</p>
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() =>
              setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
            }
            className={`rounded-full border px-3 py-1.5 text-xs capitalize transition-colors ${
              platforms.includes(p) ? "border-primary bg-primary text-primary-foreground" : "border-border"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <div>
        <Label htmlFor="sched">Scheduled time (optional)</Label>
        <Input id="sched" type="datetime-local" className="mt-1" value={when} onChange={(e) => setWhen(e.target.value)} />
      </div>
      <div className="flex items-center gap-3">
        <Button disabled={!platforms.length || m.isPending} onClick={() => m.mutate()}>
          Add to publishing queue
        </Button>
        <Link to="/publishing" className="text-sm underline">
          Open publishing queue →
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">
        Posting stays manual: the queue hands the file to your device share sheet, and only you can
        confirm a post actually went live.
      </p>
    </Card>
  );
}

// --- Step 6 -----------------------------------------------------------------

function AnalyticsStep({ id }: { id: string }) {
  const get = useServerFn(getCampaignAnalytics);
  const q = useQuery({ queryKey: ["analytics", id], queryFn: () => get({ data: { workflow_id: id } }) });
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading report…</p>;
  if (!q.data) return <p className="text-sm text-muted-foreground">No report yet.</p>;
  const a = q.data;

  return (
    <div className="max-w-3xl space-y-4">
      <MetricCard
        title="Social hand-off workflow"
        source={a.social.source}
        rows={[
          ["Prepared", a.social.prepared],
          ["Due", a.social.due],
          ["Handed off", a.social.handedOff],
          ["Manually confirmed posted", a.social.confirmedPosted],
          ["Skipped", a.social.skipped],
        ]}
      />
      <MetricCard
        title="Outbound pipeline"
        source={a.outbound.source}
        rows={[
          ["Sourced", a.outbound.sourced],
          ["Qualified", a.outbound.qualified],
          ["Rejected", a.outbound.rejected],
          ["Enriched", a.outbound.enriched],
          ["Contacts created", a.outbound.contactsCreated],
          ["Enrolled", a.outbound.enrolled],
          ["Paused enrollments", a.outbound.paused],
          ["Sent", a.outbound.sent],
          ["Replied", a.outbound.replied],
          ["Bounced", a.outbound.bounced],
          ["Unsubscribed", a.outbound.unsubscribed],
        ]}
      />
      <MetricCard
        title="Attribution"
        source={a.attribution.source}
        rows={[["Affiliate link clicks", a.attribution.clicks]]}
      />
      <p className="text-xs text-muted-foreground">
        Last synced {new Date(a.lastSyncAt).toLocaleString()}. No views, likes or impressions are
        shown: no validated analytics provider is connected, so those numbers do not exist here.
      </p>
    </div>
  );
}

function MetricCard({
  title,
  source,
  rows,
}: {
  title: string;
  source: string;
  rows: Array<[string, number]>;
}) {
  return (
    <Card className="space-y-3 p-6">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">Source: {source}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border p-3">
            <p className="font-mono text-xl tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
