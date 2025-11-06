/**
 * ForbiddenNotice Component
 * 
 * Component chung để hiển thị thông báo không có quyền truy cập
 * Với animation và UI/UX ấn tượng
 */

"use client"

import { useRouter } from "next/navigation"
import { ShieldX, ArrowLeft, Home, Lock } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface ForbiddenNoticeProps {
  breadcrumbs?: Array<{ label: string; href?: string; isActive?: boolean }>
  message?: string
  title?: string
  showBackButton?: boolean
  showHomeButton?: boolean
  homeUrl?: string
}

const containerVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1] as const,
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
}

const iconVariants = {
  hidden: { opacity: 0, scale: 0, rotate: -180 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 15,
      delay: 0.2,
    },
  },
}

export function ForbiddenNotice({
  message = "Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị viên nếu bạn cần quyền truy cập.",
  title = "Không có quyền truy cập",
  showBackButton = true,
  showHomeButton = true,
  homeUrl = "/admin/dashboard",
}: ForbiddenNoticeProps) {
  const router = useRouter()

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push(homeUrl)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-6 lg:p-8 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-destructive/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-destructive/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-lg"
      >
        <Card className="relative overflow-hidden border-destructive/20 bg-gradient-to-br from-background via-background/98 to-background/95 shadow-2xl shadow-destructive/5 backdrop-blur-sm">
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 via-transparent to-destructive/5 pointer-events-none" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-destructive/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <CardContent className="relative pt-16 pb-10 px-6 md:px-10">
            <div className="flex flex-col items-center text-center space-y-8">
              {/* Animated Icon */}
              <motion.div variants={iconVariants} className="relative">
                {/* Outer pulsing ring */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.1, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <div className="absolute inset-0 rounded-full bg-destructive/20" />
                </motion.div>

                {/* Middle ring */}
                <div className="absolute inset-0 rounded-full bg-destructive/10 animate-pulse" />

                {/* Icon container */}
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-destructive/20 via-destructive/10 to-destructive/5 border-2 border-destructive/30 shadow-lg shadow-destructive/20">
                  <motion.div
                    animate={{
                      rotate: [0, -10, 10, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 1,
                    }}
                  >
                    <ShieldX className="h-12 w-12 text-destructive" strokeWidth={2.5} />
                  </motion.div>
                  
                  {/* Lock icon overlay */}
                  <motion.div
                    className="absolute -bottom-1 -right-1"
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                    }}
                  >
                    <div className="rounded-full bg-background border-2 border-destructive/30 p-1.5 shadow-md">
                      <Lock className="h-4 w-4 text-destructive" strokeWidth={2} />
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* Title và Message */}
              <motion.div variants={itemVariants} className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                  {title}
                </h1>
                <p className="text-sm md:text-base text-muted-foreground max-w-md leading-relaxed mx-auto">
                  {message}
                </p>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto pt-2"
              >
                {showBackButton && (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="outline"
                      onClick={handleGoBack}
                      className="w-full sm:w-auto min-w-[160px] h-11 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Quay lại
                    </Button>
                  </motion.div>
                )}
                {showHomeButton && (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="default"
                      onClick={() => router.push(homeUrl)}
                      className="w-full sm:w-auto min-w-[160px] h-11 shadow-md hover:shadow-lg transition-shadow"
                    >
                      <Home className="mr-2 h-4 w-4" />
                      Về trang chủ
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
