import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  disconnectIntegration,
  getIntegrationsOverview,
  saveOutboundCredential,
  setActiveOutboundProvider,
  startSocialLinking,
} from "@/lib/integrations.functions";
import {
  BETA_PROVIDER_NOTICE,
  DRY_RUN_NOTICE,
  truthFromIntegrationState,
  type TruthStatus,
} from "@/lib/integrations/status";
import {
  OUTBOUND_PROVIDERS,
  SOCIAL_PLATFORMS,
  type OutboundProvider,
} from "@/lib/integrations/providers";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, ExternalLink, KeyRound, Link2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings/integrations")({
  component: IntegrationsPage,
  head: () => ({
    meta: [
      { title: "Integrations — Influencer Echo" },
      {
        name: "description",
        content:
          "Connect your outbound sending provider and your own social accounts. Credentials stay encrypted and server-side.",
      },
    ],
  }),
});

const APOLLO_PREREQUISITE =
  "Requires an active Apollo.io plan with API access. Sourcing data credits and sending mailbox deliverability run through your connected Apollo account.";

const PRICING_TRANSPARENCY =
  "The platform fee ($50/wk) covers AI lead qualification, copy strategy, sequence orchestration, and automated pipeline monitoring. Raw data consumption and mailbox sending are handled by your Apollo account.";

function IntegrationsPage() {
  const overviewFn = useServerFn(getIntegrationsOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["integrations-overview"],
    queryFn: () => overviewFn(),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Settings
        </p>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Integrations</h1>
        <p className="max-w-2xl text-muted-foreground">
          Bring your own sending provider and your own social accounts. Influencer Echo runs the
          strategy, copy, and scheduling — your accounts carry the data and the sends.
        </p>
      </header>

      {data && !data.encryptionConfigured ? (
        <Alert variant="destructive" data-testid="encryption-blocker">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Credential encryption is not configured</AlertTitle>
          <AlertDescription>
            Add <code className="font-mono">INTEGRATION_ENCRYPTION_KEY</code> in Project Settings →
            Secrets. Until then, saving a provider key is refused rather than stored unprotected.
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="outbound">
        <TabsList>
          <TabsTrigger value="outbound" data-testid="tab-outbound">
            Outbound provider
          </TabsTrigger>
          <TabsTrigger value="social" data-testid="tab-social">
            Social connections
          </TabsTrigger>
        </TabsList>

        <TabsContent value="outbound" className="mt-6">
          {isLoading || !data ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <OutboundTab data={data} />
          )}
        </TabsContent>

        <TabsContent value="social" className="mt-6">
          {isLoading || !data ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <SocialTab data={data} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Overview = Awaited<ReturnType<typeof getIntegrationsOverview>>;

function OutboundTab({ data }: { data: Overview }) {
  const qc = useQueryClient();
  const setActive = useServerFn(setActiveOutboundProvider);
  const activate = useMutation({
    mutationFn: (provider: string) => setActive({ data: { provider } }),
    onSuccess: (r) => {
      toast.success(`Active outbound provider set to ${r.activeOutboundProvider}.`);
      void qc.invalidateQueries({ queryKey: ["integrations-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const groups = Array.from(new Set(OUTBOUND_PROVIDERS.map((p) => p.group)));

  return (
    <div className="space-y-8">
      <Alert data-testid="pricing-transparency">
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>What you pay for</AlertTitle>
        <AlertDescription>{PRICING_TRANSPARENCY}</AlertDescription>
      </Alert>

      {groups.map((group) => (
        <section key={group} className="space-y-4">
          <h2 className="font-display text-xl font-semibold">{group}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {OUTBOUND_PROVIDERS.filter((p) => p.group === group).map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                data={data}
                onActivate={() => activate.mutate(provider.id)}
                activating={activate.isPending}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ProviderCard({
  provider,
  data,
  onActivate,
  activating,
}: {
  provider: OutboundProvider;
  data: Overview;
  onActivate: () => void;
  activating: boolean;
}) {
  const qc = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const save = useServerFn(saveOutboundCredential);
  const remove = useServerFn(disconnectIntegration);

  const row = data.integrations.find(
    (i) => i.provider === provider.id && i.category === "outbound",
  );
  const status: TruthStatus =
    provider.availability === "beta"
      ? "beta"
      : truthFromIntegrationState(row?.status, row?.last_validated_at);
  const isActive = data.activeOutboundProvider === provider.id;
  const beta = provider.availability === "beta";

  const saveMutation = useMutation({
    mutationFn: () => save({ data: { provider: provider.id, apiKey } }),
    onSuccess: (r) => {
      setApiKey("");
      toast.success(r.notice);
      void qc.invalidateQueries({ queryKey: ["integrations-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: () =>
      remove({ data: { provider: provider.id, category: "outbound" as const } }),
    onSuccess: () => {
      toast.success(`${provider.name} credential removed.`);
      void qc.invalidateQueries({ queryKey: ["integrations-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <article
      data-testid={`provider-card-${provider.id}`}
      aria-disabled={beta}
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-transform",
        beta ? "opacity-70" : "hover:-translate-y-0.5",
        isActive && !beta ? "ring-2 ring-primary/50" : "",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">{provider.name}</h3>
          <p className="text-sm text-muted-foreground">{provider.tagline}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <p className="text-sm text-foreground/80">{provider.description}</p>

      {provider.id === "apollo" ? (
        <p
          data-testid="apollo-prerequisite"
          className="rounded-xl bg-muted/60 p-3 text-sm text-foreground/80"
        >
          {APOLLO_PREREQUISITE}
        </p>
      ) : null}

      <div>
        <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Setup requirements
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/80">
          {provider.requirements.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>

      {beta ? (
        <p
          data-testid={`beta-notice-${provider.id}`}
          className="rounded-xl border border-dashed border-border px-3 py-2 text-sm font-medium text-foreground/70"
        >
          {BETA_PROVIDER_NOTICE}
        </p>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`key-${provider.id}`}>{provider.credentialLabel}</Label>
            <Input
              id={`key-${provider.id}`}
              data-testid={`credential-input-${provider.id}`}
              type="password"
              autoComplete="off"
              placeholder={row?.masked_hint ?? "Paste your key"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={!data.encryptionConfigured}
            />
            <p className="text-xs text-muted-foreground">{provider.credentialHelp}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              data-testid={`save-credential-${provider.id}`}
              onClick={() => saveMutation.mutate()}
              disabled={apiKey.trim().length < 8 || saveMutation.isPending}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              {row ? "Replace key" : "Save key"}
            </Button>
            {row ? (
              <Button
                variant="outline"
                data-testid={`disconnect-${provider.id}`}
                onClick={() => removeMutation.mutate()}
                disabled={removeMutation.isPending}
              >
                Disconnect
              </Button>
            ) : null}
            <Button
              variant={isActive ? "secondary" : "ghost"}
              data-testid={`activate-${provider.id}`}
              onClick={onActivate}
              disabled={isActive || activating}
            >
              {isActive ? "Active for campaigns" : "Use for campaigns"}
            </Button>
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Docs <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <p className="font-mono text-[11px] text-muted-foreground">
            {row?.last_validated_at
              ? `Last validated ${new Date(row.last_validated_at).toLocaleString()}`
              : "Never validated — live provider validation ships with execution."}
          </p>
        </div>
      )}
    </article>
  );
}

function SocialTab({ data }: { data: Overview }) {
  const link = useServerFn(startSocialLinking);
  const linking = useMutation({
    mutationFn: () => link({ data: undefined as never }),
    onSuccess: (r) => {
      if (r.ok) window.open(r.url, "_blank", "noopener");
      else toast.error(r.message);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const liveReady = data.socialConfigured;

  return (
    <div className="space-y-6">
      {!liveReady ? (
        <Alert data-testid="social-dry-run-notice">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{DRY_RUN_NOTICE}</AlertTitle>
          <AlertDescription>
            The social engine is scaffolded but no platform provider key is configured, so no
            account can be linked yet. Nothing here is simulated — this screen shows only real
            records.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Connect social accounts</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              You authorize TikTok, Instagram, YouTube, LinkedIn, X, and Facebook yourself through
              the provider's secure linking page. We never ask for your platform password or
              platform API keys.
            </p>
          </div>
          <StatusBadge
            status={
              data.socialProfile
                ? truthFromIntegrationState(data.socialProfile.status, null)
                : "not_connected"
            }
          />
        </div>
        <Button
          className="mt-4"
          data-testid="connect-social-accounts"
          onClick={() => linking.mutate()}
          disabled={!liveReady || linking.isPending}
        >
          <Link2 className="mr-2 h-4 w-4" />
          {liveReady ? "Connect social accounts" : "Awaiting configuration"}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {SOCIAL_PLATFORMS.map((platform) => {
          const account = data.socialAccounts.find((a) => a.platform === platform.id);
          const status: TruthStatus = account
            ? truthFromIntegrationState(account.status, account.last_checked_at)
            : "not_connected";
          return (
            <div
              key={platform.id}
              data-testid={`social-account-${platform.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div>
                <p className="font-medium">{platform.name}</p>
                <p className="text-xs text-muted-foreground">
                  {account?.handle ?? account?.display_name ?? platform.note}
                </p>
              </div>
              <StatusBadge status={status} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
