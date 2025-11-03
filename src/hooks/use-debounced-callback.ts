"use client"

import { useEffect, useMemo, useRef } from "react"

type DebouncedFn<T extends (...args: never[]) => void> = ((...args: Parameters<T>) => void) & {
  cancel: () => void
}

/**
 * Lightweight debounced callback hook.
 * Returns a stable debounced function with a `cancel` method.
 */
export function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delay: number,
): DebouncedFn<T> {
  const callbackRef = useRef(callback)
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debounced = useMemo(() => {
    const fn = ((...args: Parameters<T>) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(() => {
        // Type assertion needed because T extends (...args: never[]) => void
        // but we want to accept any function type at runtime
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

