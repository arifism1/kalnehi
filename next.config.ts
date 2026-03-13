import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // ESLint is configured via eslint.config.mjs.
  // For Vercel/Next 16 builds, we disable linting in the build command instead.
};

export default nextConfig;

