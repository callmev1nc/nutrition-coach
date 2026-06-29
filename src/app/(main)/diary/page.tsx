'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { FoodLogSheet } from '@/components/food-log/food-log-sheet'
import { MealDetailCard } from '@/components/food-log/meal-detail-card'
import { RunningTotal } from '@/components/food-log/running-total'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { format, subDays, addDays } from 'date-fns'
import type { DiaryItem } from '@/types'

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const

export default function DiaryPage() {
  const supabase = useSupabase()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [entries, setEntries] = useState<DiaryItem[]>([])
  const [totals, setTotals] = useState({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 })
  const [plan, setPlan] = useState<{ calories: number; protein: number; carbs: number; fat: number } | null>(null)
  const [loading, setLoading] = useState(true)

  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/diary?date=${date}`)
      if (!res.ok) throw new Error('Failed to load diary')
      const data = await res.json()
      setEntries(data.entries ?? [])
      setTotals(data.totals ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 })
      setPlan(data.plan)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/diary/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      loadEntries()
    } catch (err) {
      console.error(err)
    }
  }, [loadEntries])

  const isToday = date === new Date().toISOString().split('T')[0]

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Food Diary</h1>
          <p className="text-sm text-muted-foreground">
            {isToday ? 'Today' : format(new Date(date), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDate(subDays(new Date(date), 1).toISOString().split('T')[0])}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDate(addDays(new Date(date), 1).toISOString().split('T')[0])}
            disabled={isToday}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily totals</CardTitle>
        </CardHeader>
        <CardContent>
          <RunningTotal {...totals} label="Logged" />
          {plan && (
            <div className="mt-2 border-t pt-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Planned</span>
                <span>{Math.round(plan.calories)} kcal</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Remaining</span>
                <span className={plan.calories - totals.calories < 0 ? 'text-destructive' : ''}>
                  {Math.round(plan.calories - totals.calories)} kcal
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {MEAL_TYPES.map((mealType) => {
          const mealEntries = entries.filter(
            (e) => e.meal_type === mealType && !e.parent_entry_id
          )
          return (
            <MealDetailCard
              key={mealType}
              mealType={mealType}
              items={entries.filter((e) => e.meal_type === mealType)}
              planMeal={null}
              onDeleteItem={handleDelete}
            />
          )
        })}
      </div>

      <FoodLogSheet
        date={date}
        onSaved={loadEntries}
        trigger={
          <Button className="w-full">
            <Plus className="mr-1 h-4 w-4" />
            Log food
          </Button>
        }
      />
    </div>
  )
}
