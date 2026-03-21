import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Static export — zero cost on Firebase Hosting
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;
