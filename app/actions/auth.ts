// Server Actions — authentication (single shared password)
// Phase 4 implementation. Placeholder for Phase 0.
"use server";

export async function verifyAdminPassword(_password: string): Promise<boolean> {
  // TODO(Phase 4): read tblSystemSettings.admin_password, PBKDF2 verify.
  return false;
}

export async function changeAdminPassword(_current: string, _new: string): Promise<{ ok: boolean; message: string }> {
  // TODO(Phase 4): verify current, re-hash + update (min 6 chars).
  return { ok: false, message: "Belum dilaksanakan" };
}