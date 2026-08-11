import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, PieChart as PieIcon } from "lucide-react";
import { generateChannelPlan } from "@/lib/workflows.functions";

export interface Channel {
  platform: string;
  priority: "primary" | "support" | "test";
  format: string;
  engine: "avatar" | "broll" | "image" | "text";
  cadence: string;
  hook_style: string;
  why: string;
  budget_share: number;
  weekly_dollars: number;
  organic: boolean;
}
export interface Plan {
  weekly_budget: number;
  channels: Channel[];
  notes: string[];
  generated_at: string;
}

const SLICE = [
  "hsl(var(--primary))",
  "var(--color-sand, #c9b99a)",
  "#8a7a5c",
  "#d6a77a",
  "#6f6455",
];

const ENGINE_LABEL: Record<Channel["engine"], string> = {
  avatar: "Avatar video (HeyGen)",
  broll: "Silent B-roll (MiniMax)",
  image: "Ad image engine",
  text: "Text / caption only",
};

export function MediaPlanBody({
  id,
  strategy,
  refresh,
}: {
  id: string;
  strategy:
    | { channel_plan?: unknown; weekly_budget?: number | null; positioning?: string | null }
    | null
    | undefined;
  refresh: () => void;
}) {
  const gen = useServerFn(generateChannelPlan);
  const plan = (strategy?.channel_plan as Plan | null | undefined) ?? null;
  const [budget, setBudget] = useState<string>(String(strategy?.weekly_budget ?? 175));

  const g = useMutation({
    mutationFn: () => gen({ data: { workflow_id: id, weekly_budget: Number(budget) || 0 } }),
    onSuccess: () => {
      refresh();
      toast.success("Media plan generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const paid = useMemo(() => (plan?.channels ?? []).filter((c) => c.budget_share > 0), [plan]);
  const organic = useMemo(() => (plan?.channels ?? []).filter((c) => c.budget_share === 0), [plan]);

  return (
    <div className="space-y-6">
      <Card className="max-w-2xl space-y-4 p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-44">
            <Label htmlFor="weekly-budget">Your weekly paid budget ($)</Label>
            <Input
              id="weekly-budget"
              data-testid="weekly-budget"
              inputMode="decimal"
              className="mt-1 font-mono tabular-nums"
              value={budget}
              onChange={(e) => setBudget(e.target.value.replace(/[^0-9.]/g, ""))}
            />
          </div>
          <Button data-testid="generate-media-plan" disabled={g.isPending} onClick={() => g.mutate()}>
            {g.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PieIcon className="mr-2 h-4 w-4" />
            )}
            {plan ? "Regenerate plan" : "Analyze & build plan"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {plan
            ? `Generated ${new Date(plan.generated_at).toLocaleString()}`
            : strategy?.positioning
              ? "Not generated yet."
              : "Approve the strategy first — the plan reads from it."}
        </p>
      </Card>

      {plan ? (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
            <Card className="p-6">
              <p className="text-sm font-medium">Where the budget goes</p>
              <p className="font-mono text-xs tabular-nums text-muted-foreground">
                ${plan.weekly_budget}/week · ${Math.round(plan.weekly_budget / 7)}/day
              </p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paid.map((c) => ({ name: c.platform, value: c.weekly_dollars }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {paid.map((c, i) => (
                        <Cell key={c.platform} fill={SLICE[i % SLICE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `$${v}/wk`} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {organic.length ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Covered organically at no ad spend: {organic.map((c) => c.platform).join(", ")}.
                </p>
              ) : null}
            </Card>

            <Card className="p-6">
              <p className="text-sm font-medium">Split by platform</p>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2">Platform</th>
                    <th>Role</th>
                    <th className="text-right">Share</th>
                    <th className="text-right">Weekly</th>
                    <th className="text-right">Daily</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.channels.map((c) => (
                    <tr key={c.platform} className="border-t border-border">
                      <td className="py-2 font-medium">{c.platform}</td>
                      <td className="capitalize text-muted-foreground">{c.priority}</td>
                      <td className="text-right font-mono tabular-nums">{c.budget_share}%</td>
                      <td className="text-right font-mono tabular-nums">
                        {c.budget_share ? `$${c.weekly_dollars}` : "organic"}
                      </td>
                      <td className="text-right font-mono tabular-nums">
                        {c.budget_share ? `$${Math.round(c.weekly_dollars / 7)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plan.channels.map((c) => (
              <Card
                key={c.platform}
                data-testid={`channel-card-${c.platform.toLowerCase().replace(/\s+/g, "-")}`}
                className="space-y-3 p-5 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-lg font-semibold">{c.platform}</p>
                  <Badge variant={c.priority === "primary" ? "default" : "secondary"} className="capitalize">
                    {c.priority}
                  </Badge>
                </div>
                <p className="font-mono text-xs tabular-nums text-muted-foreground">
                  {c.budget_share ? `$${c.weekly_dollars}/wk · ${c.budget_share}%` : "Organic — no ad spend"}
                </p>
                <dl className="space-y-2 text-sm">
                  <Row label="Format" value={c.format} />
                  <Row label="Made with" value={ENGINE_LABEL[c.engine]} />
                  <Row label="Cadence" value={c.cadence} />
                  <Row label="Hook style" value={c.hook_style} />
                </dl>
                <p className="text-sm text-muted-foreground">{c.why}</p>
                <div className="flex gap-2 pt-1">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/content">Plan the posts</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/studio">Make the asset</Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {plan.notes.length ? (
            <Card className="max-w-3xl space-y-2 p-6">
              <p className="text-sm font-medium">Planner notes</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {plan.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="flex-1">{value}</dd>
    </div>
  );
}
