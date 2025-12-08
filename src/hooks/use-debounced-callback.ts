/**
 * Lightweight debounced callback hook
 * Returns a stable debounced function with a cancel method
 * Follows React best practices for cleanup
 */
"use client"

import { useEffect, useMemo, useRef } from "react"

type DebouncedFn<T extends (...args: never[]) => void> = ((...args: Parameters<T>) => void) & {
  cancel: () => void
}

export function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delay: number
): DebouncedFn<T> {
  const callbackRef = useRef(callback)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const debounced = useMemo(() => {
    const fn = ((...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(callbackRef.current as any)(...(args as any[]))
      }, delay)
    }) as DebouncedFn<T>

    fn.cancel = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    return fn
  }, [delay])

  useEffect(() => () => debounced.cancel(), [debounced])

  return debounced
}

