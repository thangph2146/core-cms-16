"use client"

import React, { useEffect, useRef, useCallback } from "react"
import { motion, type Variants } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Dot {
  x: number
  y: number
  baseColor: string
  targetOpacity: number
  currentOpacity: number
  opacitySpeed: number
  baseRadius: number
  currentRadius: number
}

/**
 * CMS Hero Section Component
 * Hero section với animated canvas background và responsive design
 */
export const HeroSection: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameId = useRef<number | null>(null)
  const animateDotsRef = useRef<(() => void) | null>(null)

  const dotsRef = useRef<Dot[]>([])
  const gridRef = useRef<Record<string, number[]>>({})
  const canvasSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 })
  const mousePositionRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null })

  const DOT_SPACING = 25
  const BASE_OPACITY_MIN = 0.3
  const BASE_OPACITY_MAX = 0.5
  const BASE_RADIUS = 1
  const INTERACTION_RADIUS = 150
  const INTERACTION_RADIUS_SQ = INTERACTION_RADIUS * INTERACTION_RADIUS
  const OPACITY_BOOST = 0.6
  const RADIUS_BOOST = 2.5
  const GRID_CELL_SIZE = Math.max(50, Math.floor(INTERACTION_RADIUS / 1.5))

  const handleMouseMove = useCallback(
    (event: globalThis.MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) {
        mousePositionRef.current = { x: null, y: null }
        return
      }
      const rect = canvas.getBoundingClientRect()
      const canvasX = event.clientX - rect.left
      const canvasY = event.clientY - rect.top
      mousePositionRef.current = { x: canvasX, y: canvasY }
    },
    [],
  )

  const createDots = useCallback(() => {
    const { width, height } = canvasSizeRef.current
    if (width === 0 || height === 0) return

    const newDots: Dot[] = []
    const newGrid: Record<string, number[]> = {}
    const cols = Math.ceil(width / DOT_SPACING)
    const rows = Math.ceil(height / DOT_SPACING)

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * DOT_SPACING + DOT_SPACING / 2
        const y = j * DOT_SPACING + DOT_SPACING / 2
        const cellX = Math.floor(x / GRID_CELL_SIZE)
        const cellY = Math.floor(y / GRID_CELL_SIZE)
        const cellKey = `${cellX}_${cellY}`

        if (!newGrid[cellKey]) {
          newGrid[cellKey] = []
        }

        const dotIndex = newDots.length
        newGrid[cellKey].push(dotIndex)

        const baseOpacity = Math.random() * (BASE_OPACITY_MAX - BASE_OPACITY_MIN) + BASE_OPACITY_MIN

        newDots.push({
          x,
          y,
          baseColor: `rgba(139, 92, 246, ${BASE_OPACITY_MAX})`,
          targetOpacity: baseOpacity,
          currentOpacity: baseOpacity,
          opacitySpeed: Math.random() * 0.005 + 0.002,
          baseRadius: BASE_RADIUS,
          currentRadius: BASE_RADIUS,
        })
      }
    }
    dotsRef.current = newDots
    gridRef.current = newGrid
  }, [DOT_SPACING, GRID_CELL_SIZE, BASE_OPACITY_MIN, BASE_OPACITY_MAX, BASE_RADIUS])

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const container = canvas.parentElement
    const width = container ? container.clientWidth : window.innerWidth
    const height = container ? container.clientHeight : window.innerHeight

    if (
      canvas.width !== width ||
      canvas.height !== height ||
      canvasSizeRef.current.width !== width ||
      canvasSizeRef.current.height !== height
    ) {
      canvas.width = width
      canvas.height = height
      canvasSizeRef.current = { width, height }
      createDots()
    }
  }, [createDots])

  const animateDots = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    const dots = dotsRef.current
    const grid = gridRef.current
    const { width, height } = canvasSizeRef.current
    const { x: mouseX, y: mouseY } = mousePositionRef.current

    if (!ctx || !dots || !grid || width === 0 || height === 0) {
      if (animationFrameId.current && animateDotsRef.current) {
        animationFrameId.current = requestAnimationFrame(animateDotsRef.current)
      }
      return
    }

    ctx.clearRect(0, 0, width, height)

    const activeDotIndices = new Set<number>()
    if (mouseX !== null && mouseY !== null) {
      const mouseCellX = Math.floor(mouseX / GRID_CELL_SIZE)
      const mouseCellY = Math.floor(mouseY / GRID_CELL_SIZE)
      const searchRadius = Math.ceil(INTERACTION_RADIUS / GRID_CELL_SIZE)
      for (let i = -searchRadius; i <= searchRadius; i++) {
        for (let j = -searchRadius; j <= searchRadius; j++) {
          const checkCellX = mouseCellX + i
          const checkCellY = mouseCellY + j
          const cellKey = `${checkCellX}_${checkCellY}`
          if (grid[cellKey]) {
            grid[cellKey].forEach((dotIndex) => activeDotIndices.add(dotIndex))
          }
        }
      }
    }

    dots.forEach((dot, index) => {
      dot.currentOpacity += dot.opacitySpeed
      if (dot.currentOpacity >= dot.targetOpacity || dot.currentOpacity <= BASE_OPACITY_MIN) {
        dot.opacitySpeed = -dot.opacitySpeed
        dot.currentOpacity = Math.max(BASE_OPACITY_MIN, Math.min(dot.currentOpacity, BASE_OPACITY_MAX))
        dot.targetOpacity = Math.random() * (BASE_OPACITY_MAX - BASE_OPACITY_MIN) + BASE_OPACITY_MIN
      }

      let interactionFactor = 0
      dot.currentRadius = dot.baseRadius

      if (mouseX !== null && mouseY !== null && activeDotIndices.has(index)) {
        const dx = dot.x - mouseX
        const dy = dot.y - mouseY
        const distSq = dx * dx + dy * dy

        if (distSq < INTERACTION_RADIUS_SQ) {
          const distance = Math.sqrt(distSq)
          interactionFactor = Math.max(0, 1 - distance / INTERACTION_RADIUS)
          interactionFactor = interactionFactor * interactionFactor
        }
      }

      const finalOpacity = Math.min(1, dot.currentOpacity + interactionFactor * OPACITY_BOOST)
      dot.currentRadius = dot.baseRadius + interactionFactor * RADIUS_BOOST

      ctx.beginPath()
      ctx.fillStyle = `rgba(139, 92, 246, ${finalOpacity.toFixed(3)})`
      ctx.arc(dot.x, dot.y, dot.currentRadius, 0, Math.PI * 2)
      ctx.fill()
    })

    if (animateDotsRef.current) {
      animationFrameId.current = requestAnimationFrame(animateDotsRef.current)
    }
  }, [
    GRID_CELL_SIZE,
    INTERACTION_RADIUS,
    INTERACTION_RADIUS_SQ,
    OPACITY_BOOST,
    RADIUS_BOOST,
    BASE_OPACITY_MIN,
    BASE_OPACITY_MAX,
  ])

  // Store animateDots function in ref to avoid circular dependency
  useEffect(() => {
    animateDotsRef.current = animateDots
  }, [animateDots])

  useEffect(() => {
    handleResize()
    const handleMouseLeave = () => {
      mousePositionRef.current = { x: null, y: null }
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    window.addEventListener("resize", handleResize)
    document.documentElement.addEventListener("mouseleave", handleMouseLeave)

    animationFrameId.current = requestAnimationFrame(animateDots)

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("mousemove", handleMouseMove)
      document.documentElement.removeEventListener("mouseleave", handleMouseLeave)
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
      }
    }
  }, [handleResize, handleMouseMove, animateDots])

  const contentDelay = 0.3
  const itemDelayIncrement = 0.1

  const headlineVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: contentDelay } },
  }

  const subHeadlineVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, delay: contentDelay + itemDelayIncrement },
    },
  }

  const buttonGroupVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, delay: contentDelay + itemDelayIncrement * 2 },
    },
  }

  return (
    <div className="relative bg-background text-foreground min-h-screen flex flex-col overflow-x-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none opacity-60" />

      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, hsl(var(--background)) 90%), radial-gradient(ellipse at center, transparent 40%, hsl(var(--background)) 95%)",
        }}
      />

      <main className="flex-grow flex flex-col items-center justify-center text-center px-4 pt-32 pb-16 relative z-10">
        <motion.h1
          variants={headlineVariants}
          initial="hidden"
          animate="visible"
          className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight max-w-4xl mb-6"
        >
          Hệ thống quản trị{" "}
          <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
            nội dung thông minh
          </span>
        </motion.h1>

        <motion.p
          variants={subHeadlineVariants}
          initial="hidden"
          animate="visible"
          className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto mb-8"
        >
          Quản lý nội dung dễ dàng với giao diện trực quan, tính năng mạnh mẽ và khả năng tùy chỉnh linh hoạt. Tối
          ưu hóa quy trình làm việc và nâng cao hiệu suất của đội ngũ.
        </motion.p>

        <motion.div
          variants={buttonGroupVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mx-auto"
        >
          <Button size="lg" className="w-full sm:w-auto shadow-lg" asChild>
            <Link href="/auth/sign-up">Đăng ký ngay</Link>
          </Button>
          <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
            <Link href="/auth/sign-in">Đăng nhập</Link>
          </Button>
        </motion.div>
      </main>
    </div>
  )
}
