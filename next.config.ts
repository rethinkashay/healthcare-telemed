import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // We can still ignore TypeScript errors here
    ignoreBuildErrors: true,
  },
};

export default nextConfig;