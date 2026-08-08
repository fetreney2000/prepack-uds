// Phase 5: auth rate limiting (persisted via Supabase so it survives
// Vercel cold starts). Tracks failed admin-password attempts per client
// fingerprint with a lockout window.
"use server";

import { createAdminClient } from "@/lib/supabase/admin";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 60 * 1000; // 30 min
const WINDOW_MS = 15 * 60 * 1000; // reset window for counting

export interface RateLimitState {
  allowed: boolean;
  retryAfterMs: number | null;
  remaining: number;
}

/** Hash a fingerprint so we don't store raw identifiers. */
export async function hashFingerprint(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Check whether a fingerprint is currently allowed to attempt a login.
 * Call before verifying. On success, call `recordResult(fingerprint, ok)`.
 */
export async function checkRateLimit(fingerprint: string): Promise<RateLimitState> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tblAuthAttempts")
    .select("attempt_count, locked_until, updated_at")
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  if (error || !data) {
    return { allowed: true, retryAfterMs: null, remaining: MAX_ATTEMPTS };
  }

  const count = data.attempt_count ?? 0;
  const lockedUntil = data.locked_until;
  const updatedAt = data.updated_at;

  // If locked, check if the lockout has expired.
  if (lockedUntil) {
    const lockMs = new Date(lockedUntil).getTime();
    if (Number.isFinite(lockMs) && Date.now() < lockMs) {
      return {
        allowed: false,
        retryAfterMs: lockMs - Date.now(),
        remaining: 0,
      };
    }
  }

  // Reset the counter if the window elapsed since the last attempt.
  if (updatedAt) {
    const updatedMs = new Date(updatedAt).getTime();
    if (Number.isFinite(updatedMs) && Date.now() - updatedMs > WINDOW_MS) {
      return { allowed: true, retryAfterMs: null, remaining: MAX_ATTEMPTS };
    }
  }

  return {
    allowed: count < MAX_ATTEMPTS,
    retryAfterMs: null,
    remaining: Math.max(0, MAX_ATTEMPTS - count),
  };
}

/**
 * Record the outcome of an attempt. On failure, increments the counter
 * and locks the fingerprint once MAX_ATTEMPTS is reached.
 */
export async function recordAuthResult(
  fingerprint: string,
  ok: boolean,
): Promise<void> {
  const supabase = createAdminClient();

  if (ok) {
    // Success: clear the counter.
    await supabase.from("tblAuthAttempts").upsert(
      { fingerprint, attempt_count: 0, locked_until: null, updated_at: nowIso() },
      { onConflict: "fingerprint" },
    );
    return;
  }

  // Failure: increment (read-modify-write best-effort).
  const { data } = await supabase
    .from("tblAuthAttempts")
    .select("attempt_count")
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  const next = (data?.attempt_count ?? 0) + 1;
  const locked =
    next >= MAX_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS).toISOString() : null;

  await supabase.from("tblAuthAttempts").upsert(
    {
      fingerprint,
      attempt_count: next,
      locked_until: locked,
      updated_at: nowIso(),
    },
    { onConflict: "fingerprint" },
  );
}