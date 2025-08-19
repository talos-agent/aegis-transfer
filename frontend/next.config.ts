import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export', // Temporarily disabled to support dynamic routes
  trailingSlash: true,
  basePath: process.env.NODE_ENV === 'production' ? "/aegis-transfer" : "",
  images: { unoptimized: true }
};

export default nextConfig;
