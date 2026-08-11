import { cn } from "@/lib/utils";
import { TRUTH_STATUS, type TruthStatus } from "@/lib/integrations/status";

const TONE: Record<string, string> = {
  positive: "bg-emerald-500/12 text-emerald-700 ring-emerald-600/25",
  neutral: "bg-sky-500/12 text-sky-700 ring-sky-600/25",
  pending: "bg-amber-500/14 text-amber-800 ring-amber-600/25",
  warning: "bg-orange-500/14 text-orange-800 ring-orange-600/30",
  danger: "bg-destructive/12 text-destructive ring-destructive/30",
};

export function StatusBadge({
  status,
  className,
  withTitle = true,
}: {
  status: TruthStatus;
  className?: string;
  withTitle?: boolean;
}) {
  const meta = TRUTH_STATUS[status];
  return (
    <span
      data-testid={`status-badge-${status}`}
      title={withTitle ? meta.description : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wide ring-1 ring-inset",
        TONE[meta.tone],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {meta.label}
    </span>
  );
}
