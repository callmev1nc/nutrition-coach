'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckSquare, Droplets, Moon, Footprints, Dumbbell, ChevronLeft, ChevronRight, Save, Flame, Trophy, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { HabitLog } from '@/types'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className ?? ''}`} />
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

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [todayRes, recentRes] = await Promise.all([
        supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('date', date).maybeSingle(),
        supabase.from('habit_logs').select('*').eq('user_id', user.id).order('date', { ascending: true }).limit(7),
      ])

      if (todayRes.data) {
        setWater(todayRes.data.water_ml || 0)
        setSleep(todayRes.data.sleep_hours || 0)
        setSteps(todayRes.data.steps || 0)
        setWorkout(todayRes.data.workout_completed || false)
        setCalories(todayRes.data.calories_consumed?.toString() || '')
      } else {
        setWater(0); setSleep(0); setSteps(0); setWorkout(false); setCalories('')
      }

      if (recentRes.data) setRecentLogs(recentRes.data)
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
    await supabase.from('habit_logs').upsert({
      user_id: user.id,
      date,
      water_ml: water,
      sleep_hours: sleep,
      steps,
      workout_completed: workout,
      calories_consumed: calories ? parseInt(calories) : null,
    }, { onConflict: 'user_id,date' })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    loadData()
  }

  const prevDay = () => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d.toISOString().split('T')[0]) }
  const nextDay = () => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d.toISOString().split('T')[0]) }

  // Streak tracking
  const reversed = [...recentLogs].reverse()
  let streak = 0
  for (const log of reversed) {
    if (log.water_ml >= 2000 && log.sleep_hours >= 7 && log.steps >= 5000) {
      streak++
    } else break
  }

  // Weekly chart data
  const chartData = recentLogs.map(l => ({
    date: l.date.slice(5),
    water: Math.round(l.water_ml / 250),
    sleep: l.sleep_hours,
    steps: Math.round(l.steps / 1000),
  }))

  const habitCards = [
    { key: 'water', label: 'Water Intake', val: water, set: setWater, target: 2500, max: 4000, step: 100, unit: 'ml', color: '#3b82f6', Icon: Droplets },
    { key: 'sleep', label: 'Sleep Hours', val: sleep, set: setSleep, target: 8, max: 12, step: 0.5, unit: 'h', color: '#8b5cf6', Icon: Moon },
    { key: 'steps', label: 'Steps', val: steps, set: setSteps, target: 8000, max: 20000, step: 500, unit: '', color: '#22c55e', Icon: Footprints },
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
      <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-3">
        <CheckSquare className="w-7 h-7 text-indigo-400" />Habit Tracker
      </h1>

      {/* Streak + Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-amber-950/30 to-[#1a1d27] border-amber-500/20">
          <CardContent className="pt-4 flex items-center gap-3">
            <Trophy className={`w-8 h-8 ${streak > 0 ? 'text-amber-400' : 'text-gray-600'}`} />
            <div>
              <p className="text-2xl font-bold text-white">{streak}</p>
              <p className="text-xs text-gray-400">Day streak</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-950/30 to-[#1a1d27] border-indigo-500/20">
          <CardContent className="pt-4 flex items-center gap-3">
            <Flame className="w-8 h-8 text-indigo-400" />
            <div>
              <p className="text-2xl font-bold text-white">{recentLogs.length > 0 ? recentLogs.filter(l => l.workout_completed).length : 0}</p>
              <p className="text-xs text-gray-400">Workouts (7d)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Chart */}
      {chartData.length > 0 && (
        <Card className="bg-[#1a1d27] border-[#2a2d37]">
          <CardHeader>
            <CardTitle className="text-sm text-gray-400">7-Day Habit Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} width={30} />
                <Tooltip
                  contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d37', borderRadius: '8px', color: '#e0e0e0', fontSize: '12px' }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Bar dataKey="water" name="Water (glasses)" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="sleep" name="Sleep (hrs)" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="steps" name="Steps (k)" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Date Navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" onClick={prevDay} className="text-gray-400 hover:text-white"><ChevronLeft /></Button>
        <span className="text-lg font-medium text-white">{date}</span>
        <Button variant="ghost" size="icon" onClick={nextDay} className="text-gray-400 hover:text-white"><ChevronRight /></Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {habitCards.map(h => {
          const pct = h.target > 0 ? Math.min(100, Math.round((h.val / h.target) * 100)) : 0
          return (
            <Card key={h.key} className="bg-[#1a1d27] border-[#2a2d37]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <h.Icon className="w-4 h-4" style={{ color: h.color }} />
                  <span className="text-gray-300">{h.label}</span>
                  <span className="ml-auto text-gray-500 text-xs">{pct}%</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-white">{h.val}</span>
                  <span className="text-gray-500">{h.unit} / {h.target} {h.unit}</span>
                </div>
                <Slider value={[h.val]} onValueChange={(v) => h.set(typeof v === 'number' ? v : v[0])} max={h.max} step={h.step} />
                <div className="h-2 rounded-full bg-[#0c0e14]">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: h.color }} />
                </div>
              </CardContent>
            </Card>
          )
        })}

        <Card className="bg-[#1a1d27] border-[#2a2d37]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-orange-400" />
              <span className="text-gray-300">Workout</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => setWorkout(!workout)}
              className={`w-full py-4 rounded-xl text-lg font-medium transition-all ${
                workout
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'bg-[#0c0e14] text-gray-500 border border-[#2a2d37]'
              }`}
            >
              {workout ? '✓ Completed' : 'Not yet'}
            </button>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1d27] border-[#2a2d37]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-300">Calories Consumed</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              value={calories}
              onChange={e => setCalories(e.target.value)}
              className="bg-[#0c0e14] border-[#2a2d37] text-white"
              placeholder="e.g. 1850"
            />
          </CardContent>
        </Card>
      </div>

      <Button
        onClick={saveData}
        className={`w-full text-white ${saved ? 'bg-green-600' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}`}
      >
        <Save className="w-4 h-4 mr-2" />
        {saved ? 'Saved!' : 'Save'}
      </Button>
    </div>
  )
}
