import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";
import { GUIDES } from "@/lib/guides.data";

export const Route = createFileRoute("/guides/$slug")({
  loader: ({ params }) => {
    const guide = GUIDES[params.slug];
    if (!guide) throw notFound();
    return { guide, slug: params.slug };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Guide not found — Echo Your Influence" }] };
    const { guide, slug } = loaderData;
    return {
      meta: [
        { title: `${guide.title} — Echo Your Influence` },
        { name: "description", content: guide.description },
        { property: "og:title", content: guide.ogTitle },
        { property: "og:description", content: guide.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `/guides/${slug}` },
      ],
      links: [{ rel: "canonical", href: `/guides/${slug}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: guide.title,
            description: guide.description,
            author: { "@type": "Organization", name: "Echo Your Influence" },
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-display text-4xl">Guide not found</h1>
        <Link to="/guides" className="mt-6 inline-block text-primary">
          ← Back to guides
        </Link>
      </div>
      <PublicFooter />
    </div>
  ),
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-display text-4xl">Something went wrong</h1>
        <button
          onClick={reset}
          className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Try again
        </button>
      </div>
      <PublicFooter />
    </div>
  ),
  component: GuidePage,
});

function GuidePage() {
  const { guide } = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <article className="prose prose-neutral mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm uppercase tracking-wider text-muted-foreground">Guide</p>
        <h1 className="font-display text-4xl md:text-5xl">{guide.title}</h1>
        <p className="lead text-lg text-muted-foreground">{guide.description}</p>
        {guide.body}
      </article>
      <PublicFooter />
    </div>
  );
}
