'use client'

import type { CookingMethod } from '@/types'

const METHODS: { value: CookingMethod; label: string }[] = [
  { value: 'raw', label: 'Raw' },
  { value: 'grilled', label: 'Grilled' },
  { value: 'baked', label: 'Baked' },
  { value: 'fried', label: 'Fried' },
  { value: 'steamed', label: 'Steamed' },
  { value: 'boiled', label: 'Boiled' },
  { value: 'roasted', label: 'Roasted' },
  { value: 'sauteed', label: 'Sautéed' },
]

export function CookingChips({
  value,
  onChange,
}: {
  value: CookingMethod | null
  onChange: (v: CookingMethod | null) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {METHODS.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(value === m.value ? null : m.value)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            value === m.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
