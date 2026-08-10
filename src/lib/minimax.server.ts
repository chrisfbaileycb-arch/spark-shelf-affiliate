// Server-only MiniMax (Hailuo) video generation client.
// Replaces the previous HeyGen avatar pipeline.

const MINIMAX_API = "https://api.minimax.io/v1";

/** MiniMax account group id used for file retrieval. */
export const MINIMAX_GROUP_ID = "543051339204071425";

/** Hailuo text/image-to-video model. */
export const MINIMAX_MODEL = "MiniMax-Hailuo-02";

/** MiniMax renders fixed-length clips; we map our 15s/30s presets onto them. */
export function minimaxClipSeconds(requested: number): 6 | 10 {
  return requested >= 30 ? 10 : 6;
}

function apiKey(): string {
  const key = process.env["MINIMAX_API_KEY"];
  if (!key) throw new Error("MINIMAX_API_KEY not configured");
  return key;
}

async function minimax<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${MINIMAX_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`MiniMax ${path} ${res.status}: ${text.slice(0, 300)}`);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`MiniMax returned non-JSON from ${path}`);
  }
  const base = (json as { base_resp?: { status_code?: number; status_msg?: string } }).base_resp;
  if (base && base.status_code !== 0) {
    throw new Error(`MiniMax ${path} error ${base.status_code}: ${base.status_msg ?? "unknown"}`);
  }
  return json as T;
}

export interface MinimaxTask {
  task_id: string;
}

export async function createVideoTask(opts: {
  prompt: string;
  durationSeconds: 6 | 10;
  firstFrameImage?: string | null;
  resolution?: "768P" | "1080P";
}): Promise<string> {
  const body: Record<string, unknown> = {
    model: MINIMAX_MODEL,
    prompt: opts.prompt.slice(0, 1800),
    duration: opts.durationSeconds,
    resolution: opts.resolution ?? "768P",
    prompt_optimizer: true,
  };
  if (opts.firstFrameImage) body["first_frame_image"] = opts.firstFrameImage;
  const json = await minimax<MinimaxTask>("/video_generation", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!json.task_id) throw new Error("MiniMax did not return a task_id");
  return json.task_id;
}

interface MinimaxStatus {
  task_id: string;
  status: "Preparing" | "Queueing" | "Processing" | "Success" | "Fail";
  file_id?: string;
}

/** Polls until the render finishes, returns the generated file id. */
export async function pollVideoTask(taskId: string, timeoutMs = 8 * 60 * 1000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const s = await minimax<MinimaxStatus>(
      `/query/video_generation?task_id=${encodeURIComponent(taskId)}`,
    );
    if (s.status === "Success") {
      if (!s.file_id) throw new Error("MiniMax succeeded without a file_id");
      return s.file_id;
    }
    if (s.status === "Fail") throw new Error("MiniMax reported render failure");
    await new Promise((r) => setTimeout(r, 6000));
  }
  throw new Error("MiniMax render timed out");
}

interface MinimaxFile {
  file?: { download_url?: string; backup_download_url?: string };
}

export async function retrieveFileUrl(fileId: string): Promise<string> {
  const json = await minimax<MinimaxFile>(
    `/files/retrieve?GroupId=${MINIMAX_GROUP_ID}&file_id=${encodeURIComponent(fileId)}`,
  );
  const url = json.file?.download_url ?? json.file?.backup_download_url;
  if (!url) throw new Error("MiniMax file has no download URL");
  return url;
}

/** Builds a cinematic shot prompt for the clip from script + persona + product. */
export function buildVideoPrompt(input: {
  hook: string;
  script: string;
  productTitle: string;
  productDescription?: string | null;
  personaVibe?: string | null;
}): string {
  return [
    `Vertical 9:16 social-media style short advertising "${input.productTitle}".`,
    input.productDescription ? `Product context: ${input.productDescription}` : "",
    input.personaVibe ? `Presenter vibe: ${input.personaVibe}.` : "",
    `On-screen story beat: ${input.hook} ${input.script}`.trim(),
    "Handheld influencer-style camera, natural lighting, realistic modern setting, product clearly visible.",
    "Original fictional presenter — do not depict any real, famous, or identifiable person.",
    "No text overlays, no logos, no watermarks, no distorted hands or faces.",
  ]
    .filter(Boolean)
    .join(" ");
}

const KIND_SETTING: Record<string, string> = {
  ecommerce:
    "Studio-quality product beauty shot: the product on a clean surface with soft depth of field, slow dolly-in and gentle parallax.",
  mobile_app:
    "A modern smartphone held in frame or resting on a desk, screen glowing, slow camera orbit and subtle rack focus.",
  saas: "A sleek laptop or desktop monitor on a bright modern desk, slow push-in, soft ambient office light and gentle bokeh.",
};

/** Silent cinematic b-roll / product motion prompt — no presenter, no speech. */
export function buildBRollPrompt(input: {
  productTitle: string;
  productDescription?: string | null;
  assetKind?: string | null;
  styleNote?: string | null;
}): string {
  const setting = KIND_SETTING[input.assetKind ?? "ecommerce"] ?? KIND_SETTING["ecommerce"];
  return [
    `Vertical 9:16 cinematic b-roll motion clip featuring "${input.productTitle}".`,
    input.productDescription ? `Context: ${input.productDescription}` : "",
    setting,
    input.styleNote ? `Art direction: ${input.styleNote}.` : "",
    "Smooth cinematic camera movement, premium commercial lighting, shallow depth of field, realistic materials.",
    "No people speaking, no talking head, no dialogue — silent visual b-roll only.",
    "No text overlays, no captions, no logos, no watermarks, no distorted geometry.",
  ]
    .filter(Boolean)
    .join(" ");
}

