'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Confetti } from '@/components/motion/confetti'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckSquare, Droplets, Moon, Footprints, Dumbbell, ChevronLeft, ChevronRight, Save, Flame, Trophy, Snowflake } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { HabitLog, UserProfile } from '@/types'
import { awardXp } from '@/lib/client-gamification'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className ?? ''}`} />
}

export default function HabitsPage() {
  const supabase = useSupabase()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [water, setWater] = useState(0)
  const [sleep, setSleep] = useState(0)
  const [steps, setSteps] = useState(0)
  const [workout, setWorkout] = useState(false)
  const [calories, setCalories] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [recentLogs, setRecentLogs] = useState<HabitLog[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [fire, setFire] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [todayRes, recentRes, profRes, diaryRes] = await Promise.all([
        supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('date', date).maybeSingle(),
        supabase.from('habit_logs').select('*').eq('user_id', user.id).order('date', { ascending: true }).limit(7),
        supabase.from('profiles').select('streak_freezes, avatar_emoji').eq('id', user.id).single(),
        supabase.from('food_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('date', date),
      ])

      const hasDiaryEntries = (diaryRes?.count ?? 0) > 0

      if (todayRes.data) {
        setWater(todayRes.data.water_ml || 0)
        setSleep(todayRes.data.sleep_hours || 0)
        setSteps(todayRes.data.steps || 0)
        setWorkout(todayRes.data.workout_completed || false)
        if (hasDiaryEntries) {
          setCalories(`from diary (${todayRes.data.calories_consumed ?? 0})`)
        } else {
          setCalories(todayRes.data.calories_consumed?.toString() || '')
        }
      } else {
        setWater(0); setSleep(0); setSteps(0); setWorkout(false); setCalories(hasDiaryEntries ? 'from diary' : '')
      }

      if (recentRes.data) setRecentLogs(recentRes.data)
      if (profRes.data) setProfile(profRes.data as UserProfile)
    } finally {
      setLoading(false)
    }
  }, [supabase, date])

  useEffect(() => {
    loadData()
  }, [loadData])

  const saveData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload: Record<string, unknown> = {
      user_id: user.id,
      date,
      water_ml: water,
      sleep_hours: sleep,
      steps,
      workout_completed: workout,
    }
    if (!calories.startsWith('from diary')) {
      payload.calories_consumed = calories ? parseInt(calories) : null
    }
    await supabase.from('habit_logs').upsert(payload, { onConflict: 'user_id,date' })

    // Gamification: XP for logging + bonus for a completed workout.
    await awardXp(supabase, 'log_habits')
    if (workout) {
      const res = await awardXp(supabase, 'complete_workout')
      if (res?.leveled_up) setFire((f) => f + 1)
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    loadData()
  }

  const toggleWorkout = () => {
    const next = !workout
    setWorkout(next)
    if (next) setFire((f) => f + 1)
  }

  const prevDay = () => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d.toISOString().split('T')[0]) }
  const nextDay = () => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d.toISOString().split('T')[0]) }

  // Streak tracking (most-recent-first)
  const reversed = [...recentLogs].reverse()
  let streak = 0
  for (const log of reversed) {
    if (log.water_ml >= 2000 && log.sleep_hours >= 7 && log.steps >= 5000) {
      streak++
    } else break
  }

  const chartData = recentLogs.map(l => ({
    date: l.date.slice(5),
    water: Math.round(l.water_ml / 250),
    sleep: l.sleep_hours,
    steps: Math.round(l.steps / 1000),
  }))

  const habitCards = [
    { key: 'water', label: 'Water Intake', val: water, set: setWater, target: 2500, max: 4000, step: 100, unit: 'ml', color: 'var(--hydration)', Icon: Droplets },
    { key: 'sleep', label: 'Sleep Hours', val: sleep, set: setSleep, target: 8, max: 12, step: 0.5, unit: 'h', color: 'var(--chart-1)', Icon: Moon },
    { key: 'steps', label: 'Steps', val: steps, set: setSteps, target: 8000, max: 20000, step: 500, unit: '', color: 'var(--success)', Icon: Footprints },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Confetti fire={fire} />
      <h1 className="font-display text-2xl font-bold text-primary flex items-center gap-3">
        <CheckSquare className="w-7 h-7" />Habit Tracker
      </h1>

      {/* Streak + Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card">
          <CardContent className="flex items-center gap-3 pt-4">
            <Trophy className="w-8 h-8 text-[var(--energy)]" />
            <div>
              <p className="font-display text-2xl font-bold text-foreground">{streak}</p>
              <p className="text-xs text-muted-foreground">Day streak 🔥</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card">
          <CardContent className="flex items-center gap-3 pt-4">
            <Flame className="w-8 h-8 text-primary" />
            <div>
              <p className="font-display text-2xl font-bold text-foreground">{recentLogs.filter(l => l.workout_completed).length}</p>
              <p className="text-xs text-muted-foreground">Workouts (7d)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 border-primary/20 bg-gradient-to-br from-primary/5 to-card md:col-span-1">
          <CardContent className="flex items-center gap-3 pt-4">
            <Snowflake className="w-8 h-8 text-[var(--carbs)]" />
            <div>
              <p className="font-display text-2xl font-bold text-foreground">{profile?.streak_freezes ?? 2}</p>
              <p className="text-xs text-muted-foreground">Streak freezes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Chart */}
      {chartData.length > 0 && (
        <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">7-Day Habit Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={30} />
                <Tooltip
                  cursor={{ fill: 'var(--muted)' }}
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--foreground)', fontSize: '12px' }}
                  labelStyle={{ color: 'var(--muted-foreground)' }}
                />
                <Bar dataKey="water" name="Water (glasses)" fill="var(--hydration)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sleep" name="Sleep (hrs)" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="steps" name="Steps (k)" fill="var(--success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Date Navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" onClick={prevDay} className="text-muted-foreground hover:text-foreground"><ChevronLeft /></Button>
        <span className="font-display text-lg font-medium text-foreground">{date}</span>
        <Button variant="ghost" size="icon" onClick={nextDay} className="text-muted-foreground hover:text-foreground"><ChevronRight /></Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {habitCards.map(h => {
          const pct = h.target > 0 ? Math.min(100, Math.round((h.val / h.target) * 100)) : 0
          return (
            <Card key={h.key} className="bg-card border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <h.Icon className="w-4 h-4" style={{ color: h.color }} />
                  <span className="text-foreground">{h.label}</span>
                  <span className="ml-auto text-muted-foreground text-xs">{pct}%</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl font-bold text-foreground">{h.val}</span>
                  <span className="text-muted-foreground">{h.unit} / {h.target} {h.unit}</span>
                </div>
                <Slider value={[h.val]} onValueChange={(v) => h.set(typeof v === 'number' ? v : v[0])} max={h.max} step={h.step} />
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: h.color }} />
                </div>
              </CardContent>
            </Card>
          )
        })}

        <Card className="bg-card border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-[var(--energy)]" />
              <span className="text-foreground">Workout</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={toggleWorkout}
              className={`press w-full py-4 rounded-xl text-lg font-medium transition-all ${
                workout
                  ? 'bg-[var(--energy)]/20 text-[var(--energy)] border border-[var(--energy)]/40 brand-glow'
                  : 'bg-muted text-muted-foreground border border-transparent'
              }`}
            >
              {workout ? '✓ Completed (+50 XP)' : 'Mark as done'}
            </button>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Calories Consumed</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              value={calories}
              onChange={e => setCalories(e.target.value)}
              className="bg-background border text-foreground"
              placeholder="e.g. 1850"
              readOnly={calories.startsWith('from diary')}
            />
            {calories.startsWith('from diary') && (
              <p className="mt-1 text-xs text-muted-foreground">from food diary</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Button
        onClick={saveData}
        className={`press w-full text-sm font-medium ${saved ? 'bg-[var(--success)] text-[var(--brand-foreground)]' : 'bg-primary text-primary-foreground'}`}
      >
        <Save className="w-4 h-4 mr-2" />
        {saved ? 'Saved! +15 XP' : 'Save habits'}
      </Button>
    </div>
  )
}
