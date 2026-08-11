import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createWorkflow, getWorkflow, listWorkflows } from "@/lib/workflows.functions";
import type { WorkflowData } from "./steps";

const STORAGE_KEY = "eyi.active-workflow";

const MODULES = [
  { to: "/intake", label: "1. What you're selling" },
  { to: "/strategy", label: "2. Strategy" },
  { to: "/plan", label: "3. Budget & channels" },
  { to: "/content", label: "4. Content by platform" },
  { to: "/publishing", label: "5. Publish" },
] as const;

/** Remembers which campaign every module page is working on. */
export function useActiveWorkflowId() {
  const list = useServerFn(listWorkflows);
  const workflows = useQuery({ queryKey: ["workflows"], queryFn: () => list() });
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const rows = workflows.data ?? [];
    if (stored && rows.some((w) => w.id === stored)) setId(stored);
    else if (rows.length) setId(rows[0]!.id);
    else setId(null);
  }, [workflows.data]);

  const choose = (next: string) => {
    setId(next);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, next);
  };

  return { id, choose, workflows };
}

interface ShellProps {
  title: string;
  description: string;
  children: (ctx: { id: string; data: WorkflowData; refresh: () => void }) => ReactNode;
}

/**
 * Shared chrome for the standalone modules: campaign picker, module tabs, and
 * the loaded workflow. Nothing is shown as done that the data does not support.
 */
export function ModuleShell({ title, description, children }: ShellProps) {
  const { id, choose, workflows } = useActiveWorkflowId();
  const qc = useQueryClient();
  const load = useServerFn(getWorkflow);
  const create = useServerFn(createWorkflow);
  const [newName, setNewName] = useState("");
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const wf = useQuery({
    queryKey: ["workflow", id],
    queryFn: () => load({ data: { id: id! } }),
    enabled: !!id,
  });

  const make = useMutation({
    mutationFn: () => create({ data: { name: newName.trim() } }),
    onSuccess: async (r) => {
      setNewName("");
      await qc.invalidateQueries({ queryKey: ["workflows"] });
      choose(r.id);
      toast.success("Campaign created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {MODULES.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            data-testid={`module-${m.to.slice(1)}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              pathname === m.to
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:border-primary/50"
            }`}
          >
            {m.label}
          </Link>
        ))}
      </nav>

      <Card className="flex flex-wrap items-center gap-2 p-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Working on
        </span>
        {(workflows.data ?? []).map((w) => (
          <Button
            key={w.id}
            size="sm"
            variant={w.id === id ? "default" : "outline"}
            data-testid={`pick-campaign-${w.id}`}
            onClick={() => choose(w.id)}
          >
            {w.name}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Input
            className="h-9 w-48"
            placeholder="New campaign name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            data-testid="new-campaign-name"
          />
          <Button
            size="sm"
            variant="outline"
            data-testid="create-campaign"
            disabled={newName.trim().length < 2 || make.isPending}
            onClick={() => make.mutate()}
          >
            {make.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
          </Button>
        </div>
      </Card>

      {!id ? (
        <Card className="max-w-xl p-6 text-sm text-muted-foreground">
          Create a campaign above to start. Everything in these modules works on one campaign at a
          time.
        </Card>
      ) : wf.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading campaign…</p>
      ) : wf.error ? (
        <Card className="max-w-xl p-6 text-sm">
          <p className="font-medium">This campaign could not be opened.</p>
          <p className="mt-1 text-muted-foreground">{(wf.error as Error).message}</p>
        </Card>
      ) : (
        children({
          id,
          data: wf.data!,
          refresh: () => qc.invalidateQueries({ queryKey: ["workflow", id] }),
        })
      )}
    </div>
  );
}
