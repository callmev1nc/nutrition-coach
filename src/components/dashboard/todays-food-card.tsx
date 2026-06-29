'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FoodLogSheet } from '@/components/food-log/food-log-sheet'
import { RunningTotal } from '@/components/food-log/running-total'
import { Plus } from 'lucide-react'
import type { DiaryItem } from '@/types'

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: 'var(--accent)',
  lunch: 'var(--primary)',
  dinner: 'var(--secondary)',
  snack: 'var(--muted-foreground)',
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

export function TodaysFoodCard() {
  const [entries, setEntries] = useState<DiaryItem[]>([])
  const [totals, setTotals] = useState({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  const loadToday = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/diary?date=${today}`)
      if (!res.ok) return
      const data = await res.json()
      setEntries(data.entries ?? [])
      setTotals(data.totals ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [today])

  useEffect(() => {
    loadToday()
  }, [loadToday])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Today&apos;s Food</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-2 w-full rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const grouped = entries.reduce<Record<string, DiaryItem[]>>((acc, e) => {
    if (e.parent_entry_id) return acc
    const key = e.meal_type
    if (!acc[key]) acc[key] = []
    acc[key].push(e)
    return acc
  }, {})

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">Today&apos;s Food</CardTitle>
        <FoodLogSheet
          date={today}
          onSaved={loadToday}
          trigger={
            <button
              type="button"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-accent transition-colors"
            >
              <Plus className="h-3 w-3" />
              Log
            </button>
          }
        />
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">No food logged today</p>
        ) : (
          <>
            {Object.entries(grouped).map(([mealType, items]) => {
              const mealCalories = items.reduce((sum, i) => sum + Number(i.calories), 0)
              return (
                <div key={mealType} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: MEAL_TYPE_COLORS[mealType] }}
                    />
                    <span className="text-muted-foreground">
                      {MEAL_TYPE_LABELS[mealType] ?? mealType}
                    </span>
                    <span className="text-muted-foreground">
                      {items.length} item{items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="tabular-nums font-medium">
                    {Math.round(mealCalories)} kcal
                  </span>
                </div>
              )
            })}
            <div className="border-t pt-2">
              <RunningTotal {...totals} compact />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
