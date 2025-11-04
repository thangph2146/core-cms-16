/**
 * Root Providers Component
 *
 * Tổng hợp tất cả providers cần thiết cho ứng dụng:
 * 1. ThemeProvider - Dark mode support (ngoài cùng để wrap toàn bộ app)
 * 2. SessionProvider - NextAuth.js authentication
 * 3. QueryProvider - TanStack Query data fetching
 *
 * Thứ tự providers quan trọng:
 * - ThemeProvider ngoài cùng (cần có sẵn cho tất cả components)
 * - SessionProvider và QueryProvider theo thứ tự logic
 *
 * Lưu ý: Đây là Client Component, không cần Suspense ở đây.
 * Suspense boundaries nên được đặt ở layout hoặc page level
 * cho các async Server Components.
 *
 * @see https://ui.shadcn.com/docs/dark-mode/next
 * @see https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming
 */
"use client"

import type { ReactNode } from "react"
import type { Session } from "next-auth"
import { ThemeProvider } from "./theme-provider"
import { SessionProvider } from "./session-provider"
import { QueryProvider } from "./query-provider"
import { LoadingFallback } from "./loading-fallback"
import { Suspense } from "react"

export interface ProvidersProps {
  children: ReactNode
  initialSession?: Session | null
}

/**
 * Main Providers component
 * Wrap toàn bộ app với các providers cần thiết
 */
export function Providers({ children, initialSession }: ProvidersProps) {
  return (
    <ThemeProvider>
      <Suspense fallback={<LoadingFallback />}>
        <SessionProvider session={initialSession}>
          <QueryProvider>{children}</QueryProvider>
        </SessionProvider>
      </Suspense>
    </ThemeProvider>
  )
}
