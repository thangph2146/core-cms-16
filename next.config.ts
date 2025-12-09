/**
 * Next.js 16 Configuration
 * 
 * Optimizations for Performance & SEO
 * Follows Next.js 16 + Turbopack best practices
 */

import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**", pathname: "/**" },
      { protocol: "http", hostname: "**", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "source.unsplash.com", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  compress: true,
  poweredByHeader: false,
  
  // Optimize package imports for better tree-shaking
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "framer-motion",
      "@radix-ui/react-avatar",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
    ],
  },
  
  // Turbopack configuration (Next.js 16 default)
  // Turbopack handles code splitting automatically
  turbopack: {},
  
  // Webpack config only for non-Turbopack builds (fallback)
  webpack: (config, { isServer, dev }) => {
    if (!isServer && !dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            default: false,
            vendors: false,
            framerMotion: {
              name: "framer-motion",
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              chunks: "all",
              priority: 20,
            },
            radixUI: {
              name: "radix-ui",
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              chunks: "all",
              priority: 15,
            },
            lexical: {
              name: "lexical",
              test: /[\\/]node_modules[\\/]lexical[\\/]/,
              chunks: "all",
              priority: 15,
            },
            vendor: {
              name: "vendor",
              test: /[\\/]node_modules[\\/]/,
              chunks: "all",
              priority: 10,
              minChunks: 2,
            },
          },
        },
      }
    }
    return config
  },
  
  // Unique build ID for cache busting
  generateBuildId: async () => `build-${Date.now()}`,
}

export default nextConfig
