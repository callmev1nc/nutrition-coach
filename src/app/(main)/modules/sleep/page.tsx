'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { BedDouble, Moon, Clock, TrendingUp, Info } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { UserProfile, HabitLog } from '@/types'

const defaultSchedule = [
  { time: '7:00 PM', activity: 'Last large meal finished', dur: '—' },
  { time: '7:30 PM', activity: 'Dim overhead lights, use warm lamps', dur: '5 min' },
  { time: '8:00 PM', activity: 'No more screens (phone, TV, laptop)', dur: '—' },
  { time: '8:15 PM', activity: 'Light stretching or yoga', dur: '10 min' },
  { time: '8:30 PM', activity: 'Read a physical book or calm music', dur: '30 min' },
  { time: '9:00 PM', activity: 'Warm shower or bath', dur: '15 min' },
  { time: '9:20 PM', activity: 'Write tomorrow\'s to-do list', dur: '5 min' },
  { time: '9:30 PM', activity: 'Bedroom: cool (18-20C), dark, quiet', dur: '5 min' },
  { time: '9:40 PM', activity: 'Chamomile tea + gratitude journal', dur: '10 min' },
  { time: '10:00 PM', activity: 'Lights out, 4-7-8 breathing exercise', dur: '5 min' },
]

const hormones = [
  { name: 'Cortisol', aka: 'Stress Hormone', color: 'text-red-400', desc: 'High cortisol = more belly fat storage. Poor sleep raises cortisol by 37%.' },
  { name: 'Leptin', aka: '"I\'m Full" Signal', color: 'text-green-400', desc: 'Sleep deprivation drops leptin by 18%, making you feel less satisfied.' },
  { name: 'Ghrelin', aka: '"I\'m Hungry" Signal', color: 'text-amber-400', desc: 'Poor sleep increases ghrelin by 28%, driving cravings for carbs and sugar.' },
]

const qualityTips: Record<string, { title: string; tips: string[] }> = {
  poor: {
    title: 'Urgent: Sleep Quality Needs Attention',
    tips: [
      'Prioritize 7+ hours — set a strict bedtime alarm',
      'Avoid caffeine after 2 PM and no screens 1 hour before bed',
      'Try the 4-7-8 breathing technique to fall asleep faster',
      'Keep bedroom temperature between 18-20°C (65-68°F)',
    ],
  },
  fair: {
    title: 'Room for Improvement',
    tips: [
      'Aim to push sleep duration closer to 8 hours',
      'Reduce blue light exposure in the evening',
      'Incorporate evening wind-down routine consistently',
      'Consider magnesium glycinate supplement before bed',
    ],
  },
  good: {
    title: 'Good Foundation — Fine-Tune',
    tips: [
      'Maintain consistent bed/wake times even on weekends',
      'Try progressive muscle relaxation for deeper sleep',
      'Limit water intake 1 hour before bed to avoid interruptions',
      'Expose yourself to morning sunlight for circadian alignment',
    ],
  },
  excellent: {
    title: 'Excellent Sleep Habits!',
    tips: [
      'Your sleep is a strength — maintain your routine',
      'Focus on sleep consistency across the week',
      'Use your extra energy for morning workouts',
      'Share your habits with others to inspire them',
    ],
  },
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className ?? ''}`} />
}

export default function SleepPage() {
  const supabase = useSupabase()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([])
  const [started, setStarted] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profRes, logsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('habit_logs').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(7),
      ])

      if (profRes.data) setProfile(profRes.data)
      if (logsRes.data) setHabitLogs(logsRes.data.reverse())
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  const sleepQuality = profile?.sleep_quality ?? 'fair'
  const sleepData = habitLogs.filter(l => l.sleep_hours > 0)

  const avgSleep = sleepData.length > 0
    ? sleepData.reduce((s, l) => s + l.sleep_hours, 0) / sleepData.length
    : 0

  const latestSleep = sleepData.length > 0 ? sleepData[sleepData.length - 1].sleep_hours : 0

  const bedtimeConsistency = sleepData.length >= 3
    ? Math.round((sleepData.filter(l => l.sleep_hours >= 7).length / sleepData.length) * 100)
    : 50

  const screenCutoff = sleepQuality === 'excellent' ? 90 : sleepQuality === 'good' ? 70 : sleepQuality === 'fair' ? 50 : 30
  const caffeineCutoff = sleepQuality === 'excellent' ? 90 : sleepQuality === 'good' ? 75 : sleepQuality === 'fair' ? 55 : 40
  const overallScore = sleepData.length > 0
    ? Math.round((avgSleep / 8) * 40 + (bedtimeConsistency / 100) * 30 + (screenCutoff / 100) * 15 + (caffeineCutoff / 100) * 15)
    : 50

  const chartData = sleepData.map(l => ({
    date: l.date.slice(5),
    sleep: l.sleep_hours,
  }))

  const last7Avg = sleepData.length > 0
    ? (sleepData.reduce((s, l) => s + l.sleep_hours, 0) / sleepData.length).toFixed(1)
    : 'N/A'

  const personalizedSchedule = sleepQuality === 'poor' || sleepQuality === 'fair'
    ? defaultSchedule.map(s => ({
        ...s,
        activity: s.time === '7:00 PM'
          ? 'Last large meal finished (avoid spicy/heavy foods)'
          : s.time === '8:00 PM'
            ? 'No more screens — use blue-light blocking glasses if necessary'
            : s.time === '10:00 PM'
              ? 'Lights out — use earplugs if noise is an issue'
              : s.activity,
      }))
    : defaultSchedule

  const tips = qualityTips[sleepQuality] ?? qualityTips.fair

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-3">
        <BedDouble className="w-7 h-7 text-blue-400" />Sleep & Fat Loss
      </h1>

      {!started ? (
        <Card className="bg-[#1a1d27] border-[#2a2d37]">
          <CardHeader><CardTitle className="text-white">Sleep is the #1 Underrated Fat Loss Factor</CardTitle></CardHeader>
          <CardContent>
            <p className="text-gray-400 mb-4">Poor sleep increases hunger hormones by 28% and drops fullness signals by 18%.</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-[#0c0e14]">
                <p className="text-xs text-gray-500">Your Avg Sleep</p>
                <p className="text-xl font-bold text-blue-400">{avgSleep > 0 ? `${avgSleep.toFixed(1)} h` : 'No data'}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#0c0e14]">
                <p className="text-xs text-gray-500">Sleep Quality</p>
                <p className="text-xl font-bold text-purple-400 capitalize">{sleepQuality}</p>
              </div>
            </div>
            <Button onClick={() => setStarted(true)} className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              Show My Sleep Protocol
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 7-Day Trend Chart */}
          {chartData.length > 1 && (
            <Card className="bg-[#1a1d27] border-[#2a2d37]">
              <CardHeader>
                <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  7-Day Sleep Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7280" fontSize={12} domain={[0, 12]} tickLine={false} axisLine={false} width={30} />
                    <Tooltip
                      contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d37', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }}
                      labelStyle={{ color: '#9ca3af' }}
                      formatter={(value: unknown) => [`${value} hrs`, 'Sleep']}
                    />
                    <Area type="monotone" dataKey="sleep" stroke="#818cf8" strokeWidth={2.5} fill="url(#sleepGradient)" dot={{ r: 4, fill: '#818cf8', stroke: '#1a1d27', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-500 mt-2">
                  7-day average: <span className="text-blue-400 font-medium">{last7Avg}h</span> &middot; Target: 8h
                </p>
              </CardContent>
            </Card>
          )}

          {/* Evening Wind-Down Schedule */}
          <Card className="bg-[#1a1d27] border-[#2a2d37]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Evening Wind-Down Schedule
                <Badge className="bg-blue-500/20 text-blue-400 text-[9px] ml-auto">Personalized</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <tbody>
                  {personalizedSchedule.map((s, i) => (
                    <tr key={i} className="border-b border-[#2a2d37]">
                      <td className="py-2 text-blue-400 font-medium w-24">{s.time}</td>
                      <td className="py-2 text-gray-300">{s.activity}</td>
                      <td className="py-2 text-gray-500 text-right">{s.dur}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Personalized Tips */}
          <Card className="bg-gradient-to-br from-blue-950/30 to-[#1a1d27] border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-sm text-blue-300 flex items-center gap-2">
                <Info className="w-4 h-4" />
                {tips.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {tips.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-blue-400 mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Hormones */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {hormones.map(h => (
              <Card key={h.name} className="bg-[#1a1d27] border-[#2a2d37]">
                <CardHeader><CardTitle className={`text-lg ${h.color}`}>{h.name}</CardTitle><p className="text-xs text-gray-500">{h.aka}</p></CardHeader>
                <CardContent><p className="text-sm text-gray-300">{h.desc}</p></CardContent>
              </Card>
            ))}
          </div>

          {/* Sleep Quality Metrics */}
          <Card className="bg-[#1a1d27] border-[#2a2d37]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Moon className="w-4 h-4 text-purple-400" />
                Sleep Quality Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                ['Duration (7-9h target)', Math.min(100, Math.round((latestSleep / 9) * 100))],
                ['Bedtime Consistency', bedtimeConsistency],
                ['Screen Cutoff', screenCutoff],
                ['Caffeine Cutoff', caffeineCutoff],
                ['Overall Sleep Score', overallScore],
              ].map(([l, v]) => (
                <div key={String(l)}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{String(l)}</span>
                    <span className="text-gray-400">{v}%</span>
                  </div>
                  <Progress value={v as number} className="h-2 bg-[#0c0e14] [&>[data-slot=indicator]]:bg-gradient-to-r [&>[data-slot=indicator]]:from-blue-500 [&>[data-slot=indicator]]:to-purple-500" />
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
