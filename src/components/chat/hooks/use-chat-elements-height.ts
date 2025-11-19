/**
 * Hook để đo height của các elements trong chat và tự động tính toán height cho MessagesArea
 * Theo dõi: chat-header, admin-header, reply-banner, deleted-banner, chat-input
 */

"use client"

import { useEffect, useState, useLayoutEffect, useCallback, useRef } from "react"

export interface ChatElementsHeights {
  chatHeader: number
  adminHeader: number
  replyBanner: number
  deletedBanner: number
  chatInput: number
}

export interface UseChatElementsHeightParams {
  chatHeaderRef?: React.RefObject<HTMLElement | null>
  adminHeaderRef?: React.RefObject<HTMLElement | null>
  replyBannerRef?: React.RefObject<HTMLElement | null>
  deletedBannerRef?: React.RefObject<HTMLElement | null>
  chatInputRef?: React.RefObject<HTMLElement | null>
}

/**
 * Hook để đo height của các elements trong chat
 * Sử dụng ResizeObserver để tự động cập nhật khi elements thay đổi size
 */
export function useChatElementsHeight({
  chatHeaderRef,
  adminHeaderRef,
  replyBannerRef,
  deletedBannerRef,
  chatInputRef,
}: UseChatElementsHeightParams = {}): ChatElementsHeights {
  const [heights, setHeights] = useState<ChatElementsHeights>({
    chatHeader: 0,
    adminHeader: 0,
    replyBanner: 0,
    deletedBanner: 0,
    chatInput: 0,
  })

  // Store refs in a ref to avoid stale closures
  const refsRef = useRef({ chatHeaderRef, adminHeaderRef, replyBannerRef, deletedBannerRef, chatInputRef })
  useEffect(() => {
    refsRef.current = { chatHeaderRef, adminHeaderRef, replyBannerRef, deletedBannerRef, chatInputRef }
  }, [chatHeaderRef, adminHeaderRef, replyBannerRef, deletedBannerRef, chatInputRef])

  // Function để đo height của một element
  const measureElement = useCallback((ref?: React.RefObject<HTMLElement | null>): number => {
    if (!ref?.current) return 0
    return ref.current.offsetHeight || ref.current.getBoundingClientRect().height || 0
  }, [])

  // Function để cập nhật tất cả heights
  const updateHeights = useCallback(() => {
    const { chatHeaderRef, adminHeaderRef, replyBannerRef, deletedBannerRef, chatInputRef } = refsRef.current
    
    setHeights((prev) => {
      const newHeights: ChatElementsHeights = {
        chatHeader: measureElement(chatHeaderRef),
        adminHeader: measureElement(adminHeaderRef),
        replyBanner: measureElement(replyBannerRef),
        deletedBanner: measureElement(deletedBannerRef),
        chatInput: measureElement(chatInputRef),
      }

      // Chỉ update nếu có thay đổi
      const hasChanged = Object.keys(newHeights).some(
        (key) => prev[key as keyof ChatElementsHeights] !== newHeights[key as keyof ChatElementsHeights]
      )

      return hasChanged ? newHeights : prev
    })
  }, [measureElement])

  // Initial measurement
  useLayoutEffect(() => {
    updateHeights()
  }, [updateHeights])

  // Setup ResizeObserver cho mỗi element
  useEffect(() => {
    const observers: ResizeObserver[] = []
    const elements: Array<{ ref?: React.RefObject<HTMLElement | null> }> = [
      { ref: chatHeaderRef },
      { ref: adminHeaderRef },
      { ref: replyBannerRef },
      { ref: deletedBannerRef },
      { ref: chatInputRef },
    ]

    elements.forEach(({ ref }) => {
      if (!ref?.current) return

      const observer = new ResizeObserver(() => {
        updateHeights()
      })

      observer.observe(ref.current)
      observers.push(observer)
    })

    // Fallback: listen to window resize
    window.addEventListener("resize", updateHeights)

    return () => {
      observers.forEach((observer) => observer.disconnect())
      window.removeEventListener("resize", updateHeights)
    }
  }, [chatHeaderRef, adminHeaderRef, replyBannerRef, deletedBannerRef, chatInputRef, updateHeights])

  return heights
}

