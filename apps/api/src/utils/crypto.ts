import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Algorithm, hash as argonHash, verify as argonVerify } from "@node-rs/argon2";

/** Argon2id parameters — OWASP-recommended baseline (19 MiB, 2 passes). */
const ARGON2_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return argonHash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argonVerify(hash, password);
  } catch {
    // A malformed hash must read as "wrong password", never as a crash.
    return false;
  }
}

/**
 * Fixed hash used to burn the same CPU time when an email does not exist, so
 * response timing cannot be used to enumerate accounts.
 */
let dummyHashPromise: Promise<string> | null = null;
export function dummyPasswordHash(): Promise<string> {
  dummyHashPromise ??= hashPassword("this-password-is-never-valid-0!Xq");
  return dummyHashPromise;
}

/** URL-safe random token — used for sessions and password reset links. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Opaque tokens are persisted as SHA-256 digests: a database leak must not
 * hand an attacker usable session or reset tokens.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
