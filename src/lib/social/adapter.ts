/**
 * Vendor-neutral social publishing adapter.
 *
 * The domain model must never assume Ayrshare. Every method may return a typed
 * configuration blocker instead of throwing, so the UI can render a truthful
 * "staged" state rather than a fake success.
 */
import type { SocialPlatformId } from "@/lib/integrations/providers";

export type AdapterResult<T> =
  | { ok: true; data: T }
  | { ok: false; blocker: string; message: string };

export interface ConnectedAccount {
  platform: SocialPlatformId;
  externalAccountId: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  status: "connected" | "expired" | "revoked" | "error";
  scopes: string[];
}

export interface PostVariantInput {
  platform: SocialPlatformId;
  caption: string;
  platformTitle?: string | null;
  privacy?: string;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  options?: Record<string, unknown>;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export type PublishState = "publishing" | "published" | "failed";

export interface SocialAdapter {
  readonly id: "ayrshare";

  /** Create or fetch the provider sub-profile for an organization. */
  ensureProfile(orgId: string): Promise<AdapterResult<{ profileRef: string; title: string }>>;

  /** Short-lived hosted linking URL for the customer's own OAuth. */
  linkingUrl(
    profileRef: string,
    platforms: SocialPlatformId[],
  ): Promise<AdapterResult<{ url: string; expiresAt: string }>>;

  listAccounts(profileRef: string): Promise<AdapterResult<ConnectedAccount[]>>;

  /** Pure, offline platform validation. Always available. */
  validate(variant: PostVariantInput): ValidationIssue[];

  publish(
    profileRef: string,
    variant: PostVariantInput,
    idempotencyKey: string,
  ): Promise<AdapterResult<{ externalId: string; state: PublishState; raw: unknown }>>;

  status(
    profileRef: string,
    externalId: string,
  ): Promise<AdapterResult<{ state: PublishState; raw: unknown }>>;

  analytics(
    profileRef: string,
    externalId: string,
  ): Promise<AdapterResult<{ raw: unknown; normalized: Record<string, number | null> }>>;

  unlink(profileRef: string, externalAccountId: string): Promise<AdapterResult<{ ok: true }>>;
}

/** Shared, vendor-independent platform rules used by every adapter. */
export const PLATFORM_RULES: Record<
  SocialPlatformId,
  { captionMax: number; requiresMedia: boolean; titleMax?: number; maxDurationSec?: number }
> = {
  tiktok: { captionMax: 2200, requiresMedia: true, maxDurationSec: 600 },
  instagram: { captionMax: 2200, requiresMedia: true, maxDurationSec: 90 },
  youtube: { captionMax: 5000, requiresMedia: true, titleMax: 100, maxDurationSec: 60 },
  linkedin: { captionMax: 3000, requiresMedia: false },
  x: { captionMax: 280, requiresMedia: false },
  facebook: { captionMax: 5000, requiresMedia: false },
};

export function validateVariant(variant: PostVariantInput): ValidationIssue[] {
  const rules = PLATFORM_RULES[variant.platform];
  const issues: ValidationIssue[] = [];
  if (!rules) return [{ field: "platform", message: "Unsupported platform." }];

  const caption = variant.caption?.trim() ?? "";
  if (!caption && variant.platform !== "youtube") {
    issues.push({ field: "caption", message: "Caption is required." });
  }
  if (caption.length > rules.captionMax) {
    issues.push({
      field: "caption",
      message: `Caption is ${caption.length} characters; ${variant.platform} allows ${rules.captionMax}.`,
    });
  }
  if (rules.requiresMedia && !variant.mediaUrl) {
    issues.push({ field: "mediaUrl", message: "This platform requires a video or image." });
  }
  if (rules.titleMax) {
    const title = variant.platformTitle?.trim() ?? "";
    if (!title) issues.push({ field: "platformTitle", message: "A title is required." });
    else if (title.length > rules.titleMax) {
      issues.push({
        field: "platformTitle",
        message: `Title is ${title.length} characters; the limit is ${rules.titleMax}.`,
      });
    }
  }
  return issues;
}
