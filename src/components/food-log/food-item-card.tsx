'use client'

import { Trash2 } from 'lucide-react'
import type { DiaryItem } from '@/types'
import { CookingChips } from './cooking-chips'

interface FoodItemCardProps {
  item: DiaryItem
  onDelete?: (id: string) => void
  onCookingChange?: (method: string | null) => void
}

export function FoodItemCard({ item, onDelete, onCookingChange }: FoodItemCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{item.food_name}</span>
          {item.brand_owner && (
            <span className="text-xs text-muted-foreground truncate">{item.brand_owner}</span>
          )}
          {item.confidence && (
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                item.confidence === 'high'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : item.confidence === 'medium'
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
              }`}
            >
              {item.confidence}
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {item.portion_amount}g {item.portion_unit}
          {item.cooking_method && ` · ${item.cooking_method}`}
          {item.fat_trimmed && ' · fat trimmed'}
          {item.source === 'openfoodfacts' && ' · barcode'}
        </div>
        <div className="mt-1 flex gap-2 text-xs tabular-nums text-muted-foreground">
          <span>{Math.round(Number(item.calories))} kcal</span>
          <span className="text-protein">P {Math.round(Number(item.protein_g))}g</span>
          <span className="text-carbs">C {Math.round(Number(item.carbs_g))}g</span>
          <span className="text-fat">F {Math.round(Number(item.fat_g))}g</span>
          {item.fiber_g != null && <span>Fib {Math.round(Number(item.fiber_g))}g</span>}
        </div>
        {onCookingChange && (
          <div className="mt-2">
            <CookingChips
              value={(item.cooking_method as any) ?? null}
              onChange={onCookingChange}
            />
          </div>
        )}
      </div>
      {onDelete && item.id && (
        <button
          type="button"
          onClick={() => onDelete(item.id!)}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-destructive transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
