// Server Actions — authentication (single shared password)
// Phase 4: PBKDF2-SHA512 (1000 iterations, 16-byte salt, 64-byte hash),
// stored as `salt:hash` in tblSystemSettings.admin_password.
// Default password for fresh installs: farmasi456 (hashed by seed.ts).
"use server";

import { randomBytes, pbkdf2Sync, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPasswordSchema, changePasswordSchema } from "@/lib/validation";
import { checkRateLimit, recordAuthResult } from "@/lib/rate-limit";

export interface AuthResult {
  ok: boolean;
  message?: string;
  retryAfterMs?: number;
}

const ITERATIONS = 1000;
const KEYLEN = 64;
const DIGEST = "sha512";

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// ---------- Verify admin password ----------

export async function verifyAdminPassword(password: string): Promise<AuthResult> {
  const parsed = verifyPasswordSchema.safeParse({ password });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Input tidak sah." };
  }

  const fingerprint = await clientFingerprint();

  // Enforce rate limit before doing expensive PBKDF2 work.
  const rl = await checkRateLimit(fingerprint);
  if (!rl.allowed) {
    return {
      ok: false,
      message: "Terlalu banyak percubaan. Sila cuba semula kemudian.",
      retryAfterMs: rl.retryAfterMs ?? undefined,
    };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tblsystemsettings")
    .select("settingvalue")
    .eq("settingkey", "admin_password")
    .maybeSingle();

  const valid = !error && !!data && verifyPassword(parsed.data.password, data.settingvalue);

  await recordAuthResult(fingerprint, valid);

  if (!valid) {
    return { ok: false, message: "Kata laluan salah." };
  }
  return { ok: true };
}

// ---------- Change admin password ----------

export async function changeAdminPassword(
  current: string,
  next: string,
): Promise<AuthResult> {
  const parsed = changePasswordSchema.safeParse({ current, next });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Input tidak sah." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tblsystemsettings")
    .select("settingvalue")
    .eq("settingkey", "admin_password")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Kata laluan belum ditetapkan." };
  }
  if (!verifyPassword(parsed.data.current, data.settingvalue)) {
    return { ok: false, message: "Kata laluan semasa salah." };
  }

  const { error: updErr } = await supabase
    .from("tblsystemsettings")
    .update({ settingvalue: hashPassword(parsed.data.next) })
    .eq("settingkey", "admin_password");

  if (updErr) {
    return { ok: false, message: `Gagal menukar kata laluan: ${updErr.message}` };
  }
  return { ok: true, message: "Kata laluan telah ditukar." };
}

// ---------- Fingerprint ----------

/**
 * Derive a stable client fingerprint for rate limiting. Uses the
 * x-forwarded-for / x-real-ip headers (set by Vercel) when present,
 * else a constant shared key (all clients share the bucket — a safe
 * default for a LAN app that still bounds total attempts).
 */
async function clientFingerprint(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for") ?? "";
  const realIp = h.get("x-real-ip") ?? "";
  const raw = (fwd || realIp || "shared-lan-bucket").trim();
  return rateLimitHash(raw);
}

async function rateLimitHash(raw: string): Promise<string> {
  const { hashFingerprint } = await import("@/lib/rate-limit");
  return hashFingerprint(raw);
}