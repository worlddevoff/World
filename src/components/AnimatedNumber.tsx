import React, { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  className?: string
  decimals?: number
}

/** Smoothly tweens a displayed number toward the target value. */
export function AnimatedNumber({ value, className, decimals = 0 }: Props) {
  const [display, setDisplay] = useState(value)
  const rafRef = useRef<number | undefined>(undefined)
  const fromRef = useRef(value)
  const startRef = useRef(0)

  useEffect(() => {
    fromRef.current = display
    startRef.current = performance.now()
    const duration = 600
    const from = fromRef.current
    const to = value

    const step = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (to - from) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const text = decimals > 0 ? display.toFixed(decimals) : String(Math.round(display))
  return <span className={className}>{text}</span>
}
