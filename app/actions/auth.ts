// Server Actions — authentication (single shared password)
// Phase 4: PBKDF2-SHA512 (1000 iterations, 16-byte salt, 64-byte hash),
// stored as `salt:hash` in tblSystemSettings.admin_password.
// Default password for fresh installs: farmasi456 (hashed by seed.ts).
"use server";

import { randomBytes, pbkdf2Sync, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AuthResult {
  ok: boolean;
  message?: string;
}

const ITERATIONS = 1000;
const KEYLEN = 64;
const DIGEST = "sha512";
const MIN_PASSWORD_LENGTH = 6;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// ---------- Verify admin password ----------

export async function verifyAdminPassword(password: string): Promise<AuthResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tblSystemSettings")
    .select("settingValue")
    .eq("settingKey", "admin_password")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Kata laluan belum ditetapkan." };
  }
  if (!verifyPassword(password, data.settingValue)) {
    return { ok: false, message: "Kata laluan salah." };
  }
  return { ok: true };
}

// ---------- Change admin password ----------

export async function changeAdminPassword(
  current: string,
  next: string,
): Promise<AuthResult> {
  if (next.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Kata laluan baharu mestilah sekurang-kurangnya ${MIN_PASSWORD_LENGTH} aksara.`,
    };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tblSystemSettings")
    .select("settingValue")
    .eq("settingKey", "admin_password")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Kata laluan belum ditetapkan." };
  }
  if (!verifyPassword(current, data.settingValue)) {
    return { ok: false, message: "Kata laluan semasa salah." };
  }

  const { error: updErr } = await supabase
    .from("tblSystemSettings")
    .update({ settingValue: hashPassword(next) })
    .eq("settingKey", "admin_password");

  if (updErr) {
    return { ok: false, message: `Gagal menukar kata laluan: ${updErr.message}` };
  }
  return { ok: true, message: "Kata laluan telah ditukar." };
}