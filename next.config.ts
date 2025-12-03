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
  // Turbopack tự động xử lý code splitting tốt hơn webpack
  // Chỉ cần cấu hình khi cần tùy chỉnh đặc biệt
  turbopack: {},
  
  // Webpack configuration for production build (khi không dùng Turbopack)
  // Bundle splitting cho better caching
  webpack: (config, { isServer, dev }) => {
    // Chỉ áp dụng cho production build với webpack
    // Turbopack sẽ tự động xử lý code splitting trong dev mode
    if (!isServer && !dev) {
      // Optimize client-side bundle splitting
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            // Separate vendor chunks for better caching
            default: false,
            vendors: false,
            // Framer Motion in separate chunk
            framerMotion: {
              name: "framer-motion",
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              chunks: "all",
              priority: 20,
            },
            // Radix UI in separate chunk
            radixUI: {
              name: "radix-ui",
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              chunks: "all",
              priority: 15,
            },
            // Lexical editor in separate chunk
            lexical: {
              name: "lexical",
              test: /[\\/]node_modules[\\/]lexical[\\/]/,
              chunks: "all",
              priority: 15,
            },
            // Common vendor chunk
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
};

export default nextConfig;
