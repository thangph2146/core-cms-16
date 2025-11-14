"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { DEFAULT_RESOURCE_SEGMENT, applyResourceSegmentToPath } from "@/lib/permissions"

const ResourceSegmentContext = React.createContext<string>(DEFAULT_RESOURCE_SEGMENT)

export interface ResourceSegmentProviderProps {
  value: string
  children: React.ReactNode
}

export function ResourceSegmentProvider({ value, children }: ResourceSegmentProviderProps) {
  return (
    <ResourceSegmentContext.Provider value={value}>
      {children}
    </ResourceSegmentContext.Provider>
  )
}

export function useResourceSegment(): string {
  return React.useContext(ResourceSegmentContext)
}

export function useResourcePath(path: string): string {
  const segment = useResourceSegment()
  return applyResourceSegmentToPath(path, segment)
}

type RouterUrl = string

export function useResourceRouter() {
  const router = useRouter()
  const segment = useResourceSegment()

  return React.useMemo(() => {
    return {
      ...router,
      push: (url: RouterUrl, options?: Parameters<typeof router.push>[1]) =>
        router.push(applyResourceSegmentToPath(url, segment), options),
      replace: (url: RouterUrl, options?: Parameters<typeof router.replace>[1]) =>
        router.replace(applyResourceSegmentToPath(url, segment), options),
    }
  }, [router, segment])
}

