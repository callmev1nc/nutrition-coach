'use client'

import { useCountUp } from '@/components/motion/use-count-up'

interface CalorieRingProps {
  current: number
  target: number
}

export function CalorieRing({ current, target }: CalorieRingProps) {
  const radius = 60
  const circumference = 2 * Math.PI * radius
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const offset = circumference - (pct / 100) * circumference
  const display = useCountUp({ value: current })

  const ringColor = current > target ? 'var(--energy)' : 'var(--primary)'

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="10"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold tabular-nums">{display}</span>
        <span className="text-xs text-muted-foreground">/ {target} kcal</span>
      </div>
    </div>
  )
}
