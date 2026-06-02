'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import {
  TrendingDown,
  TrendingUp,
  Minus,
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
  Loader2,
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { LogWeightDialog } from '@/components/dashboard/LogWeightDialog'
import type { UserProfile, WeightLog, HabitLog } from '@/types'
import { calculateAll } from '@/lib/calculations'

// ---------- Skeleton helpers ----------

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/[0.06] ${className ?? ''}`}
    />
  )
}

function StatCardSkeleton() {
  return (
    <Card className="bg-[#1a1d27] border-[#2a2d37]">
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

function ChartSkeleton() {
  return (
    <Card className="bg-[#1a1d27] border-[#2a2d37]">
      <CardHeader>
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[260px] w-full" />
      </CardContent>
    </Card>
  )
}

// ---------- Habit Ring component ----------

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
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="5"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke={completed ? '#22c55e' : color}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute">
          {completed ? (
            <CheckCircle2 className="h-5 w-5 text-green-400" />
          ) : (
            <Icon className="h-4 w-4" style={{ color }} />
          )}
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-gray-300">{label}</p>
        <p className="text-[11px] text-gray-500">
          {current}/{target} {unit}
        </p>
      </div>
    </div>
  )
}

// ---------- Macro Bar component ----------

function MacroBar({
  label,
  current,
  target,
  color,
}: {
  label: string
  current: number
  target: number
  color: string
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-500">
          {current}g / {target}g
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// ---------- Main page ----------

export default function DashboardPage() {
  const supabase = useSupabase()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [todayHabit, setTodayHabit] = useState<HabitLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [logWeightOpen, setLogWeightOpen] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const [profRes, logsRes, habitRes] = await Promise.all([
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
          .single(),
      ])

      if (profRes.data) setProfile(profRes.data)
      if (logsRes.data) setWeightLogs(logsRes.data)
      if (habitRes.data) setTodayHabit(habitRes.data)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ---------- Derived data ----------

  const currentWeight = profile?.weight_kg ?? 0
  const goalWeight = profile?.goal_weight_kg ?? 0
  const startWeight =
    weightLogs.length > 0 ? weightLogs[0].weight_kg : currentWeight

  const trendWeight =
    weightLogs.length >= 2
      ? weightLogs[weightLogs.length - 1].weight_kg -
        weightLogs[weightLogs.length - 2].weight_kg
      : 0

  const totalLost = startWeight - currentWeight
  const totalToLose = startWeight - goalWeight
  const progressPercent =
    totalToLose > 0
      ? Math.min(100, Math.round((totalLost / totalToLose) * 100))
      : 0

  // Calories & macros from calculations
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

  // Chart data
  const chartData = weightLogs.map((l) => ({
    date: l.date.slice(5),
    weight: l.weight_kg,
  }))

  // Habit data (defaults for today)
  const waterMl = todayHabit?.water_ml ?? 0
  const sleepHours = todayHabit?.sleep_hours ?? 0
  const steps = todayHabit?.steps ?? 0
  const workoutDone = todayHabit?.workout_completed ?? false

  // Weight trend arrow
  const TrendIcon =
    trendWeight < -0.05
      ? TrendingDown
      : trendWeight > 0.05
        ? TrendingUp
        : Minus
  const trendColor =
    trendWeight < -0.05 ? 'text-green-400' : trendWeight > 0.05 ? 'text-red-400' : 'text-gray-400'
  const trendLabel =
    trendWeight < -0.05
      ? `${Math.abs(trendWeight).toFixed(1)} kg down`
      : trendWeight > 0.05
        ? `${trendWeight.toFixed(1)} kg up`
        : 'Stable'

  // ---------- Render ----------

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <ChartSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <span className="text-xs text-gray-500">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      {/* ===== 1. Top Stats Row ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Weight */}
        <Card className="bg-gradient-to-br from-indigo-950/50 to-[#1a1d27] border-indigo-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-indigo-300 flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Current Weight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-white">
                {currentWeight.toFixed(1)}
              </span>
              <span className="text-sm text-green-400 pb-1">kg</span>
            </div>
            <div className={`flex items-center gap-1 mt-1 text-sm ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              <span>{trendLabel}</span>
            </div>
            {totalLost > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                {totalLost.toFixed(1)} kg lost since start
              </p>
            )}
          </CardContent>
        </Card>

        {/* Today's Calories */}
        <Card className="bg-gradient-to-br from-amber-950/50 to-[#1a1d27] border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-300 flex items-center gap-2">
              <Flame className="w-4 h-4" />
              Today&apos;s Calories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-white">
                {caloriesConsumed}
              </span>
              <span className="text-sm text-gray-400 pb-1">
                / {targetCalories || '---'} kcal
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                style={{
                  width: `${
                    targetCalories > 0
                      ? Math.min(100, (caloriesConsumed / targetCalories) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            {targetCalories === 0 && (
              <p className="text-xs text-gray-500 mt-1.5">
                Complete the calculator to set your target
              </p>
            )}
          </CardContent>
        </Card>

        {/* Goal Progress */}
        <Card className="bg-gradient-to-br from-purple-950/50 to-[#1a1d27] border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-purple-300 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Goal Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{progressPercent}%</div>
            <p className="text-xs text-gray-500 mt-0.5">
              {currentWeight.toFixed(1)} kg → {goalWeight.toFixed(1)} kg
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-purple-900/30">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== 2. Weight Trend Chart ===== */}
      <Card className="bg-[#1a1d27] border-[#2a2d37]">
        <CardHeader>
          <CardTitle className="text-sm text-gray-400">Weight Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1a1d27',
                    border: '1px solid #2a2d37',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                    fontSize: '13px',
                  }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(value: unknown) => [`${value} kg`, 'Weight']}
                />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="#818cf8"
                  strokeWidth={2.5}
                  fill="url(#weightGradient)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#818cf8', stroke: '#1a1d27', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-gray-500">
              Log weight entries to see your trend chart
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== 3. Today's Plan ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Macro Breakdown */}
        <Card className="bg-[#1a1d27] border-[#2a2d37]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">
              Today&apos;s Macros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MacroBar
              label="Protein"
              current={0}
              target={macroProtein}
              color="#f472b6"
            />
            <MacroBar
              label="Carbs"
              current={0}
              target={macroCarbs}
              color="#60a5fa"
            />
            <MacroBar
              label="Fat"
              current={0}
              target={macroFat}
              color="#fbbf24"
            />
            {macroProtein === 0 && (
              <p className="text-xs text-gray-500">
                Complete the calculator to see macro targets
              </p>
            )}
          </CardContent>
        </Card>

        {/* Workout Status + Coach Suggestion */}
        <Card className="bg-[#1a1d27] border-[#2a2d37]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">Workout Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              {workoutDone ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-green-400">Completed</p>
                    <p className="text-xs text-gray-500">
                      Great job finishing today&apos;s workout!
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Circle className="h-6 w-6 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-300">Pending</p>
                    <p className="text-xs text-gray-500">
                      You haven&apos;t logged a workout yet today.
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="rounded-lg bg-indigo-500/[0.08] border border-indigo-500/20 p-3">
              <p className="text-xs font-medium text-indigo-300 mb-1">
                AI Coach Suggestion
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">
                {workoutDone
                  ? 'Excellent work! Focus on recovery — drink plenty of water and get 7-8 hours of sleep tonight.'
                  : "You haven't worked out today. Even a 20-minute walk can help! Ready to start?"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Habit Tracker Mini */}
        <Card className="bg-[#1a1d27] border-[#2a2d37]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">
              Habit Tracker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              <HabitRing
                label="Water"
                icon={Droplets}
                current={Math.round(waterMl / 250)}
                target={8}
                unit="glasses"
                color="#3b82f6"
              />
              <HabitRing
                label="Sleep"
                icon={Moon}
                current={Math.round(sleepHours * 10) / 10}
                target={8}
                unit="hrs"
                color="#a78bfa"
              />
              <HabitRing
                label="Steps"
                icon={Footprints}
                current={Math.round(steps / 1000)}
                target={10}
                unit="k"
                color="#22d3ee"
              />
              <HabitRing
                label="Workout"
                icon={Dumbbell}
                current={workoutDone ? 1 : 0}
                target={1}
                unit="done"
                color="#f97316"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== 4. Quick Actions Row ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button
          onClick={() => setLogWeightOpen(true)}
          className="h-14 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Log Weight
        </Button>
        <Link href="/meals">
          <Button
            variant="outline"
            className="w-full h-14 border-[#2a2d37] text-gray-300 hover:bg-[#1a1d27] text-sm"
          >
            <UtensilsCrossed className="w-5 h-5 mr-2" />
            Log Meal
          </Button>
        </Link>
        <Link href="/modules/workout">
          <Button
            variant="outline"
            className="w-full h-14 border-[#2a2d37] text-gray-300 hover:bg-[#1a1d27] text-sm"
          >
            <Dumbbell className="w-5 h-5 mr-2" />
            Start Workout
          </Button>
        </Link>
        <Link href="/coach">
          <Button
            variant="outline"
            className="w-full h-14 border-[#2a2d37] text-gray-300 hover:bg-[#1a1d27] text-sm"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Chat with Coach
          </Button>
        </Link>
      </div>

      {/* ===== Log Weight Dialog ===== */}
      <LogWeightDialog
        open={logWeightOpen}
        onOpenChange={setLogWeightOpen}
        onSaved={loadData}
      />
    </div>
  )
}
