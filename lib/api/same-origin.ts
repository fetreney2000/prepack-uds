// Same-origin guard for plain route handlers. Next.js Server Actions already
// enforce origin/host for non-GET requests; fetch-based Route Handlers do not,
// so apply the same protection to any state-changing (POST) route that mutates
// via the service-role client. This blocks cross-site request forgery from
// browsers while still allowing non-browser callers (curl, LAN scripts) that
// send no Origin header.
export function isSameOriginRequest(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const host = req.headers.get("host") ?? req.headers.get("x-forwarded-host");
    return !!host && originHost === host;
  } catch {
    return false;
  }
}
