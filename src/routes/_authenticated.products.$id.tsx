import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProduct, deleteProduct } from "@/lib/products.functions";
import { generateVideo } from "@/lib/videos.functions";
import { listPersonas } from "@/lib/personas.functions";
import { listPrograms, createShortLink, listLinksForProduct } from "@/lib/affiliate.functions";
import { suggestNetworkForDomain } from "@/lib/affiliate-networks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, ExternalLink, Trash2, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_authenticated/products/$id")({
  head: () => ({
    meta: [
      { title: "Product — Echo Your Influence" },
      {
        name: "description",
        content: "Product details and video generation options for this Echo Your Influence item.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getP = useServerFn(getProduct);
  const delP = useServerFn(deleteProduct);
  const lp = useServerFn(listPrograms);
  const ll = useServerFn(listLinksForProduct);
  const csl = useServerFn(createShortLink);
  const gen = useServerFn(generateVideo);
  const lpers = useServerFn(listPersonas);

  const product = useQuery({ queryKey: ["product", id], queryFn: () => getP({ data: { id } }) });
  const programs = useQuery({ queryKey: ["programs"], queryFn: () => lp() });
  const links = useQuery({
    queryKey: ["links", id],
    queryFn: () => ll({ data: { product_id: id } }),
  });
  const personas = useQuery({ queryKey: ["personas"], queryFn: () => lpers() });

  const [programId, setProgramId] = useState<string>("none");
  const [personaId, setPersonaId] = useState<string>("");

  useEffect(() => {
    if (!personaId && personas.data?.length) {
      const def = personas.data.find((p) => p.is_default) ?? personas.data[0];
      setPersonaId(def.id);
    }
  }, [personas.data, personaId]);

  const generateMut = useMutation({
    mutationFn: () => gen({ data: { product_id: id, persona_id: personaId || undefined } }),
    onSuccess: (res) => {
      toast.success("Video generated!");
      navigate({ to: "/videos/$id", params: { id: res.video_id } });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Generation failed"),
  });

  const linkMut = useMutation({
    mutationFn: () =>
      csl({
        data: { product_id: id, affiliate_program_id: programId === "none" ? null : programId },
      }),
    onSuccess: () => {
      toast.success("Affiliate link created");
      qc.invalidateQueries({ queryKey: ["links", id] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed"),
  });

  if (product.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!product.data) return <p>Not found</p>;
  const p = product.data;
  const imgs = (p.images as string[] | null) ?? [];
  const suggested = p.source_domain ? suggestNetworkForDomain(p.source_domain) : null;

  return (
    <div className="space-y-8">
      <Link
        to="/products"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Products
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <header>
            <Badge variant="secondary">{p.source_domain}</Badge>
            <h1 className="mt-3 font-display text-4xl leading-tight">{p.title}</h1>
            {p.price ? (
              <p className="mt-2 text-2xl font-semibold text-primary">
                {p.price} {p.currency}
              </p>
            ) : null}
          </header>

          {imgs.length > 0 && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {imgs.slice(0, 4).map((src, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded-xl bg-muted">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {p.description && (
            <Card className="p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Summary
              </p>
              <p className="mt-2 leading-relaxed">{p.description}</p>
            </Card>
          )}

          <div className="flex gap-2">
            <a
              href={p.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              View original <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              onClick={async () => {
                if (!confirm("Delete this product?")) return;
                await delP({ data: { id } });
                navigate({ to: "/products" });
              }}
              className="ml-auto inline-flex items-center gap-1 text-sm text-destructive hover:underline"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <Card className="space-y-4 bg-gradient-brand p-6 text-primary-foreground shadow-pop">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                Ready to create?
              </p>
              <p className="mt-1 font-display text-2xl">Generate the 15s video</p>
              <p className="mt-1 text-sm opacity-80">AI script + influencer voiceover.</p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider opacity-80">
                Persona
              </label>
              <Select value={personaId} onValueChange={setPersonaId}>
                <SelectTrigger className="bg-background text-foreground">
                  <SelectValue placeholder="Pick a persona" />
                </SelectTrigger>
                <SelectContent>
                  {personas.data?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {p.vibe}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Link to="/personas" className="mt-1 block text-xs opacity-80 hover:opacity-100">
                Manage personas →
              </Link>
            </div>

            <Button
              onClick={() => generateMut.mutate()}
              disabled={generateMut.isPending || !personaId}
              size="lg"
              className="w-full bg-background text-foreground hover:bg-background/90"
            >
              {generateMut.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating (~30s)…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Generate video
                </>
              )}
            </Button>
          </Card>

          <Card className="space-y-3 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Affiliate link
            </p>
            {suggested && (
              <div className="rounded-lg bg-surface p-3 text-xs">
                Suggested network: <strong>{suggested.name}</strong>
                <a
                  href={suggested.signupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-primary hover:underline"
                >
                  sign up
                </a>
                <p className="mt-1 text-muted-foreground">{suggested.notes}</p>
              </div>
            )}
            <Select value={programId} onValueChange={setProgramId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick your affiliate ID" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No affiliate ID (raw URL)</SelectItem>
                {programs.data?.map((pg) => (
                  <SelectItem key={pg.id} value={pg.id}>
                    {pg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              onClick={() => linkMut.mutate()}
              disabled={linkMut.isPending}
              className="w-full"
            >
              {linkMut.isPending ? "…" : "Create tracked link"}
            </Button>

            {links.data?.length ? (
              <div className="space-y-2 border-t border-border pt-3">
                {links.data.map((l) => {
                  const short = `${typeof window !== "undefined" ? window.location.origin : ""}/r/${l.short_code}`;
                  return (
                    <div key={l.id} className="flex items-center gap-2 text-xs">
                      <code className="flex-1 truncate rounded bg-muted px-2 py-1">{short}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(short);
                          toast.success("Copied");
                        }}
                        className="rounded p-1 hover:bg-muted"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <span className="text-muted-foreground">{l.clicks} clicks</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
            <Link
              to="/affiliate-programs"
              className="block text-center text-xs text-muted-foreground hover:text-foreground"
            >
              Manage your affiliate IDs →
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
