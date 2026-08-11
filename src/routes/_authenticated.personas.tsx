import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listPersonas,
  generatePersona,
  setDefaultPersona,
  deletePersona,
} from "@/lib/personas.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Star, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/personas")({
  head: () => ({
    meta: [
      { title: "Personas — Echo Your Influence" },
      {
        name: "description",
        content:
          "Design AI influencer personas with a unique voice, vibe, and catchphrases for every video you create.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PersonasPage,
});

type Traits = {
  name: string;
  gender: "female" | "male" | "nonbinary";
  age_range: "18-24" | "25-32" | "33-45" | "46-60";
  vibe: "energetic-genz" | "chill-millennial" | "authoritative-expert" | "warm-mom" | "edgy-cool";
  niche:
    | "lifestyle"
    | "tech"
    | "beauty"
    | "fitness"
    | "finance"
    | "home"
    | "fashion"
    | "food"
    | "parenting";
  voice_tone: "bubbly" | "calm" | "confident" | "warm" | "deadpan";
};

const DEFAULTS: Traits = {
  name: "",
  gender: "female",
  age_range: "25-32",
  vibe: "energetic-genz",
  niche: "lifestyle",
  voice_tone: "bubbly",
};

function PersonasPage() {
  const qc = useQueryClient();
  const lp = useServerFn(listPersonas);
  const gp = useServerFn(generatePersona);
  const sd = useServerFn(setDefaultPersona);
  const dp = useServerFn(deletePersona);

  const personas = useQuery({ queryKey: ["personas"], queryFn: () => lp() });
  const [traits, setTraits] = useState<Traits>(DEFAULTS);

  const genMut = useMutation({
    mutationFn: () => gp({ data: traits }),
    onSuccess: () => {
      toast.success("Persona created");
      setTraits(DEFAULTS);
      qc.invalidateQueries({ queryKey: ["personas"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const setDefaultMut = useMutation({
    mutationFn: (id: string) => sd({ data: { id } }),
    onSuccess: () => {
      toast.success("Default updated");
      qc.invalidateQueries({ queryKey: ["personas"] });
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => dp({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["personas"] });
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cast</p>
        <h1 className="mt-1 font-display text-4xl">Personas</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Your AI influencers. Each persona has its own voice, avatar, and personality — scripts are
          tailored to sound like them.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-3">
          {personas.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            personas.data?.map((p) => (
              <Card key={p.id} className="flex items-start gap-4 p-5">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-brand text-lg font-semibold text-primary-foreground">
                  {p.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg">{p.name}</h3>
                    {p.is_default && (
                      <Badge variant="default" className="gap-1">
                        <Star className="h-3 w-3" /> Default
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.gender} • {p.age_range} • {p.vibe} • {p.niche} • {p.voice_tone}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed">{p.bio}</p>
                  {Array.isArray(p.catchphrases) && p.catchphrases.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(p.catchphrases as string[]).map((c, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                        >
                          "{c}"
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {!p.is_default && (
                    <Button size="sm" variant="ghost" onClick={() => setDefaultMut.mutate(p.id)}>
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Delete ${p.name}?`)) delMut.mutate(p.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        <Card className="space-y-4 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Generator
            </p>
            <h2 className="mt-1 font-display text-2xl">Create a persona</h2>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={traits.name}
                onChange={(e) => setTraits({ ...traits, name: e.target.value })}
                placeholder="e.g. Sienna"
              />
            </div>

            {(
              [
                ["gender", ["female", "male", "nonbinary"]],
                ["age_range", ["18-24", "25-32", "33-45", "46-60"]],
                [
                  "vibe",
                  [
                    "energetic-genz",
                    "chill-millennial",
                    "authoritative-expert",
                    "warm-mom",
                    "edgy-cool",
                  ],
                ],
                [
                  "niche",
                  [
                    "lifestyle",
                    "tech",
                    "beauty",
                    "fitness",
                    "finance",
                    "home",
                    "fashion",
                    "food",
                    "parenting",
                  ],
                ],
                ["voice_tone", ["bubbly", "calm", "confident", "warm", "deadpan"]],
              ] as const
            ).map(([field, opts]) => (
              <div key={field}>
                <Label className="capitalize">{field.replace("_", " ")}</Label>
                <Select
                  value={traits[field]}
                  onValueChange={(v) => setTraits({ ...traits, [field]: v } as Traits)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {opts.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            <Button
              onClick={() => genMut.mutate()}
              disabled={genMut.isPending || !traits.name.trim()}
              className="w-full"
            >
              {genMut.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Generate persona
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
