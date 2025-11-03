/**
 * Root Providers Component
 *
 * Tổng hợp tất cả providers cần thiết cho ứng dụng:
 * 1. ThemeProvider - Dark mode support (ngoài cùng để wrap toàn bộ app)
 * 2. Suspense - Xử lý async loading trong Next.js 16
 * 3. SessionProvider - NextAuth.js authentication
 * 4. QueryProvider - TanStack Query data fetching
 *
 * Thứ tự providers quan trọng:
 * - ThemeProvider ngoài cùng (cần có sẵn cho tất cả components)
 * - Suspense wrap các providers có thể async
 * - SessionProvider và QueryProvider theo thứ tự logic
 *
 * @see https://ui.shadcn.com/docs/dark-mode/next
 * @see https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming
 */
"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "./theme-provider";
import { SessionProvider } from "./session-provider";
import { QueryProvider } from "./query-provider";

export interface ProvidersProps {
  children: ReactNode;
}

/**
 * Main Providers component
 * Wrap toàn bộ app với các providers cần thiết
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <QueryProvider>{children}</QueryProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
