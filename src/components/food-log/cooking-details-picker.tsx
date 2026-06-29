'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { CookingChips } from './cooking-chips'
import type { CookingMethod } from '@/types'

export interface CookingDetails {
  cooking_method: CookingMethod | null
  fat_trimmed: boolean
  oil_name: string
  oil_amount: string
}

export function CookingDetailsPicker({
  value,
  onChange,
  showOil = false,
}: {
  value: CookingDetails
  onChange: (v: CookingDetails) => void
  showOil?: boolean
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground">Cooking method</Label>
        <CookingChips
          value={value.cooking_method}
          onChange={(v) => onChange({ ...value, cooking_method: v })}
        />
      </div>
      {value.cooking_method && value.cooking_method !== 'raw' && (
        <div className="flex items-center gap-2">
          <Switch
            id="fat-trimmed"
            checked={value.fat_trimmed}
            onCheckedChange={(v) => onChange({ ...value, fat_trimmed: v })}
          />
          <Label htmlFor="fat-trimmed" className="text-xs">
            Fat trimmed
          </Label>
        </div>
      )}
      {showOil && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Oil / fat</Label>
            <Input
              placeholder="olive oil"
              value={value.oil_name}
              onChange={(e) => onChange({ ...value, oil_name: e.target.value })}
              className="mt-1 h-8 text-xs"
            />
          </div>
          <div className="w-20">
            <Label className="text-xs text-muted-foreground">Amount (ml)</Label>
            <Input
              type="number"
              min="0"
              step="1"
              placeholder="5"
              value={value.oil_amount}
              onChange={(e) => onChange({ ...value, oil_amount: e.target.value })}
              className="mt-1 h-8 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function useCookingDetails(): CookingDetails & { reset: () => void } {
  const [details, setDetails] = useState<CookingDetails>({
    cooking_method: null,
    fat_trimmed: false,
    oil_name: '',
    oil_amount: '',
  })
  return {
    ...details,
    ...details,
    cooking_method: details.cooking_method,
    fat_trimmed: details.fat_trimmed,
    oil_name: details.oil_name,
    oil_amount: details.oil_amount,
    onChange: setDetails,
    reset: () =>
      setDetails({
        cooking_method: null,
        fat_trimmed: false,
        oil_name: '',
        oil_amount: '',
      }),
    value: details,
  } as any
}
