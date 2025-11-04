"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"

/**
 * Not Found Page
 * 
 * Theo Next.js 16 conventions:
 * - File not-found.tsx được đặt ở app directory để handle 404 errors
 * - Tự động được render khi route không tồn tại
 * - Có thể được trigger bằng notFound() function từ Server Components
 * 
 * Xem thêm: https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 */

// Helper function để tạo particles (gọi bên ngoài render)
function createParticles() {
  return Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 10 + 10,
    delay: Math.random() * 5,
  }))
}

// Floating particles component
function FloatingParticles() {
  // Sử dụng lazy initialization với useState để tránh gọi Math.random() trong render
  const [particles] = useState(() => createParticles())

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-primary/20 blur-sm"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, particle.x * 0.2 - 10, 0],
            opacity: [0.2, 0.5, 0.2],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

// Animated 404 number
function Animated404() {
  return (
    <div className="relative inline-block">
      <motion.div
        className="text-8xl sm:text-9xl font-black tracking-tight"
        initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          rotate: 0,
        }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 20,
          duration: 0.8,
        }}
      >
        <span className="bg-gradient-to-br from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent drop-shadow-2xl">
          4
        </span>
        <motion.span
          className="bg-gradient-to-br from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent"
          animate={{
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          0
        </motion.span>
        <span className="bg-gradient-to-br from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent drop-shadow-2xl">
          4
        </span>
      </motion.div>
      
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 bg-primary/20 blur-3xl -z-10"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  )
}


export default function NotFound() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
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

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-background via-muted/30 to-background"
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%"],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "linear",
        }}
      />
      
      {/* Floating particles */}
      <FloatingParticles />

      {/* Main content */}
      <motion.div
        className="relative z-10 w-full max-w-2xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
          <CardHeader className="text-center space-y-6 pb-2">
            <Animated404 />
            
            <motion.div variants={itemVariants}>
              <CardDescription className="text-xl sm:text-2xl font-semibold text-foreground/90 mt-6">
                Trang không tồn tại
              </CardDescription>
            </motion.div>
          </CardHeader>

          <CardContent className="text-center space-y-4">
            <motion.p
              variants={itemVariants}
              className="text-muted-foreground text-base sm:text-lg leading-relaxed"
            >
              Xin lỗi, chúng tôi không tìm thấy trang bạn đang tìm kiếm.
              <br />
              Trang này có thể đã bị di chuyển, xóa hoặc URL không chính xác.
            </motion.p>
            
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap gap-2 justify-center text-sm text-muted-foreground pt-2"
            >
              <span className="px-3 py-1 rounded-full bg-muted/50">Có thể thử:</span>
              <span className="px-3 py-1 rounded-full bg-muted/50">Kiểm tra lại URL</span>
              <span className="px-3 py-1 rounded-full bg-muted/50">Quay lại trang trước</span>
            </motion.div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
            <motion.div
              variants={itemVariants}
              className="w-full sm:flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button asChild className="w-full h-11 text-base shadow-lg">
                <Link href="/">
                  <motion.span
                    className="flex items-center gap-2"
                    whileHover={{ x: -2 }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    Về trang chủ
                  </motion.span>
                </Link>
              </Button>
            </motion.div>
            
            <motion.div
              variants={itemVariants}
              className="w-full sm:flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button asChild variant="outline" className="w-full h-11 text-base border-2">
                <Link href="/admin/dashboard">
                  <motion.span
                    className="flex items-center gap-2"
                    whileHover={{ x: -2 }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="7" height="9" x="3" y="3" rx="1" />
                      <rect width="7" height="5" x="14" y="3" rx="1" />
                      <rect width="7" height="9" x="14" y="12" rx="1" />
                      <rect width="7" height="5" x="3" y="16" rx="1" />
                    </svg>
                    Về Dashboard
                  </motion.span>
                </Link>
              </Button>
            </motion.div>
          </CardFooter>
      </motion.div>
    </div>
  )
}

