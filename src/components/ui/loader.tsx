/**
 * 3D Loading Animation Component với Framer Motion
 * Hiển thị animation "LOADING" với hiệu ứng sóng to dần
 * Chữ đen nền trắng với wave effect scale
 */
"use client"

import { motion } from "framer-motion"

const letters = ["L", "O", "A", "D", "I", "N", "G"]

interface CubeProps {
  letter: string
  index: number
}

function Cube({ letter, index }: CubeProps) {
  // Wave effect với delay tăng dần để tạo sóng to dần
  const waveDelay = index * 0.1
  const animationDuration = 1.5
  
  // Base transform cho cube size (24px = half of 48px base)
  const cubeDepth = 24

  return (
    <motion.div
      className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20"
      style={{
        transformStyle: "preserve-3d",
      }}
      animate={{
        rotateX: [0, 5, 0],
        rotateY: [0, 5, 0],
        y: [0, -1, 0],
      }}
      transition={{
        duration: animationDuration,
        repeat: Infinity,
        ease: "easeInOut",
        delay: waveDelay,
      }}
    >
      {/* Front face - có chữ */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center border border-gray-200 bg-white text-xl font-bold text-black sm:text-2xl md:text-3xl"
        style={{
          transform: `translateZ(${cubeDepth}px)`,
        }}
      >
        <motion.span
          className="select-none relative z-10"
          animate={{
            scale: [1, 1.3, 1],
            y: [0, -5, 0],
          }}
          transition={{
            duration: animationDuration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: waveDelay,
          }}
        >
          {letter}
        </motion.span>
      </motion.div>

      {/* Back face */}
      <div
        className="absolute inset-0 border border-gray-200 bg-gray-50"
        style={{
          transform: `translateZ(-${cubeDepth}px) rotateY(180deg)`,
        }}
      />

      {/* Right face */}
      <div
        className="absolute inset-0 border border-gray-200 bg-gray-50"
        style={{
          transform: `rotateY(90deg) translateZ(${cubeDepth}px)`,
        }}
      />

      {/* Left face */}
      <div
        className="absolute inset-0 border border-gray-200 bg-gray-50"
        style={{
          transform: `rotateY(-90deg) translateZ(${cubeDepth}px)`,
        }}
      />

      {/* Top face */}
      <div
        className="absolute inset-0 border border-gray-200 bg-gray-50"
        style={{
          transform: `rotateX(90deg) translateZ(${cubeDepth}px)`,
        }}
      />

      {/* Bottom face */}
      <div
        className="absolute inset-0 border border-gray-200 bg-gray-50"
        style={{
          transform: `rotateX(-90deg) translateZ(${cubeDepth}px)`,
        }}
      />
    </motion.div>
  )
}

interface LoaderProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export const Loader = ({ className, size = "md" }: LoaderProps) => {
  // Container animation với stagger children
  const containerVariants = {
    initial: {
      opacity: 0,
    },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  }

  // Size classes
  const sizeClasses = {
    sm: "gap-1",
    md: "gap-1 sm:gap-2 md:gap-3",
    lg: "gap-2 sm:gap-3 md:gap-4",
  }

  return (
    <motion.div
      className={`flex items-center justify-center ${sizeClasses[size]} ${className || ""}`}
      style={{
        perspective: "1000px",
        transformStyle: "preserve-3d",
      }}
      variants={containerVariants}
      initial="initial"
      animate="animate"
      aria-label="Đang tải"
      role="status"
    >
      {letters.map((letter, index) => (
        <motion.div
          key={`${letter}-${index}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.4,
            delay: index * 0.06,
            type: "spring",
            stiffness: 200,
            damping: 15,
          }}
        >
          <Cube letter={letter} index={index} />
        </motion.div>
      ))}
    </motion.div>
  )
}

