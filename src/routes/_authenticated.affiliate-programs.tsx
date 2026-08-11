import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPrograms, upsertProgram, deleteProgram } from "@/lib/affiliate.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/affiliate-programs")({
  head: () => ({
    meta: [
      { title: "Affiliate programs — Echo Your Influence" },
      {
        name: "description",
        content:
          "Manage your affiliate program IDs and tracking templates so every Echo Your Influence video points to your own payout links.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AffiliatePrograms,
});

const PRESETS = [
  {
    name: "Amazon Associates",
    network: "amazon-associates",
    link_template: "{url}?tag={tracking_id}",
  },
  { name: "TikTok Shop Affiliate", network: "tiktok-shop", link_template: "{url}" },
  {
    name: "AliExpress Portals",
    network: "aliexpress",
    link_template: "{url}?aff_id={tracking_id}",
  },
  {
    name: "Impact (generic)",
    network: "impact",
    link_template: "https://www.impact.com/c/{tracking_id}?u={url}",
  },
  {
    name: "ShareASale (generic)",
    network: "shareasale",
    link_template: "https://shareasale.com/r.cfm?b=0&u={tracking_id}&m=0&urllink={url}",
  },
];

function AffiliatePrograms() {
  const qc = useQueryClient();
  const lp = useServerFn(listPrograms);
  const up = useServerFn(upsertProgram);
  const dp = useServerFn(deleteProgram);
  const q = useQuery({ queryKey: ["programs"], queryFn: () => lp() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    network: "",
    tracking_id: "",
    link_template: "",
    notes: "",
  });

  const save = useMutation({
    mutationFn: () => up({ data: form }),
    onSuccess: () => {
      toast.success("Saved");
      setOpen(false);
      setForm({ name: "", network: "", tracking_id: "", link_template: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["programs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const del = useMutation({
    mutationFn: (id: string) => dp({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["programs"] });
    },
  });

  function applyPreset(p: (typeof PRESETS)[number]) {
    setForm((f) => ({ ...f, name: p.name, network: p.network, link_template: p.link_template }));
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Settings
          </p>
          <h1 className="mt-1 font-display text-4xl">Affiliate IDs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Store your tracking IDs once — we'll build tagged links for every video.
          </p>
        </div>
        <Button onClick={() => setOpen(!open)}>
          <Plus className="mr-2 h-4 w-4" /> Add
        </Button>
      </header>

      {open && (
        <Card className="space-y-4 p-6 shadow-pop">
          <div className="flex flex-wrap gap-2">
            <p className="w-full text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quick start
            </p>
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => applyPreset(p)}
                className="rounded-full border border-border bg-surface px-3 py-1 text-xs hover:bg-surface-muted"
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="My Amazon US"
              />
            </div>
            <div>
              <Label>Network</Label>
              <Input
                value={form.network}
                onChange={(e) => setForm({ ...form, network: e.target.value })}
                placeholder="amazon-associates"
              />
            </div>
            <div>
              <Label>Tracking ID</Label>
              <Input
                value={form.tracking_id}
                onChange={(e) => setForm({ ...form, tracking_id: e.target.value })}
                placeholder="yourname-20"
              />
            </div>
            <div>
              <Label>Link template</Label>
              <Input
                value={form.link_template}
                onChange={(e) => setForm({ ...form, link_template: e.target.value })}
                placeholder="{url}?tag={tracking_id}"
              />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Use <code>{"{url}"}</code> for the product URL and <code>{"{tracking_id}"}</code> for
            your ID.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Save
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {q.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {q.data.map((p) => (
            <Card key={p.id} className="space-y-2 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.network}</p>
                </div>
                <button
                  onClick={() => {
                    if (confirm("Delete?")) del.mutate(p.id);
                  }}
                  className="text-destructive hover:opacity-80"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs">
                <span className="text-muted-foreground">Tracking ID:</span>{" "}
                <code className="rounded bg-muted px-1 py-0.5">{p.tracking_id}</code>
              </p>
              <p className="break-all text-xs">
                <span className="text-muted-foreground">Template:</span>{" "}
                <code className="rounded bg-muted px-1 py-0.5">{p.link_template}</code>
              </p>
            </Card>
          ))}
        </div>
      ) : (
        !open && (
          <Card className="border-dashed p-10 text-center">
            <p className="font-display text-2xl">No affiliate IDs yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Once you store them here, every video you generate gets a tracked link in one click.
            </p>
            <Button className="mt-6" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add first ID
            </Button>
          </Card>
        )
      )}
    </div>
  );
}
