/**
 * Session Provider for NextAuth
 */
"use client"

import { SessionProvider } from "next-auth/react"
import { Providers as QueryProviders } from "@/lib/api/client"
import type { ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <QueryProviders>{children}</QueryProviders>
    </SessionProvider>
  )
}

