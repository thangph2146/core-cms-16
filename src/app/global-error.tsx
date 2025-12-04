"use client";

import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

/**
 * Global Error Boundary Component
 *
 * Theo Next.js 16 conventions:
 * - File global-error.tsx được đặt ở app directory để handle errors toàn cục
 * - Phải là Client Component ("use client")
 * - Phải include <html> và <body> tags vì nó wrap toàn bộ app
 * - Chỉ được đặt ở root layout level
 *
 * Xem thêm: https://nextjs.org/docs/app/api-reference/file-conventions/error
 */

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-muted/20 to-background">
          <motion.div
            className="w-full max-w-lg"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="rounded-xl border border-destructive/50 bg-card shadow-lg p-6 md:p-8">
              {/* Icon */}
              <motion.div
                variants={itemVariants}
                className="flex justify-center mb-6"
              >
                <div className="rounded-full bg-destructive/10 p-4">
                  <AlertTriangle className="h-10 w-10 text-destructive" />
                </div>
              </motion.div>

              {/* Title & Description */}
              <motion.div
                variants={itemVariants}
                className="text-center space-y-3 mb-6"
              >
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  Đã xảy ra lỗi nghiêm trọng
                </h1>
                <p className="text-muted-foreground text-base md:text-lg">
                  {error.message || "Đã xảy ra lỗi không mong muốn"}
                </p>
              </motion.div>

              {/* Error Details */}
              {error.digest && (
                <motion.div
                  variants={itemVariants}
                  className="rounded-lg bg-muted p-4 border mb-6"
                >
                  <p className="text-xs font-mono text-muted-foreground text-center">
                    <span className="font-semibold">Error ID:</span>{" "}
                    {error.digest}
                  </p>
                </motion.div>
              )}

              {/* Help Text */}
              <motion.div
                variants={itemVariants}
                className="rounded-lg bg-muted/50 p-4 border border-destructive/20 mb-6"
              >
                <p className="text-sm text-muted-foreground text-center">
                  Đã xảy ra lỗi nghiêm trọng trong ứng dụng. Vui lòng thử lại
                  hoặc quay về trang chủ. Nếu vấn đề vẫn tiếp tục, vui lòng liên
                  hệ với bộ phận hỗ trợ kỹ thuật.
                </p>
              </motion.div>

              {/* Actions */}
              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row gap-3 justify-center"
              >
                <button
                  onClick={reset}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 h-10 px-6 bg-primary text-primary-foreground shadow-sm shadow-black/5 hover:bg-primary/90 cursor-pointer"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Thử lại
                </button>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 h-10 px-6 border border-input bg-background shadow-sm shadow-black/5 hover:bg-accent hover:text-accent-foreground"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Về trang chủ
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </body>
    </html>
  );
}
