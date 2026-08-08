import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Check, Circle } from "lucide-react";

interface Step {
  label: string;
  desc: string;
  to: "/personas" | "/products/new" | "/affiliate-programs" | "/videos";
  done: boolean;
}

export function OnboardingChecklist({
  hasPersona,
  hasProduct,
  hasProgram,
  hasVideo,
}: {
  hasPersona: boolean;
  hasProduct: boolean;
  hasProgram: boolean;
  hasVideo: boolean;
}) {
  const steps: Step[] = [
    {
      label: "Create your influencer persona",
      desc: "Pick gender, age, vibe and niche — this drives the voice and avatar.",
      to: "/personas",
      done: hasPersona,
    },
    {
      label: "Add your affiliate program",
      desc: "Paste your Amazon/ShareASale/other tracking ID so links pay you.",
      to: "/affiliate-programs",
      done: hasProgram,
    },
    {
      label: "Ingest a product URL",
      desc: "Any Amazon, AliExpress, Shopify or product page.",
      to: "/products/new",
      done: hasProduct,
    },
    {
      label: "Generate your first video",
      desc: "15 seconds, captions burned in, ready to post.",
      to: "/videos",
      done: hasVideo,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  if (completed === steps.length) return null;

  return (
    <Card className="p-6 shadow-pop">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl">Get set up</h2>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {completed} of {steps.length} done
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${(completed / steps.length) * 100}%` }}
        />
      </div>
      <ol className="mt-5 space-y-1">
        {steps.map((s) => (
          <li key={s.label}>
            <Link
              to={s.to}
              className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-secondary/60"
            >
              {s.done ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              ) : (
                <Circle
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              <span>
                <span
                  className={`block text-sm font-medium ${s.done ? "text-muted-foreground line-through" : ""}`}
                >
                  {s.label}
                </span>
                <span className="block text-xs text-muted-foreground">{s.desc}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
