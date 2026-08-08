// Lightweight client-side error logger.
// Buffers uncaught errors and unhandled promise rejections so they can be
// surfaced in the console with clean context, and forwarded to a real
// observability channel (Sentry / PostHog) once one is wired up.

type LoggedError = {
  ts: string;
  kind: "error" | "unhandledrejection";
  message: string;
  stack?: string;
  url: string;
};

const BUFFER_KEY = "__influencer-echo_error_buffer";
const MAX_BUFFER = 25;

function push(entry: LoggedError) {
  try {
    const raw = sessionStorage.getItem(BUFFER_KEY);
    const buf: LoggedError[] = raw ? JSON.parse(raw) : [];
    buf.push(entry);
    while (buf.length > MAX_BUFFER) buf.shift();
    sessionStorage.setItem(BUFFER_KEY, JSON.stringify(buf));
  } catch {
    // sessionStorage unavailable — noop.
  }
  // Loud console output during development; a future hook can forward this
  // to Sentry/PostHog without touching call sites.
  // eslint-disable-next-line no-console
  console.error(`[influencer-echo:${entry.kind}]`, entry.message, entry.stack ?? "");
}

let installed = false;

export function installClientErrorLogger() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    push({
      ts: new Date().toISOString(),
      kind: "error",
      message: event.message,
      stack: event.error?.stack,
      url: window.location.href,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    push({
      ts: new Date().toISOString(),
      kind: "unhandledrejection",
      message:
        typeof reason === "string" ? reason : (reason?.message ?? "Unhandled promise rejection"),
      stack: reason?.stack,
      url: window.location.href,
    });
  });
}

export function getBufferedErrors(): LoggedError[] {
  try {
    const raw = sessionStorage.getItem(BUFFER_KEY);
    return raw ? (JSON.parse(raw) as LoggedError[]) : [];
  } catch {
    return [];
  }
}
