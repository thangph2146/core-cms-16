"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useClientOnly } from "@/hooks/use-client-only"

/**
 * Not Found Client Component
 * 
 * Chứa toàn bộ UI logic cho 404 page
 * Được import bởi server component not-found.tsx để có thể export metadata
 */

// Helper function để tạo particles với seed để tránh impure function
function createParticles(seed: number = 0) {
  // Sử dụng seed để tạo pseudo-random values
  const random = (offset: number) => {
    const x = Math.sin((seed + offset) * 12.9898) * 43758.5453
    return x - Math.floor(x)
  }
  
  return Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: random(i * 7) * 100,
    y: random(i * 11) * 100,
    size: random(i * 13) * 4 + 2,
    duration: random(i * 17) * 10 + 10,
    delay: random(i * 19) * 5,
  }))
}

// Floating particles component
function FloatingParticles() {
  // Chỉ render particles sau khi component mount trên client để tránh hydration mismatch
  const isMounted = useClientOnly()
  // Sử dụng useState với lazy initializer để tạo particles một lần duy nhất
  // Sử dụng ref pattern để tránh impure function trong render
  const [particles] = useState(() => {
    if (typeof window !== "undefined") {
      // Sử dụng performance.now() hoặc một giá trị cố định để tránh impure function
      // Tạo seed từ một giá trị stable
      const seed = Math.floor(Math.random() * 1000000) // Chỉ chạy một lần khi mount
      return createParticles(seed)
    }
    return createParticles(0)
  })

  if (!isMounted) {
    return null
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-primary/20 dark:bg-primary/10"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, (particle.id % 3 - 1) * 10, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

function Animated404() {
  return (
    <div className="relative">
      <motion.div
        className="text-[120px] md:text-[180px] font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 20,
        }}
      >
        404
      </motion.div>
      <motion.div
        className="absolute inset-0 blur-3xl bg-primary/20 rounded-full"
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

export function NotFoundClient() {
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
        <div className="text-center space-y-8">
          {/* 404 Animation */}
          <motion.div variants={itemVariants}>
            <Animated404 />
          </motion.div>

          {/* Error Message */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold">
              Trang không tìm thấy
            </h1>
            <p className="text-muted-foreground text-lg">
              Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div variants={itemVariants}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="min-w-[160px]">
                <Link href="/">Về trang chủ</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="min-w-[160px]"
              >
                <Link href="/admin/dashboard">Về Dashboard</Link>
              </Button>
            </div>
          </motion.div>

          {/* Helpful Links */}
          <motion.div variants={itemVariants}>
            <div className="mt-8 p-6 bg-muted/50 rounded-lg border border-border/50">
              <p className="text-sm text-muted-foreground mb-4">
                Bạn có thể thử:
              </p>
              <ul className="text-left space-y-2 text-sm text-muted-foreground">
                <li>• Kiểm tra lại URL đã nhập đúng chưa</li>
                <li>• Quay lại trang trước đó</li>
                <li>• Sử dụng menu điều hướng để tìm trang bạn cần</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

