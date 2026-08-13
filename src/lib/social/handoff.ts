/**
 * Share Sheet Hand-Off Engine — client-safe helpers.
 *
 * Truth rules encoded here:
 *  - "Ready to post" requires a reachable media asset AND caption text.
 *  - "Handed off" is only ever set after navigator.share() RESOLVES.
 *  - navigator.share() resolving means the OS accepted the hand-off. It does
 *    NOT mean anything was published. Only the user can confirm "Posted".
 */

export const HANDOFF_NOTICE =
  "Hands-Free Assistance Mode: Content and video assets are rendered automatically. Touch 'Post Now' to send them to your device's share menu, then choose your social app.";

export type WorkflowState =
  | "draft"
  | "approved"
  | "scheduled"
  | "ready_to_post"
  | "handed_off"
  | "posted"
  | "skipped"
  | "failed_preparation";

export const WORKFLOW_LABEL: Record<WorkflowState, string> = {
  draft: "Draft",
  approved: "Approved",
  scheduled: "Scheduled",
  ready_to_post: "Ready to post",
  handed_off: "Handed off",
  posted: "Posted",
  skipped: "Skipped",
  failed_preparation: "Failed preparation",
};

export interface HandoffVariantLike {
  state: string;
  caption: string;
  media_url: string | null;
  scheduled_at?: string | null;
  posted_at?: string | null;
  handed_off_at?: string | null;
  skipped_at?: string | null;
}

export function deriveWorkflowState(v: HandoffVariantLike, now: Date = new Date()): WorkflowState {
  if (v.posted_at) return "posted";
  if (v.skipped_at) return "skipped";
  if (v.handed_off_at) return "handed_off";
  if (v.state === "failed") return "failed_preparation";

  const prepared = Boolean(v.media_url) && v.caption.trim().length > 0;
  const due = v.scheduled_at ? new Date(v.scheduled_at).getTime() <= now.getTime() : true;

  if (v.state === "scheduled") return prepared && due ? "ready_to_post" : "scheduled";
  if (v.state === "awaiting_approval") return "draft";
  if (v.state === "draft") return "draft";
  return prepared && due ? "ready_to_post" : "scheduled";
}

/** Maps a workflow state onto the shared Truth Standard badge vocabulary. */
export function truthStatusForWorkflow(
  s: WorkflowState,
): "working" | "scheduled" | "staged" | "failed" | "not_connected" {
  switch (s) {
    case "posted":
      return "working";
    case "handed_off":
    case "ready_to_post":
      return "staged";
    case "scheduled":
      return "scheduled";
    case "failed_preparation":
      return "failed";
    default:
      return "not_connected";
  }
}

export type ShareCapability = "files" | "text-only" | "download-only";

/** Capability detection. Never assume: probe with a real File instance. */
export function detectShareCapability(): ShareCapability {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return "download-only";
  }
  try {
    const probe = new File([new Uint8Array([0])], "probe.mp4", { type: "video/mp4" });
    if (typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] })) {
      return "files";
    }
  } catch {
    /* File constructor unavailable — fall through */
  }
  return "text-only";
}

export const CAPABILITY_LABEL: Record<ShareCapability, string> = {
  files: "File sharing supported",
  "text-only": "Text share only",
  "download-only": "Download fallback",
};

/**
 * Where each platform's own posting screen lives. On a phone the installed app
 * usually intercepts these links; on desktop they open the web uploader.
 * Nothing here posts for you — it just puts you on the right screen after the
 * caption is copied and the video is on the device.
 */
export const PLATFORM_LAUNCH: Record<string, { label: string; url: string }> = {
  tiktok: { label: "Open TikTok", url: "https://www.tiktok.com/upload" },
  instagram: { label: "Open Instagram", url: "https://www.instagram.com/" },
  youtube: { label: "Open YouTube Studio", url: "https://studio.youtube.com/" },
  facebook: { label: "Open Facebook", url: "https://www.facebook.com/" },
  
};

export type CopyResult = { ok: true } | { ok: false; reason: string };


/** Must be called synchronously from a user gesture. */
export async function copyCaption(text: string): Promise<CopyResult> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return { ok: true };
    }
    return { ok: false, reason: "Clipboard API unavailable in this browser." };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Clipboard permission denied.",
    };
  }
}

export type ShareOutcome =
  | { kind: "handed_off" }
  | { kind: "canceled" }
  | { kind: "unsupported"; reason: string }
  | { kind: "error"; reason: string };

const MAX_SHARE_BYTES = 100 * 1024 * 1024;

/**
 * Two-tap hand-off. `mediaUrl` MUST be same-origin (or CORS-enabled) so the
 * bytes can be read into a File. Call only from a click handler.
 */
export async function shareVideoToDeviceSheet(opts: {
  mediaUrl: string;
  filename: string;
  title: string;
  text: string;
  headers?: Record<string, string>;
}): Promise<ShareOutcome> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return { kind: "unsupported", reason: "This browser has no share sheet. Download instead." };
  }

  let file: File;
  try {
    const res = await fetch(opts.mediaUrl, {
      credentials: "same-origin",
      headers: opts.headers ?? {},
    });
    if (!res.ok) {
      return { kind: "error", reason: `Could not read the video (HTTP ${res.status}).` };
    }
    const blob = await res.blob();
    if (blob.size > MAX_SHARE_BYTES) {
      return { kind: "unsupported", reason: "Video is too large to hand off. Download instead." };
    }
    file = new File([blob], opts.filename, { type: "video/mp4" });
  } catch (err) {
    return {
      kind: "error",
      reason: err instanceof Error ? err.message : "The video could not be fetched.",
    };
  }

  if (typeof navigator.canShare !== "function" || !navigator.canShare({ files: [file] })) {
    return {
      kind: "unsupported",
      reason: "This device cannot hand off video files. Download the video instead.",
    };
  }

  try {
    await navigator.share({ files: [file], title: opts.title, text: opts.text });
    // Resolved = the OS accepted the hand-off. Nothing is published yet.
    return { kind: "handed_off" };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "AbortError") return { kind: "canceled" };
    return { kind: "error", reason: err instanceof Error ? err.message : "Share failed." };
  }
}
