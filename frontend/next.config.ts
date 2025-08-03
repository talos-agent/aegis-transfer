import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: process.env.NODE_ENV === 'production' ? "/aegis-transfer" : "",
  images: { unoptimized: true }
};

export default nextConfig;
