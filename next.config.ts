import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  compress: true,
  // Kinetic has 2 GiB: bound prerender workers and Webpack peak memory.
  experimental: { cpus: 1, webpackBuildWorker: true, webpackMemoryOptimizations: true },
};

export default nextConfig;
