import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createWorkflow, listWorkflows } from "@/lib/workflows.functions";
import { Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/campaigns/")({
  component: CampaignsIndex,
  head: () => ({
    meta: [
      { title: "Campaigns — Echo Your Influence" },
      {
        name: "description",
        content:
          "Run one resumable campaign from product brief to strategy, content, outbound and publishing.",
      },
    ],
  }),
});

const STEP_LABEL = [
  "Product brief",
  "Strategy",
  "Content pack",
  "Outbound",
  "Publishing",
  "Analytics",
];

function CampaignsIndex() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const list = useServerFn(listWorkflows);
  const create = useServerFn(createWorkflow);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const workflows = useQuery({ queryKey: ["workflows"], queryFn: () => list() });

  const start = useMutation({
    mutationFn: () =>
      create({ data: { name: name.trim(), source_url: url.trim() ? url.trim() : null } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      navigate({ to: "/campaigns/$id", params: { id: res.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold">Campaigns</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One campaign connects product → strategy → content kit → outbound → publishing → report.
          Leave any time; every step is saved.
        </p>
      </header>

      <Card className="max-w-2xl space-y-4 p-6">
        <div>
          <Label htmlFor="wf-name">Campaign name</Label>
          <Input
            id="wf-name"
            data-testid="workflow-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Spring launch — trail runners"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="wf-url">Product URL (optional)</Label>
          <Input
            id="wf-url"
            data-testid="workflow-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1"
          />
        </div>
        <Button
          data-testid="create-workflow"
          disabled={name.trim().length < 2 || start.isPending}
          onClick={() => start.mutate()}
        >
          {start.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Rocket className="mr-2 h-4 w-4" />
          )}
          Launch campaign
        </Button>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {workflows.isLoading ? (
          <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
        ) : workflows.data?.length ? (
          workflows.data.map((w) => (
            <Link
              key={w.id}
              to="/campaigns/$id"
              params={{ id: w.id }}
              data-testid={`workflow-${w.id}`}
              className="rounded-2xl border border-border bg-card p-4 transition-transform hover:-translate-y-1"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-sm font-medium">{w.name}</p>
                <Badge variant="secondary">{w.status}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Step {w.current_step} · {STEP_LABEL[(w.current_step ?? 1) - 1] ?? "—"}
              </p>
            </Link>
          ))
        ) : (
          <Card className="border-dashed p-8 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
            No campaigns yet.
          </Card>
        )}
      </div>
    </div>
  );
}
