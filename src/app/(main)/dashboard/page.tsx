'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { useTheme } from '@/components/providers/theme-provider'
import { useCountUp } from '@/components/motion/use-count-up'
import { MacroBar } from '@/components/shared/macro-bar'
import { Confetti } from '@/components/motion/confetti'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Flame,
  Target,
  Plus,
  MessageCircle,
  Dumbbell,
  UtensilsCrossed,
  Scale,
  Droplets,
  Moon,
  Footprints,
  CheckCircle2,
  Circle,
  Sparkles,
  Trophy,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { LogWeightDialog } from '@/components/dashboard/LogWeightDialog'
import { TodaysFoodCard } from '@/components/dashboard/todays-food-card'
import { WaterTrackerCard } from '@/components/dashboard/water-tracker-card'
import type { UserProfile, WeightLog, HabitLog } from '@/types'
import { calculateAll } from '@/lib/calculations'
import { xpProgress } from '@/lib/gamification'
import { earnedBadges, type BadgeStats } from '@/lib/gamification'
import { awardXp, saveMoodEnergy } from '@/lib/client-gamification'
import { safeStorage } from '@/lib/safe-storage'

// ---------- Skeleton helpers ----------

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className ?? ''}`} />
}

function StatCardSkeleton() {
  return (
    <Card className="bg-card border">
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-28" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-9 w-24" />
        <Skeleton className="mt-2 h-4 w-20" />
      </CardContent>
    </Card>
  )
}

// ---------- Count-up stat tile ----------

function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const v = useCountUp({ value, decimals })
  return <>{decimals > 0 ? v.toFixed(decimals) : v}</>
}

// ---------- Level ring ----------

function LevelRing({ level, pct, avatar }: { level: number; pct: number; avatar: string }) {
  const radius = 30
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference
  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="6" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl leading-none">{avatar}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Lv {level}</span>
      </div>
    </div>
  )
}

// ---------- Habit Ring ----------

function HabitRing({
  label,
  icon: Icon,
  current,
  target,
  unit,
  color,
}: {
  label: string
  icon: React.ElementType
  current: number
  target: number
  unit: string
  color: string
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference
  const completed = pct >= 100

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--muted)" strokeWidth="5" />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke={completed ? 'var(--success)' : color}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute">
          {completed ? (
            <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
          ) : (
            <Icon className="h-4 w-4" style={{ color }} />
          )}
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">
          {current}/{target} {unit}
        </p>
      </div>
    </div>
  )
}

// ---------- Mood / energy picker ----------

const MOOD_FACES = ['😫', '🙁', '😐', '🙂', '😄']
const ENERGY_FACES = ['🪫', '🔋', '⚡', '🚀', '💥']

function MoodRow({
  label,
  faces,
  value,
  onPick,
}: {
  label: string
  faces: string[]
  value: number | null | undefined
  onPick: (v: number) => void
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex justify-between gap-1.5">
        {faces.map((f, i) => {
          const n = i + 1
          const active = value === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => onPick(n)}
              className={`press flex h-11 flex-1 items-center justify-center rounded-xl text-xl transition-all ${
                active
                  ? 'bg-primary text-primary-foreground brand-glow scale-105'
                  : 'bg-muted hover:bg-muted/70'
              }`}
              aria-label={`${label} ${n}`}
              aria-pressed={active}
            >
              {f}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Main page ----------

export default function DashboardPage() {
  const supabase = useSupabase()
  const { applyTheme } = useTheme()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [recentHabits, setRecentHabits] = useState<HabitLog[]>([])
  const [todayHabit, setTodayHabit] = useState<HabitLog | null>(null)
  const [counts, setCounts] = useState({ coach: 0, meals: 0, bodyFat: 0 })
  const [loading, setLoading] = useState(true)
  const [logWeightOpen, setLogWeightOpen] = useState(false)
  const [fire, setFire] = useState(0)
  const [levelUpText, setLevelUpText] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const [profRes, logsRes, habitRes, recentHabitRes, coachRes, mealRes, bfRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('weight_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: true })
          .limit(90),
        supabase
          .from('habit_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', new Date().toISOString().split('T')[0])
          .maybeSingle(),
        supabase
          .from('habit_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(30),
        supabase.from('coach_messages').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('meal_plans').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('body_fat_measurements').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ])

      if (profRes.data) {
        setProfile(profRes.data as UserProfile)
        if (profRes.data.theme) applyTheme(profRes.data.theme)
      }
      if (logsRes.data) setWeightLogs(logsRes.data)
      if (habitRes.data) setTodayHabit(habitRes.data as HabitLog)
      if (recentHabitRes.data) setRecentHabits(recentHabitRes.data as HabitLog[])
      setCounts({
        coach: coachRes.count ?? 0,
        meals: mealRes.count ?? 0,
        bodyFat: bfRes.count ?? 0,
      })
    } finally {
      setLoading(false)
    }
  }, [supabase, applyTheme])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ---------- Level-up celebration ----------
  useEffect(() => {
    if (!profile) return
    const last = Number(safeStorage.getItem('nc-last-level') || '0')
    const current = profile.level ?? 1
    if (last > 0 && current > last) {
      setFire((f) => f + 1)
      setLevelUpText(`LEVEL ${current}!`)
      window.setTimeout(() => setLevelUpText(null), 2600)
    }
    safeStorage.setItem('nc-last-level', String(current))
  }, [profile])

  // ---------- Derived data ----------

  const derived = useMemo(() => {
    const currentWeight = profile?.weight_kg ?? 0
    const goalWeight = profile?.goal_weight_kg ?? 0
    const startWeight = weightLogs.length > 0 ? weightLogs[0].weight_kg : currentWeight

    const totalLost = Math.max(0, startWeight - currentWeight)
    const totalToLose = Math.max(0, startWeight - goalWeight)
    const progressPercent =
      totalToLose > 0 ? Math.min(100, Math.round((totalLost / totalToLose) * 100)) : 0

    let targetCalories = 0
    let macroProtein = 0
    let macroCarbs = 0
    let macroFat = 0

    if (profile) {
      const calc = calculateAll(
        profile.weight_kg,
        profile.height_cm,
        profile.age,
        profile.gender,
        profile.body_fat_percent ?? null,
        profile.activity_level,
        profile.office_job,
        profile.training_days_per_week
      )
      targetCalories = calc.target_calories
      macroProtein = Math.round(calc.protein_g)
      macroCarbs = Math.round(calc.carbs_g)
      macroFat = Math.round(calc.fat_g)
    }

    const caloriesConsumed = todayHabit?.calories_consumed ?? 0
    const chartData = weightLogs.map((l) => ({ date: l.date.slice(5), weight: l.weight_kg }))
    const waterMl = todayHabit?.water_ml ?? 0
    const sleepHours = todayHabit?.sleep_hours ?? 0
    const steps = todayHabit?.steps ?? 0
    const workoutDone = todayHabit?.workout_completed ?? false

    // streak from recent habit logs (most-recent-first)
    let streak = 0
    for (const log of recentHabits) {
      if (log.water_ml >= 2000 && Number(log.sleep_hours) >= 7 && log.steps >= 5000) streak += 1
      else break
    }
    const workouts30 = recentHabits.filter((l) => l.workout_completed).length

    return {
      currentWeight,
      goalWeight,
      totalLost,
      progressPercent,
      targetCalories,
      macroProtein,
      macroCarbs,
      macroFat,
      caloriesConsumed,
      chartData,
      waterMl,
      sleepHours,
      steps,
      workoutDone,
      streak,
      workouts30,
    }
  }, [profile, weightLogs, todayHabit, recentHabits])

  const xp = profile?.xp_total ?? 0
  const level = profile?.level ?? 1
  const progress = xpProgress(xp)
  const avatar = profile?.avatar_emoji ?? '🔥'

  const badgeStats: BadgeStats = {
    streak: derived.streak,
    workouts: derived.workouts30,
    weightLostKg: Number(derived.totalLost.toFixed(1)),
    level,
    coachMessages: counts.coach,
    mealPlans: counts.meals,
    bodyFatMeasures: counts.bodyFat,
  }
  const badges = earnedBadges(badgeStats)

  const firstName = profile?.email?.split('@')[0]?.split('.')[0] ?? 'there'

  const handleMood = async (mood: number) => {
    const ok = await saveMoodEnergy(supabase, { mood_today: mood })
    if (ok) {
      setProfile((p) => (p ? { ...p, mood_today: mood } : p))
      const res = await awardXp(supabase, 'log_mood')
      if (res?.leveled_up) {
        setFire((f) => f + 1)
        setLevelUpText(`LEVEL ${res.level}!`)
        window.setTimeout(() => setLevelUpText(null), 2600)
      }
    }
  }
  const handleEnergy = async (energy: number) => {
    const ok = await saveMoodEnergy(supabase, { energy_today: energy })
    if (ok) {
      setProfile((p) => (p ? { ...p, energy_today: energy } : p))
      const res = await awardXp(supabase, 'log_mood')
      if (res?.leveled_up) {
        setFire((f) => f + 1)
        setLevelUpText(`LEVEL ${res.level}!`)
        window.setTimeout(() => setLevelUpText(null), 2600)
      }
    }
  }

  // ---------- Render ----------

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <Skeleton className="h-[260px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Confetti fire={fire} />

      {/* ===== HERO BAND ===== */}
      <div className="press relative overflow-hidden rounded-4xl bg-primary p-5 text-primary-foreground brand-glow md:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--brand)] opacity-30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-white opacity-10 blur-2xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <LevelRing level={level} pct={progress.pct} avatar={avatar} />
            <div>
              <p className="text-sm uppercase tracking-wide opacity-80">
                Yo {firstName} <span className="inline-block animate-float">🔥</span>
              </p>
              <h1 className="font-display text-2xl font-bold leading-tight md:text-3xl">
                Level {level} unlocked
              </h1>
              <p className="mt-1 text-sm opacity-90">
                {progress.toNext > 0
                  ? `${progress.toNext} XP to Level ${level + 1}`
                  : "Max energy — you're crushing it!"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start rounded-full bg-white/15 px-4 py-2 backdrop-blur md:self-auto">
            <Flame className="h-5 w-5 text-[var(--brand)]" />
            <div className="leading-none">
              <span className="text-xl font-bold">{derived.streak}</span>
              <span className="ml-1 text-xs opacity-90">day streak</span>
            </div>
          </div>
        </div>

        {/* XP bar */}
        <div className="relative mt-4">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-[var(--brand)] transition-all duration-700"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[11px] opacity-80">
            <span>{xp} XP total</span>
            <span>{progress.pct}%</span>
          </div>
        </div>
      </div>

      {/* ===== MOOD / ENERGY CHECK-IN ===== */}
      <Card className="bg-card border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            How are you today?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <MoodRow label="Mood" faces={MOOD_FACES} value={profile?.mood_today} onPick={handleMood} />
          <MoodRow
            label="Energy"
            faces={ENERGY_FACES}
            value={profile?.energy_today}
            onPick={handleEnergy}
          />
        </CardContent>
      </Card>

      {/* ===== WATER (promoted, quick taps) ===== */}
      <WaterTrackerCard currentMl={derived.waterMl} onUpdate={loadData} />

      {/* ===== STATS ROW ===== */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-primary">
              <Scale className="h-4 w-4" />
              Current Weight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="font-display text-3xl font-bold text-foreground">
                <CountUp value={derived.currentWeight} decimals={1} />
              </span>
              <span className="pb-1 text-sm text-[var(--success)]">kg</span>
            </div>
            {derived.totalLost > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                <CountUp value={derived.totalLost} decimals={1} /> kg lost since start 🎉
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-primary">
              <Flame className="h-4 w-4" />
              Today&apos;s Calories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="font-display text-3xl font-bold text-foreground">
                <CountUp value={derived.caloriesConsumed} />
              </span>
              <span className="pb-1 text-sm text-muted-foreground">
                / {derived.targetCalories || '---'} kcal
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${
                    derived.targetCalories > 0
                      ? Math.min(100, (derived.caloriesConsumed / derived.targetCalories) * 100)
                      : 0
                  }%`,
                  background: 'linear-gradient(90deg, var(--energy), var(--primary))',
                }}
              />
            </div>
            {derived.targetCalories === 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Complete the calculator to set your target
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-primary">
              <Target className="h-4 w-4" />
              Goal Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-bold text-foreground">
              <CountUp value={derived.progressPercent} />%
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {derived.currentWeight.toFixed(1)} kg → {derived.goalWeight.toFixed(1)} kg
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${derived.progressPercent}%`, background: 'linear-gradient(90deg, var(--primary), var(--brand))' }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== BADGES PEEK ===== */}
      {badges.length > 0 && (
        <Card className="bg-card border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-foreground">
              <Trophy className="h-4 w-4 text-[var(--energy)]" />
              Your badges
              <span className="ml-auto text-xs text-muted-foreground">{badges.length} earned</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <span
                  key={b.id}
                  title={`${b.title} — ${b.description}`}
                  className="press flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm"
                >
                  <span className="text-base">{b.emoji}</span>
                  <span className="font-medium text-foreground">{b.title}</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== WEIGHT TREND ===== */}
      <Card className="bg-card border">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Weight Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {derived.chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={derived.chartData}>
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    color: 'var(--foreground)',
                    fontSize: '13px',
                  }}
                  labelStyle={{ color: 'var(--muted-foreground)' }}
                  formatter={(value: unknown) => [`${value} kg`, 'Weight']}
                />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  fill="url(#weightGradient)"
                  dot={false}
                  activeDot={{ r: 5, fill: 'var(--chart-1)', stroke: 'var(--card)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-muted-foreground">
              Log weight entries to see your trend chart
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== TODAY'S FOOD ===== */}
      <TodaysFoodCard />

      {/* ===== TODAY'S PLAN ===== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="bg-card border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Today&apos;s Macros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MacroBar label="Protein" current={0} target={derived.macroProtein} color="var(--protein)" />
            <MacroBar label="Carbs" current={0} target={derived.macroCarbs} color="var(--carbs)" />
            <MacroBar label="Fat" current={0} target={derived.macroFat} color="var(--fat)" />
            {derived.macroProtein === 0 && (
              <p className="text-xs text-muted-foreground">Complete the calculator to see macro targets</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Workout Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              {derived.workoutDone ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-[var(--success)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--success)]">Completed</p>
                    <p className="text-xs text-muted-foreground">Great job finishing today&apos;s workout!</p>
                  </div>
                </>
              ) : (
                <>
                  <Circle className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Pending</p>
                    <p className="text-xs text-muted-foreground">You haven&apos;t logged a workout yet today.</p>
                  </div>
                </>
              )}
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-3">
              <p className="mb-1 text-xs font-medium text-primary">AI Coach Suggestion</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {derived.workoutDone
                  ? 'Excellent work! Focus on recovery — drink plenty of water and get 7-8 hours of sleep tonight.'
                  : "You haven't worked out today. Even a 20-minute walk can help! Ready to start?"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Habit Tracker</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              <HabitRing label="Water" icon={Droplets} current={Math.round(derived.waterMl / 250)} target={8} unit="glasses" color="var(--hydration)" />
              <HabitRing label="Sleep" icon={Moon} current={Math.round(derived.sleepHours * 10) / 10} target={8} unit="hrs" color="var(--chart-1)" />
              <HabitRing label="Steps" icon={Footprints} current={Math.round(derived.steps / 1000)} target={10} unit="k" color="var(--carbs)" />
              <HabitRing label="Workout" icon={Dumbbell} current={derived.workoutDone ? 1 : 0} target={1} unit="done" color="var(--energy)" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== QUICK ACTIONS ===== */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Button onClick={() => setLogWeightOpen(true)} className="press h-14 bg-primary text-sm">
          <Plus className="mr-2 h-5 w-5" />
          Log Weight
        </Button>
        <Link href="/meals">
          <Button variant="outline" className="press h-14 w-full border text-sm">
            <UtensilsCrossed className="mr-2 h-5 w-5" />
            Log Meal
          </Button>
        </Link>
        <Link href="/modules/workout">
          <Button variant="outline" className="press h-14 w-full border text-sm">
            <Dumbbell className="mr-2 h-5 w-5" />
            Start Workout
          </Button>
        </Link>
        <Link href="/coach">
          <Button variant="outline" className="press h-14 w-full border text-sm">
            <MessageCircle className="mr-2 h-5 w-5" />
            Chat with Coach
          </Button>
        </Link>
      </div>

      <LogWeightDialog open={logWeightOpen} onOpenChange={setLogWeightOpen} onSaved={loadData} />

      {/* Level-up overlay */}
      {levelUpText && (
        <div className="pointer-events-none fixed inset-0 z-[110] flex items-center justify-center">
          <div className="animate-pop-in rounded-3xl bg-primary px-10 py-8 text-center text-primary-foreground brand-glow">
            <p className="text-5xl">🎉</p>
            <p className="mt-2 font-display text-3xl font-extrabold tracking-wide">{levelUpText}</p>
            <p className="text-sm opacity-90">You leveled up!</p>
          </div>
        </div>
      )}
    </div>
  )
}
