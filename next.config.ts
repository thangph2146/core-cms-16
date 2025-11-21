import type { NextConfig } from "next";

/**
 * Next.js 16 Configuration
 * 
 * Optimizations for Performance & SEO:
 * - Image optimization với remote patterns
 * - Compression và minification
 * - Production optimizations
 */
const nextConfig: NextConfig = {
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "**",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
  },
  
  // Compression
  compress: true,
  
  // Production optimizations
  poweredByHeader: false,
  
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },
};

export default nextConfig;
