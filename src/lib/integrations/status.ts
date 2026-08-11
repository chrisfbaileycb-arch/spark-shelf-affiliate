/**
 * Truth Standard — the only vocabulary allowed for describing integration and
 * execution state anywhere in the product.
 *
 * Rules enforced by review and by the server:
 *  - "Working"   only after a verified end-to-end live run.
 *  - "Connected" only when a credential exists AND a real server-side
 *                validation succeeded (last_validated_at is set).
 *  - "Scheduled" only when a job_queue row is persisted.
 *  - Anything on the roadmap is "Beta / Coming Soon" and is blocked server-side.
 */
export type TruthStatus =
  | "working"
  | "connected"
  | "scheduled"
  | "staged"
  | "not_connected"
  | "needs_attention"
  | "failed"
  | "beta";

export interface TruthStatusMeta {
  label: string;
  description: string;
  tone: "positive" | "neutral" | "pending" | "warning" | "danger";
}

export const TRUTH_STATUS: Record<TruthStatus, TruthStatusMeta> = {
  working: {
    label: "Working",
    description: "Wired and verified end to end with a real live run.",
    tone: "positive",
  },
  connected: {
    label: "Connected",
    description: "Credential present and validated by the server.",
    tone: "positive",
  },
  scheduled: {
    label: "Scheduled",
    description: "Persisted in the job queue for server-side execution.",
    tone: "neutral",
  },
  staged: {
    label: "Staged",
    description: "Saved but not yet validated against the provider.",
    tone: "pending",
  },
  not_connected: {
    label: "Not connected",
    description: "No credential or account has been provided.",
    tone: "neutral",
  },
  needs_attention: {
    label: "Needs attention",
    description: "Credential expired, revoked, or missing permissions.",
    tone: "warning",
  },
  failed: {
    label: "Failed",
    description: "The last attempt did not succeed.",
    tone: "danger",
  },
  beta: {
    label: "Beta / Coming Soon",
    description: "Roadmap interface only. No active handler.",
    tone: "pending",
  },
};

/** Database integration_state -> Truth Standard status. */
export function truthFromIntegrationState(
  state: string | null | undefined,
  lastValidatedAt: string | null | undefined,
): TruthStatus {
  switch (state) {
    case "connected":
      // A "connected" row without a real validation timestamp is only staged.
      return lastValidatedAt ? "connected" : "staged";
    case "staged":
      return "staged";
    case "expired":
    case "revoked":
      return "needs_attention";
    case "error":
      return "failed";
    default:
      return "not_connected";
  }
}

/** Verbatim notice required wherever live social execution is not yet enabled. */
export const DRY_RUN_NOTICE =
  "Staged / Dry Run Mode — Connect Ayrshare Key to Activate Live Execution";

/** Verbatim notice required on every beta outbound provider. */
export const BETA_PROVIDER_NOTICE =
  "Beta / In Development — Select Apollo or Instantly for active campaigns.";
