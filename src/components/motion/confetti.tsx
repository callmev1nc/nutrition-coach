'use client'

import { useEffect, useState } from 'react'

interface ConfettiProps {
  /** Increment this number to fire a burst. */
  fire: number
  count?: number
}

// Fixed vivid colors so the burst is visible across every theme.
const COLORS = ['#7C3AED', '#A3E635', '#EC4899', '#06B6D4', '#F59E0B', '#10B981', '#D946EF']

interface Particle {
  id: string
  left: number
  delay: number
  duration: number
  drift: number
  rotate: number
  color: string
  size: number
  round: boolean
}

/**
 * A lightweight, dependency-free confetti burst. Render once near the app root
 * and increment `fire` (e.g. `setFire((n) => n + 1)`) to celebrate level-ups,
 * streaks, or completed habits.
 *
 * Particles are generated inside an effect (not during render) so the random
 * values don't risk hydration mismatches.
 */
export function Confetti({ fire, count = 90 }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    if (fire === 0) return
    const next = Array.from({ length: count }, (_, i) => ({
      id: `${fire}-${i}`,
      left: Math.random() * 100,
      delay: Math.random() * 0.25,
      duration: 1.6 + Math.random() * 1.3,
      drift: (Math.random() - 0.5) * 240,
      rotate: Math.random() * 720 - 360,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 8,
      round: Math.random() > 0.5,
    }))
    setParticles(next)
    const t = setTimeout(() => setParticles([]), 3400)
    return () => clearTimeout(t)
  }, [fire, count])

  if (particles.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes nc-confetti-fall {
          0% { transform: translate3d(0, -24px, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate3d(var(--drift), 105vh, 0) rotate(var(--rotate)); opacity: 0.85; }
        }
      `}</style>
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * (p.round ? 1 : 1.6),
            background: p.color,
            borderRadius: p.round ? '9999px' : '2px',
            ['--drift' as string]: `${p.drift}px`,
            ['--rotate' as string]: `${p.rotate}deg`,
            animation: `nc-confetti-fall ${p.duration}s cubic-bezier(0.2, 0.6, 0.4, 1) ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  )
}
