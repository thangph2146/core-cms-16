"use client"

import { AlertCircle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * Error Boundary Component
 * 
 * Theo Next.js 16 conventions:
 * - File error.tsx được đặt ở app directory để handle errors
 * - Phải là Client Component ("use client")
 * - Tự động được render khi có error trong Server Components hoặc Client Components
 * 
 * Xem thêm: https://nextjs.org/docs/app/api-reference/file-conventions/error
 */

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
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
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-muted/20 to-background">
      <motion.div
        className="w-full max-w-md"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="border-destructive/50 shadow-lg">
          <CardHeader className="text-center space-y-4 pb-4">
            <motion.div variants={itemVariants} className="flex justify-center">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </motion.div>
            <motion.div variants={itemVariants} className="space-y-2">
              <CardTitle className="text-2xl md:text-3xl">
                Đã xảy ra lỗi
              </CardTitle>
              <CardDescription className="text-base">
                {error.message || "Đã xảy ra lỗi không mong muốn"}
              </CardDescription>
            </motion.div>
          </CardHeader>

          <CardContent className="space-y-4">
            {error.digest && (
              <motion.div
                variants={itemVariants}
                className="rounded-lg bg-muted p-3 border"
              >
                <p className="text-xs font-mono text-muted-foreground">
                  <span className="font-semibold">Error ID:</span> {error.digest}
                </p>
              </motion.div>
            )}

            <motion.div
              variants={itemVariants}
              className="rounded-lg bg-muted/50 p-4 border border-destructive/20"
            >
              <p className="text-sm text-muted-foreground text-center">
                Vui lòng thử lại hoặc quay về trang chủ. Nếu vấn đề vẫn tiếp tục,
                vui lòng liên hệ với bộ phận hỗ trợ.
              </p>
            </motion.div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center">
            <motion.div variants={itemVariants} className="w-full sm:w-auto">
              <Button
                onClick={reset}
                size="lg"
                className="w-full sm:w-auto"
                variant="default"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Thử lại
              </Button>
            </motion.div>
            <motion.div variants={itemVariants} className="w-full sm:w-auto">
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Về trang chủ
                </Link>
              </Button>
            </motion.div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

