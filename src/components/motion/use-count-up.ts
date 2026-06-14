'use client'

import { useEffect, useRef, useState } from 'react'

/** Cubic ease-out — exported so the curve can be unit-tested. */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

interface CountUpOptions {
  /** Animation duration in ms. @default 900 */
  duration?: number
  /** Decimal places to display. @default 0 */
  decimals?: number
  /** Re-run the animation whenever this value changes. */
  value: number
}

/**
 * Animates a number from 0 → value (or from the previous value) using rAF.
 * Returns the current display value. Falls back to the raw value if reduced
 * motion is requested.
 */
export function useCountUp({ value, duration = 900, decimals = 0 }: CountUpOptions) {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value)
      return
    }

    const from = fromRef.current
    const start = performance.now()
    const delta = value - from

    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const tick = (now: number) => {
      const elapsed = now - start
      const t = Math.min(1, elapsed / duration)
      const eased = easeOutCubic(t)
      setDisplay(from + delta * eased)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = value
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration])

  return decimals > 0 ? Number(display.toFixed(decimals)) : Math.round(display)
}
