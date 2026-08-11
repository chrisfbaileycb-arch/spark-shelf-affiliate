// Server-only credential encryption. Never import from client-reachable module scope.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const KEY_VERSION = 1;

export class ConfigurationBlockerError extends Error {
  readonly blocker: string;
  constructor(blocker: string, message: string) {
    super(message);
    this.name = "ConfigurationBlockerError";
    this.blocker = blocker;
  }
}

export function encryptionAvailable(): boolean {
  return Boolean(process.env["INTEGRATION_ENCRYPTION_KEY"]);
}

function key(): Buffer {
  const raw = process.env["INTEGRATION_ENCRYPTION_KEY"];
  if (!raw) {
    throw new ConfigurationBlockerError(
      "INTEGRATION_ENCRYPTION_KEY",
      "Credential encryption is not configured. Add INTEGRATION_ENCRYPTION_KEY in Project Settings → Secrets before saving credentials.",
    );
  }
  // Derive a stable 32-byte key from the stored secret regardless of its encoding.
  return createHash("sha256").update(raw, "utf8").digest();
}

/** AES-256-GCM. Returns base64 of iv | authTag | ciphertext. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decryptSecret(stored: string): string {
  const buf = Buffer.from(stored, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/** Last 4 characters only — safe to show in the UI. Never derived from the ciphertext. */
export function maskHint(plaintext: string): string {
  const tail = plaintext.trim().slice(-4);
  return tail ? `••••${tail}` : "••••";
}

/**
 * Strips anything that could carry a credential out of an error before it is
 * logged or returned. Provider SDKs routinely echo request headers.
 */
export function sanitizeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : "Unexpected error";
  return raw
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, "[redacted]")
    .replace(/(api[_-]?key|authorization|bearer|token|secret)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .slice(0, 300);
}
