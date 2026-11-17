import type { NextConfig } from "next";
import withFlowbiteReact from "flowbite-react/plugin/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Student photos are up to 4 MB (src/lib/media.ts) plus multipart overhead; Vercel caps bodies at 4.5 MB
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
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