import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ACTIVE_OUTBOUND_PROVIDER_IDS,
  OUTBOUND_PROVIDER_IDS,
  isActiveOutboundProvider,
} from "@/lib/integrations/providers";

const ProviderInput = z.object({
  provider: z.string().refine((v) => OUTBOUND_PROVIDER_IDS.includes(v as never), {
    message: "Unknown provider.",
  }),
});

const SaveCredentialInput = ProviderInput.extend({
  apiKey: z.string().trim().min(8, "That key looks too short.").max(500),
});

export type IntegrationRow = {
  provider: string;
  category: "outbound" | "social";
  status: string;
  masked_hint: string | null;
  last_validated_at: string | null;
  updated_at: string;
};

export type IntegrationsOverview = {
  orgId: string;
  orgName: string;
  activeOutboundProvider: string;
  socialDryRun: boolean;
  socialConfigured: boolean;
  encryptionConfigured: boolean;
  integrations: IntegrationRow[];
  socialProfile: { status: string; hasProfile: boolean; title: string | null } | null;
  socialAccounts: Array<{
    id: string;
    platform: string;
    handle: string | null;
    display_name: string | null;
    status: string;
    last_checked_at: string | null;
  }>;
};

/** Read-only overview. Never returns ciphertext, keys, or profile refs. */
export const getIntegrationsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<IntegrationsOverview> => {
    const { resolveOrgIdForUser } = await import("@/lib/integrations/orgs.server");
    const { encryptionAvailable } = await import("@/lib/integrations/crypto.server");
    const { ayrshareConfigured } = await import("@/lib/social/ayrshare.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const orgId = await resolveOrgIdForUser(context.userId);

    const [org, settings, creds, profile, accounts] = await Promise.all([
      supabaseAdmin.from("organizations").select("name").eq("id", orgId).maybeSingle(),
      supabaseAdmin
        .from("org_settings")
        .select("active_outbound_provider, social_dry_run")
        .eq("org_id", orgId)
        .maybeSingle(),
      supabaseAdmin
        .from("integration_credentials")
        .select("provider, category, status, masked_hint, last_validated_at, updated_at")
        .eq("org_id", orgId),
      supabaseAdmin
        .from("social_provider_profiles")
        .select("status, external_profile_title, profile_ref_ciphertext")
        .eq("org_id", orgId)
        .maybeSingle(),
      supabaseAdmin
        .from("social_accounts")
        .select("id, platform, handle, display_name, status, last_checked_at")
        .eq("org_id", orgId)
        .order("platform"),
    ]);

    return {
      orgId,
      orgName: org.data?.name ?? "My workspace",
      activeOutboundProvider: settings.data?.active_outbound_provider ?? "apollo",
      socialDryRun: settings.data?.social_dry_run ?? true,
      socialConfigured: ayrshareConfigured(),
      encryptionConfigured: encryptionAvailable(),
      integrations: (creds.data ?? []) as IntegrationRow[],
      socialProfile: profile.data
        ? {
            status: profile.data.status,
            hasProfile: Boolean(profile.data.profile_ref_ciphertext),
            title: profile.data.external_profile_title,
          }
        : null,
      socialAccounts: accounts.data ?? [],
    };
  });

/**
 * Saves an outbound provider credential. Beta providers are rejected here, not
 * only in the UI. The key is encrypted immediately and never echoed back.
 */
export const saveOutboundCredential = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveCredentialInput.parse(d))
  .handler(async ({ data, context }) => {
    if (!isActiveOutboundProvider(data.provider)) {
      throw new Error(
        "Beta / In Development — Select Apollo or Instantly for active campaigns.",
      );
    }

    const { resolveOrgIdForUser } = await import("@/lib/integrations/orgs.server");
    const crypto = await import("@/lib/integrations/crypto.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!crypto.encryptionAvailable()) {
      throw new Error(
        "Credential encryption is not configured (INTEGRATION_ENCRYPTION_KEY). Nothing was saved.",
      );
    }

    const orgId = await resolveOrgIdForUser(context.userId);

    let ciphertext: string;
    let hint: string;
    try {
      ciphertext = crypto.encryptSecret(data.apiKey);
      hint = crypto.maskHint(data.apiKey);
    } catch (err) {
      throw new Error(crypto.sanitizeError(err));
    }

    const { error } = await supabaseAdmin.from("integration_credentials").upsert(
      {
        org_id: orgId,
        category: "outbound" as const,
        provider: data.provider,
        ciphertext,
        key_version: crypto.KEY_VERSION,
        masked_hint: hint,
        // Staged, never "connected": no live validation handler has run yet.
        status: "staged" as const,
        last_validated_at: null,
        last_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id,category,provider" },
    );
    if (error) throw new Error("Could not store the credential.");

    return {
      ok: true as const,
      status: "staged" as const,
      maskedHint: hint,
      notice:
        "Saved and encrypted. Status stays Staged until a live provider validation runs in Phase 3.",
    };
  });

export const disconnectIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    ProviderInput.extend({ category: z.enum(["outbound", "social"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { resolveOrgIdForUser } = await import("@/lib/integrations/orgs.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const orgId = await resolveOrgIdForUser(context.userId);
    const { error } = await supabaseAdmin
      .from("integration_credentials")
      .delete()
      .eq("org_id", orgId)
      .eq("category", data.category)
      .eq("provider", data.provider);
    if (error) throw new Error("Could not remove the credential.");
    return { ok: true as const };
  });

/** Server-enforced: beta providers can never become the active provider. */
export const setActiveOutboundProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProviderInput.parse(d))
  .handler(async ({ data, context }) => {
    if (!ACTIVE_OUTBOUND_PROVIDER_IDS.includes(data.provider as never)) {
      throw new Error(
        "Beta / In Development — Select Apollo or Instantly for active campaigns.",
      );
    }
    const { resolveOrgIdForUser } = await import("@/lib/integrations/orgs.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const orgId = await resolveOrgIdForUser(context.userId);
    const { error } = await supabaseAdmin
      .from("org_settings")
      .upsert(
        { org_id: orgId, active_outbound_provider: data.provider },
        { onConflict: "org_id" },
      );
    if (error) throw new Error("Could not update the active provider.");
    return { ok: true as const, activeOutboundProvider: data.provider };
  });

/**
 * Creates (or reuses) the org's provider sub-profile and returns a short-lived
 * hosted linking URL. Returns a typed blocker instead of a fake URL when the
 * platform business key is absent.
 */
export const startSocialLinking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveOrgIdForUser } = await import("@/lib/integrations/orgs.server");
    const crypto = await import("@/lib/integrations/crypto.server");
    const { ayrshareAdapter, ayrshareConfigured, AYRSHARE_BLOCKER } = await import(
      "@/lib/social/ayrshare.server"
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!ayrshareConfigured()) {
      return {
        ok: false as const,
        blocker: AYRSHARE_BLOCKER,
        message:
          "Staged / Dry Run Mode — Connect Ayrshare Key to Activate Live Execution",
      };
    }
    if (!crypto.encryptionAvailable()) {
      return {
        ok: false as const,
        blocker: "INTEGRATION_ENCRYPTION_KEY",
        message: "Credential encryption is not configured. Social linking is disabled.",
      };
    }

    const orgId = await resolveOrgIdForUser(context.userId);

    const { data: existing } = await supabaseAdmin
      .from("social_provider_profiles")
      .select("profile_ref_ciphertext")
      .eq("org_id", orgId)
      .maybeSingle();

    let profileRef: string;
    if (existing?.profile_ref_ciphertext) {
      profileRef = crypto.decryptSecret(existing.profile_ref_ciphertext);
    } else {
      const created = await ayrshareAdapter.ensureProfile(orgId);
      if (!created.ok) return { ok: false as const, blocker: created.blocker, message: created.message };
      profileRef = created.data.profileRef;
      await supabaseAdmin.from("social_provider_profiles").upsert(
        {
          org_id: orgId,
          adapter: "ayrshare",
          profile_ref_ciphertext: crypto.encryptSecret(profileRef),
          key_version: crypto.KEY_VERSION,
          status: "staged" as const,
          external_profile_title: created.data.title,
        },
        { onConflict: "org_id" },
      );
    }

    const link = await ayrshareAdapter.linkingUrl(profileRef, []);
    if (!link.ok) return { ok: false as const, blocker: link.blocker, message: link.message };
    // Only the hosted URL crosses the boundary — never the profile key.
    return { ok: true as const, url: link.data.url, expiresAt: link.data.expiresAt };
  });
