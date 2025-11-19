import * as React from "react"
import { logger } from "@/lib/config/logger"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      const width = window.innerWidth
      const isMobileValue = width < MOBILE_BREAKPOINT
      logger.debug("Window width changed", {
        width,
        isMobile: isMobileValue,
        breakpoint: MOBILE_BREAKPOINT,
      })
      setIsMobile(isMobileValue)
    }
    mql.addEventListener("change", onChange)
    const initialWidth = window.innerWidth
    const initialIsMobile = initialWidth < MOBILE_BREAKPOINT
    logger.debug("Initial window width", {
      width: initialWidth,
      isMobile: initialIsMobile,
      breakpoint: MOBILE_BREAKPOINT,
    })
    setIsMobile(initialIsMobile)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
