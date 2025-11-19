"use client"

import { useEffect, useMemo, useState } from "react"
import { useElementSize } from "@/hooks/use-element-size"

export interface UseChatMessagesHeightOptions {
  /** Breakpoint below which we treat layout as mobile */
  mobileBreakpoint?: number
  /** Fixed height to use for messages area on mobile */
  mobileFixedHeight?: number
  /** Extra pixels to subtract from available height (padding, gaps, etc.) */
  additionalOffsets?: number
}

const DEFAULT_MOBILE_BREAKPOINT = 768
const DEFAULT_MOBILE_MESSAGES_HEIGHT = 717
const ADMIN_HEADER_SELECTOR = '[data-admin-header="true"]'

export function useChatMessagesHeight(options: UseChatMessagesHeightOptions = {}) {
  const {
    mobileBreakpoint = DEFAULT_MOBILE_BREAKPOINT,
    mobileFixedHeight = DEFAULT_MOBILE_MESSAGES_HEIGHT,
    additionalOffsets = 20,
  } = options

  const adminHeaderSize = useElementSize<HTMLElement>()
  const chatHeaderSize = useElementSize<HTMLDivElement>()
  const chatInputSize = useElementSize<HTMLDivElement>()

  const adminHeaderRef = adminHeaderSize.ref
  const chatHeaderRef = chatHeaderSize.ref
  const chatInputRef = chatInputSize.ref

  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window === "undefined" ? 0 : window.innerWidth,
    height: typeof window === "undefined" ? 0 : window.innerHeight,
  }))

  // Keep viewport size in sync with window dimensions
  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight })
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Attach admin header element to measurement hook
  useEffect(() => {
    if (typeof document === "undefined") {
      return
    }

    const header = document.querySelector<HTMLElement>(ADMIN_HEADER_SELECTOR)
    if (!header) {
      return
    }

    adminHeaderRef(header)
    return () => {
      adminHeaderRef(null)
    }
  }, [adminHeaderRef])

  const isMobile = viewportSize.width > 0 && viewportSize.width < mobileBreakpoint

  const reservedHeight =
    adminHeaderSize.height +
    chatHeaderSize.height +
    chatInputSize.height +
    additionalOffsets

  const availableHeight =
    viewportSize.height > 0 ? Math.max(0, viewportSize.height - reservedHeight) : undefined

  const messagesHeight = useMemo(() => {
    if (isMobile) {
      if (availableHeight === undefined) {
        return mobileFixedHeight
      }
      return Math.max(0, Math.min(mobileFixedHeight, availableHeight))
    }

    if (availableHeight === undefined) {
      return undefined
    }

    return availableHeight || undefined
  }, [availableHeight, isMobile, mobileFixedHeight])

  return {
    /** Attach to chat header container */
    chatHeaderRef,
    /** Attach to chat input container (including reply banner area) */
    chatInputRef,
    /** Computed messages area height that keeps total at ~100dvh */
    messagesHeight,
    /** Individual element heights for debugging/advanced use */
    elements: {
      adminHeader: adminHeaderSize.height,
      chatHeader: chatHeaderSize.height,
      chatInput: chatInputSize.height,
    },
    viewportHeight: viewportSize.height,
    viewportWidth: viewportSize.width,
    isMobile,
  }
}
