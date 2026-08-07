import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Silence the "multiple lockfiles" workspace-root inference warning:
  // the parent directory (d:\Projek\prepack-uds) contains an unrelated
  // package-lock.json. Pin the tracing root to this project.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;