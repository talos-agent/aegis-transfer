import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export', // Disabled to support dynamic routes for shareable invoice links
  trailingSlash: true,
  basePath: process.env.NODE_ENV === 'production' ? "/aegis-transfer" : "",
  images: { unoptimized: true }
};

export default nextConfig;
