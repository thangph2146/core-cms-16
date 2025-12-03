"use client"

import { startTransition, useEffect, useRef, useState } from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Always start with false to match server render
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const hasInitialized = useRef(false)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    if (!hasInitialized.current) {
      // Use startTransition to defer the update and avoid cascading renders
      startTransition(() => {
        setIsMobile(mql.matches)
      })
      hasInitialized.current = true
    }

    // Subscribe to changes
    const onChange = () => setIsMobile(mql.matches)
    mql.addEventListener("change", onChange)

    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
