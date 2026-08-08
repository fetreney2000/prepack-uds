import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Silence the "multiple lockfiles" workspace-root inference warning:
  // the parent directory (d:\Projek\prepack-uds) contains an unrelated
  // package-lock.json. Pin the tracing root to this project.
  outputFileTracingRoot: path.join(__dirname),
  // pdfkit loads its built-in AFM font metrics from node_modules at
  // runtime. Bundling it into the route breaks that path (ENOENT
  // .../data/Helvetica.afm). Keep it external so Vercel ships it from
  // node_modules/pdfkit/js/data/.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;