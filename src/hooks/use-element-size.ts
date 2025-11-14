"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react"

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect

type Size = {
  width: number
  height: number
}

/**
 * Observe an element size via ResizeObserver and expose width/height.
 * Returns a stable callback ref that should be attached to the target node.
 */
export function useElementSize<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null)
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })

  const ref = useCallback((nextNode: T | null) => {
    setNode(nextNode)
  }, [])

  useIsomorphicLayoutEffect(() => {
    if (!node) {
      return
    }

    const updateSize = () => {
      const { width, height } = node.getBoundingClientRect()
      setSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height }
      )
    }

    updateSize()

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSize)
      return () => {
        window.removeEventListener("resize", updateSize)
      }
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) {
        return
      }
      const { width, height } = entry.contentRect
      setSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height }
      )
    })

    observer.observe(node)
    return () => {
      observer.disconnect()
    }
  }, [node])

  return {
    ref,
    width: size.width,
    height: size.height,
  }
}
