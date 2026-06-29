'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  UtensilsCrossed,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  RotateCw,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import type { MealPlan, Meal, UserProfile } from '@/types'
import { calculateAll } from '@/lib/calculations'

const MacroChart = dynamic(() => import('@/components/macro-chart').then((mod) => mod.MacroChart), { ssr: false, loading: () => <div className="h-[220px] animate-pulse rounded-xl bg-muted" /> })

const mealTypeColors: Record<string, { badge: string; bg: string; label: string }> = {
  breakfast: { badge: 'bg-amber-500/20 text-amber-400', bg: 'border-l-amber-500', label: 'Breakfast' },
  lunch: { badge: 'bg-green-500/20 text-green-400', bg: 'border-l-green-500', label: 'Lunch' },
  dinner: { badge: 'bg-indigo-500/20 text-indigo-400', bg: 'border-l-indigo-500', label: 'Dinner' },
  snack: { badge: 'bg-pink-500/20 text-pink-400', bg: 'border-l-pink-500', label: 'Snack' },
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className ?? ''}`} />
}

function MealCardSkeleton() {
  return (
    <Card className="bg-card border">
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
    </Card>
  )
}

import { MacroBar } from '@/components/shared/macro-bar'

export default function MealsPage() {
  const supabase = useSupabase()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) setProfile(data)
  }, [supabase])

  const loadMealPlan = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/meals?date=${date}`)
      const json = await res.json()
      setMealPlan(json.mealPlan ?? null)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  useEffect(() => {
    loadMealPlan()
  }, [loadMealPlan])

  const generatePlan = async () => {
    setGenerating(true)
    try {
      let planned: MealPlan | null = null

      // Prefer streaming so the plan starts arriving in ~1-2s instead of one
      // long blocking wait. Assemble the chunks into JSON; if anything fails,
      // fall back to the (also token-capped) non-streaming endpoint below.
      try {
        const streamRes = await fetch('/api/meals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, force: mealPlan !== null, stream: true }),
        })
        const isStream =
          streamRes.ok &&
          (streamRes.headers.get('content-type') || '').includes('text/plain') &&
          !!streamRes.body

        if (isStream && streamRes.body) {
          const reader = streamRes.body.getReader()
          const decoder = new TextDecoder()
          let assembled = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            assembled += decoder.decode(value, { stream: true })
          }
          try {
            const parsed = JSON.parse(assembled)
            if (parsed?.meals?.length) {
              planned = { ...parsed, date } as MealPlan
            }
          } catch {
            // incomplete/invalid streamed JSON — fall through to fallback
          }
        } else if (streamRes.ok) {
          const json = await streamRes.json()
          if (json.mealPlan) planned = json.mealPlan as MealPlan
        }
      } catch {
        // streaming fetch failed — use the non-streaming fallback
      }

      if (!planned) {
        const res = await fetch('/api/meals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, force: mealPlan !== null }),
        })
        const json = await res.json()
        if (json.mealPlan) planned = json.mealPlan as MealPlan
      }

      if (planned) setMealPlan(planned)
    } finally {
      setGenerating(false)
    }
  }

  const prevDay = () => {
    const d = new Date(date)
    d.setDate(d.getDate() - 1)
    setDate(d.toISOString().split('T')[0])
  }

  const nextDay = () => {
    const d = new Date(date)
    d.setDate(d.getDate() + 1)
    setDate(d.toISOString().split('T')[0])
  }

  const targetMacros = useMemo(() =>
    profile
      ? calculateAll(
          profile.weight_kg,
          profile.height_cm,
          profile.age,
          profile.gender,
          profile.body_fat_percent ?? null,
          profile.activity_level,
          profile.office_job,
          profile.training_days_per_week
        )
      : null
  , [profile])

  const meals = mealPlan?.meals ?? []

  const { totalCalories, totalProtein, totalCarbs, totalFat, chartData } = useMemo(() => ({
    totalCalories: meals.reduce((s, m) => s + m.calories, 0),
    totalProtein: meals.reduce((s, m) => s + m.protein, 0),
    totalCarbs: meals.reduce((s, m) => s + m.carbs, 0),
    totalFat: meals.reduce((s, m) => s + m.fat, 0),
    chartData: meals.map((m) => ({
      name: m.type.charAt(0).toUpperCase() + m.type.slice(1),
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
    })),
  }), [mealPlan])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
          <UtensilsCrossed className="w-7 h-7 text-primary" />
          Meal Plans
        </h1>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" onClick={prevDay} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft />
        </Button>
        <span className="text-lg font-medium text-foreground">{date}</span>
        <Button variant="ghost" size="icon" onClick={nextDay} className="text-muted-foreground hover:text-foreground">
          <ChevronRight />
        </Button>
      </div>

      {/* Generate Button */}
      {!mealPlan && !loading && (
        <Card className="bg-card border">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
            </div>
            <p className="text-muted-foreground text-sm">No meal plan for this date yet.</p>
            <Button
              onClick={generatePlan}
              disabled={generating}
              className="bg-primary text-primary-foreground"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Generate AI Meal Plan</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MealCardSkeleton />
          <MealCardSkeleton />
          <MealCardSkeleton />
          <MealCardSkeleton />
        </div>
      )}

      {/* Generating State */}
      {generating && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-card border">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-28" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/6" />
                <Skeleton className="h-3 w-3/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Meal Cards */}
      {mealPlan && !generating && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meals.map((meal: Meal, i: number) => {
              const colors = mealTypeColors[meal.type] ?? mealTypeColors.breakfast
              return (
                <Card key={i} className={`bg-card border border-l-4 ${colors.bg}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-foreground flex items-center gap-2">
                        {meal.name}
                      </CardTitle>
                      <Badge className={colors.badge}>{colors.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground border-b border/50">
                          <th className="text-left py-1 font-medium">Food</th>
                          <th className="text-right py-1 font-medium">Qty</th>
                          <th className="text-right py-1 font-medium">Cal</th>
                          <th className="text-right py-1 font-medium hidden sm:table-cell">P</th>
                          <th className="text-right py-1 font-medium hidden sm:table-cell">C</th>
                          <th className="text-right py-1 font-medium hidden sm:table-cell">F</th>
                        </tr>
                      </thead>
                      <tbody>
                        {meal.foods.map((food, fi) => (
                          <tr key={fi} className="border-b border/30">
                            <td className="py-1 text-foreground">{food.name}</td>
                            <td className="py-1 text-muted-foreground text-right">{food.quantity}</td>
                            <td className="py-1 text-foreground text-right">{food.calories}</td>
                            <td className="py-1 text-muted-foreground text-right hidden sm:table-cell">{food.protein}g</td>
                            <td className="py-1 text-muted-foreground text-right hidden sm:table-cell">{food.carbs}g</td>
                            <td className="py-1 text-muted-foreground text-right hidden sm:table-cell">{food.fat}g</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex justify-between text-xs pt-1 border-t border/50">
                      <span className="text-muted-foreground">Total</span>
                      <span className="text-foreground font-medium">{meal.calories} cal</span>
                      <span className="text-muted-foreground hidden sm:inline">{meal.protein}P / {meal.carbs}C / {meal.fat}F</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Regenerate Button */}
          <div className="flex justify-center">
            <Button
              onClick={generatePlan}
              disabled={generating}
              variant="outline"
              className="border text-muted-foreground hover:text-foreground"
            >
              <RotateCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
              Regenerate Plan
            </Button>
          </div>

          {/* Day Totals Summary */}
          <Card className="bg-card border">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Day Totals vs Targets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Calories */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Calories</span>
                  <span className="text-muted-foreground">
                    {totalCalories} / {targetMacros?.target_calories ?? '---'} kcal
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                    style={{
                      width: `${targetMacros && targetMacros.target_calories > 0
                        ? Math.min(100, (totalCalories / targetMacros.target_calories) * 100)
                        : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Macros */}
              <MacroBar label="Protein" current={totalProtein} target={Math.round(targetMacros?.protein_g ?? 0)} color="#f472b6" />
              <MacroBar label="Carbs" current={totalCarbs} target={Math.round(targetMacros?.carbs_g ?? 0)} color="#60a5fa" />
              <MacroBar label="Fat" current={totalFat} target={Math.round(targetMacros?.fat_g ?? 0)} color="#fbbf24" />
            </CardContent>
          </Card>

          {/* Macro Distribution Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Macro Distribution by Meal</CardTitle>
              </CardHeader>
              <CardContent>
                <MacroChart data={chartData} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
