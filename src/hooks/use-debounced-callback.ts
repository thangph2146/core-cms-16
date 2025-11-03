"use client"

import { useEffect, useMemo, useRef } from "react"

type DebouncedFn<T extends (...args: any[]) => void> = ((...args: Parameters<T>) => void) & {
  cancel: () => void
}

/**
 * Lightweight debounced callback hook.
 * Returns a stable debounced function with a `cancel` method.
 */
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
): DebouncedFn<T> {
  const callbackRef = useRef(callback)
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const debounced = useMemo(() => {
    let timer: ReturnType<typeof setTimeout> | null = null

    const fn = ((...args: Parameters<T>) => {
      if (timer) {
        clearTimeout(timer)
      }
      timer = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    }) as DebouncedFn<T>

    fn.cancel = () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    }

    return fn
  }, [delay])

  useEffect(() => () => debounced.cancel(), [debounced])

  return debounced
}

