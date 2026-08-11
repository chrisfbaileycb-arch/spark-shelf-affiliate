// Server-only AI helpers for the unified campaign spine. Outputs are persisted
// verbatim by the calling server function — nothing here is invented for demo.
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "google/gemini-3.6-flash";

async function aiJson(system: string, user: string): Promise<Record<string, unknown>> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY is not configured.");
  const res = await fetch(`${AI_GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    if (res.status === 402) throw new Error("Lovable AI credits exhausted.");
    if (res.status === 429) throw new Error("AI rate limit — try again in a moment.");
    throw new Error(`AI request failed (${res.status}).`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  try {
    return JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as Record<string, unknown>;
  } catch {
    throw new Error("The model did not return usable JSON. Try again.");
  }
}

export const STRATEGY_MODEL = MODEL;

export interface BriefInput {
  offer: string;
  audience: string;
  proof_points: string[];
  constraints: string;
  source_url?: string | null;
  product_title?: string | null;
  product_description?: string | null;
}

export interface StrategyOutput {
  icp: Record<string, unknown>;
  positioning: string;
  angles: string[];
  pillars: string[];
  objections: string[];
  cta: string;
}

export async function generateStrategyOutput(brief: BriefInput): Promise<StrategyOutput> {
  const raw = await aiJson(
    "You are a go-to-market strategist. Return strict JSON only. Never invent statistics, customer counts, testimonials, or results. Only use facts present in the brief.",
    `Brief:\n${JSON.stringify(brief, null, 2)}\n\nReturn JSON with keys:
{"icp":{"segments":[string],"roles":[string],"company_size":string,"geographies":[string],"triggers":[string]},
"positioning":string,
"angles":[string],
"pillars":[string],
"objections":[string],
"cta":string}`,
  );
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  return {
    icp: (raw["icp"] ?? {}) as Record<string, unknown>,
    positioning: typeof raw["positioning"] === "string" ? (raw["positioning"] as string) : "",
    angles: arr(raw["angles"]),
    pillars: arr(raw["pillars"]),
    objections: arr(raw["objections"]),
    cta: typeof raw["cta"] === "string" ? (raw["cta"] as string) : "",
  };
}

export interface ContentPackOutput {
  hooks: string[];
  scripts: Array<{ title: string; script: string }>;
  captions: string[];
  hashtags: string[];
  email_angle: string;
}

export async function generateContentPackOutput(
  brief: BriefInput,
  strategy: StrategyOutput,
): Promise<ContentPackOutput> {
  const raw = await aiJson(
    "You write short-form creator content. Return strict JSON only. No invented metrics, reviews, or results. Every caption must end with a clear affiliate/ad disclosure (#ad). Meta compliance: no personal-attribute call-outs, minimal on-image text.",
    `Brief:\n${JSON.stringify(brief)}\n\nStrategy:\n${JSON.stringify(strategy)}\n\nReturn JSON:
{"hooks":[string x5],
"scripts":[{"title":string,"script":string}] (2 scripts, each 15-30 seconds spoken),
"captions":[string x3],
"hashtags":[string x2],
"email_angle":string}`,
  );
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const scripts = Array.isArray(raw["scripts"])
    ? (raw["scripts"] as unknown[])
        .map((s) => s as { title?: unknown; script?: unknown })
        .filter((s) => typeof s.script === "string")
        .map((s) => ({
          title: typeof s.title === "string" ? s.title : "Script",
          script: s.script as string,
        }))
    : [];
  return {
    hooks: arr(raw["hooks"]),
    scripts,
    captions: arr(raw["captions"]),
    hashtags: arr(raw["hashtags"]),
    email_angle: typeof raw["email_angle"] === "string" ? (raw["email_angle"] as string) : "",
  };
}

export interface LeadForQualification {
  id: string;
  full_name: string | null;
  title: string | null;
  company: string | null;
  company_domain: string | null;
  location: string | null;
}

export interface QualificationResult {
  id: string;
  score: number;
  reason: string;
}

export async function qualifyLeadsWithAi(
  icp: Record<string, unknown>,
  positioning: string,
  leads: LeadForQualification[],
): Promise<QualificationResult[]> {
  const raw = await aiJson(
    "You score outbound leads against an ICP. Return strict JSON only. Score 0-100 on ICP fit using only the supplied fields. If a field is missing, say so in the reason rather than guessing.",
    `ICP:\n${JSON.stringify(icp)}\n\nPositioning: ${positioning}\n\nLeads:\n${JSON.stringify(leads)}\n\nReturn JSON: {"results":[{"id":string,"score":number,"reason":string}]}`,
  );
  const rows = Array.isArray(raw["results"]) ? (raw["results"] as unknown[]) : [];
  return rows
    .map((r) => r as { id?: unknown; score?: unknown; reason?: unknown })
    .filter((r) => typeof r.id === "string" && typeof r.score === "number")
    .map((r) => ({
      id: r.id as string,
      score: Math.max(0, Math.min(100, Math.round(r.score as number))),
      reason: typeof r.reason === "string" ? r.reason : "",
    }));
}

export interface SequenceDraftStep {
  step_number: number;
  subject: string;
  body: string;
  delay_days: number;
}

export async function generateSequenceDraft(
  strategy: StrategyOutput,
  brief: BriefInput,
): Promise<SequenceDraftStep[]> {
  const raw = await aiJson(
    "You write plain-text cold email sequences. Return strict JSON only. No fabricated case studies, metrics, or名 name-drops. Keep each email under 120 words. Include an unsubscribe-friendly closing line.",
    `Brief:\n${JSON.stringify(brief)}\nStrategy:\n${JSON.stringify(strategy)}\n\nReturn JSON: {"steps":[{"step_number":number,"subject":string,"body":string,"delay_days":number}]} with 3 steps.`,
  );
  const rows = Array.isArray(raw["steps"]) ? (raw["steps"] as unknown[]) : [];
  return rows
    .map((s, i) => s as { step_number?: unknown; subject?: unknown; body?: unknown; delay_days?: unknown } & { _i?: number })
    .map((s, i) => ({
      step_number: typeof s.step_number === "number" ? s.step_number : i + 1,
      subject: typeof s.subject === "string" ? s.subject : "",
      body: typeof s.body === "string" ? s.body : "",
      delay_days: typeof s.delay_days === "number" ? s.delay_days : i * 3,
    }))
    .filter((s) => s.body);
}
