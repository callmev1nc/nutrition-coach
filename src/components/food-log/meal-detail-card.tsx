'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FoodItemCard } from './food-item-card'
import { RunningTotal } from './running-total'
import type { DiaryItem, Meal } from '@/types'

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: 'var(--accent)',
  lunch: 'var(--primary)',
  dinner: 'var(--secondary)',
  snack: 'var(--muted-foreground)',
}

interface MealDetailCardProps {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  items: DiaryItem[]
  planMeal?: Meal | null
  onDeleteItem?: (id: string) => void
}

export function MealDetailCard({ mealType, items, planMeal, onDeleteItem }: MealDetailCardProps) {
  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + Number(item.calories),
      protein_g: acc.protein_g + Number(item.protein_g),
      carbs_g: acc.carbs_g + Number(item.carbs_g),
      fat_g: acc.fat_g + Number(item.fat_g),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )

  const parentItems = items.filter((i) => !i.parent_entry_id)

  const color = MEAL_TYPE_COLORS[mealType] || 'var(--muted-foreground)'

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            <CardTitle className="text-base capitalize">{mealType}</CardTitle>
          </div>
          <span className="text-sm tabular-nums text-muted-foreground">
            {Math.round(totals.calories)} kcal
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {planMeal && (
          <div className="rounded-md bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
            Planned: {planMeal.name} ({Math.round(planMeal.calories)} kcal)
          </div>
        )}
        {parentItems.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">No food logged yet</p>
        ) : (
          parentItems.map((item) => (
            <FoodItemCard
              key={item.id}
              item={item}
              onDelete={onDeleteItem}
            />
          ))
        )}
        {parentItems.length > 0 && <RunningTotal {...totals} label="Meal total" compact />}
      </CardContent>
    </Card>
  )
}
