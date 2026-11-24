import type { NextConfig } from "next";
import withFlowbiteReact from "flowbite-react/plugin/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Student photos are up to 4 MB (src/lib/media.ts) plus multipart overhead; Vercel caps bodies at 4.5 MB
  // flowbite-react isn't in Next's default barrel list; this compiles only the components a page imports
  // instantInsights: pages await their data under (app)/loading.tsx by design (a search keeps the old list until the
  // new one arrives), so the dev overlay flagged every page; only pages exporting `instant` are checked now
  experimental: {
    serverActions: { bodySizeLimit: "4.5mb" },
    optimizePackageImports: ["flowbite-react"],
    instantInsights: { validationLevel: "manual-warning" },
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withFlowbiteReact(nextConfig);
