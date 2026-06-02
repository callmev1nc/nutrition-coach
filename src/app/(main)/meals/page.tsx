'use client'

import { useState, useEffect, useCallback } from 'react'
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
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import type { MealPlan, Meal, UserProfile } from '@/types'
import { calculateAll } from '@/lib/calculations'

const mealTypeColors: Record<string, { badge: string; bg: string; label: string }> = {
  breakfast: { badge: 'bg-amber-500/20 text-amber-400', bg: 'border-l-amber-500', label: 'Breakfast' },
  lunch: { badge: 'bg-green-500/20 text-green-400', bg: 'border-l-green-500', label: 'Lunch' },
  dinner: { badge: 'bg-indigo-500/20 text-indigo-400', bg: 'border-l-indigo-500', label: 'Dinner' },
  snack: { badge: 'bg-pink-500/20 text-pink-400', bg: 'border-l-pink-500', label: 'Snack' },
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className ?? ''}`} />
}

function MealCardSkeleton() {
  return (
    <Card className="bg-[#1a1d27] border-[#2a2d37]">
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

function MacroBar({ label, current, target, color }: { label: string; current: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-500">{current}g / {target}g</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

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
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      const json = await res.json()
      if (json.mealPlan) setMealPlan(json.mealPlan)
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

  const targetMacros = profile
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

  const meals = mealPlan?.meals ?? []

  const totalCalories = meals.reduce((s, m) => s + m.calories, 0)
  const totalProtein = meals.reduce((s, m) => s + m.protein, 0)
  const totalCarbs = meals.reduce((s, m) => s + m.carbs, 0)
  const totalFat = meals.reduce((s, m) => s + m.fat, 0)

  const chartData = meals.map((m) => ({
    name: m.type.charAt(0).toUpperCase() + m.type.slice(1),
    calories: m.calories,
    protein: m.protein,
    carbs: m.carbs,
    fat: m.fat,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent flex items-center gap-3">
          <UtensilsCrossed className="w-7 h-7 text-emerald-400" />
          Meal Plans
        </h1>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" onClick={prevDay} className="text-gray-400 hover:text-white">
          <ChevronLeft />
        </Button>
        <span className="text-lg font-medium text-white">{date}</span>
        <Button variant="ghost" size="icon" onClick={nextDay} className="text-gray-400 hover:text-white">
          <ChevronRight />
        </Button>
      </div>

      {/* Generate Button */}
      {!mealPlan && !loading && (
        <Card className="bg-[#1a1d27] border-[#2a2d37]">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-emerald-400" />
              </div>
            </div>
            <p className="text-gray-400 text-sm">No meal plan for this date yet.</p>
            <Button
              onClick={generatePlan}
              disabled={generating}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
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
            <Card key={i} className="bg-[#1a1d27] border-[#2a2d37]">
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
                <Card key={i} className={`bg-[#1a1d27] border-[#2a2d37] border-l-4 ${colors.bg}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-white flex items-center gap-2">
                        {meal.name}
                      </CardTitle>
                      <Badge className={colors.badge}>{colors.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500 border-b border-[#2a2d37]/50">
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
                          <tr key={fi} className="border-b border-[#2a2d37]/30">
                            <td className="py-1 text-gray-300">{food.name}</td>
                            <td className="py-1 text-gray-500 text-right">{food.quantity}</td>
                            <td className="py-1 text-gray-300 text-right">{food.calories}</td>
                            <td className="py-1 text-gray-500 text-right hidden sm:table-cell">{food.protein}g</td>
                            <td className="py-1 text-gray-500 text-right hidden sm:table-cell">{food.carbs}g</td>
                            <td className="py-1 text-gray-500 text-right hidden sm:table-cell">{food.fat}g</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex justify-between text-xs pt-1 border-t border-[#2a2d37]/50">
                      <span className="text-gray-400">Total</span>
                      <span className="text-white font-medium">{meal.calories} cal</span>
                      <span className="text-gray-500 hidden sm:inline">{meal.protein}P / {meal.carbs}C / {meal.fat}F</span>
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
              className="border-[#2a2d37] text-gray-400 hover:text-white"
            >
              <RotateCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
              Regenerate Plan
            </Button>
          </div>

          {/* Day Totals Summary */}
          <Card className="bg-[#1a1d27] border-[#2a2d37]">
            <CardHeader>
              <CardTitle className="text-sm text-gray-400">Day Totals vs Targets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Calories */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Calories</span>
                  <span className="text-gray-500">
                    {totalCalories} / {targetMacros?.target_calories ?? '---'} kcal
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
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
            <Card className="bg-[#1a1d27] border-[#2a2d37]">
              <CardHeader>
                <CardTitle className="text-sm text-gray-400">Macro Distribution by Meal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d37', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <Bar dataKey="protein" name="Protein" fill="#f472b6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="carbs" name="Carbs" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="fat" name="Fat" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
