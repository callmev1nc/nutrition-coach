'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, AlertTriangle, CheckCircle, Loader2, Save, ArrowUp, ArrowDown } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { UserProfile, WeightLog } from '@/types'
import { calculateAll } from '@/lib/calculations'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className ?? ''}`} />
}

export default function PlateauPage() {
  const supabase = useSupabase()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Manual input values (fallback / editable)
  const [startW, setStartW] = useState('')
  const [currentW, setCurrentW] = useState('')
  const [weeks, setWeeks] = useState('')
  const [last2Week, setLast2Week] = useState('')
  const [calories, setCalories] = useState('')
  const [analyzed, setAnalyzed] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profRes, logsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('weight_logs').select('*').eq('user_id', user.id).order('date', { ascending: true }).limit(90),
      ])

      if (profRes.data) setProfile(profRes.data)
      if (logsRes.data) setWeightLogs(logsRes.data)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Auto-populate from real data
  const hasRealData = weightLogs.length >= 3
  const autoStartW = weightLogs.length > 0 ? weightLogs[0].weight_kg : 0
  const autoCurrentW = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight_kg : 0
  const autoWeeks = weightLogs.length > 0 ? Math.max(1, Math.round(weightLogs.length / 7)) : 1

  // Last 2-week change
  const recentLogs = weightLogs.slice(-14)
  const autoLast2Week = recentLogs.length >= 2
    ? recentLogs[recentLogs.length - 1].weight_kg - recentLogs[0].weight_kg
    : 0

  const autoCalories = profile ? calculateAll(
    profile.weight_kg,
    profile.height_cm,
    profile.age,
    profile.gender,
    profile.body_fat_percent ?? null,
    profile.activity_level,
    profile.office_job,
    profile.training_days_per_week
  ).target_calories : 0

  // Use auto when available, else manual
  const sw = hasRealData ? autoStartW : (parseFloat(startW) || 0)
  const cw = hasRealData ? autoCurrentW : (parseFloat(currentW) || 0)
  const w = hasRealData ? autoWeeks : (parseInt(weeks) || 1)
  const l2 = hasRealData ? autoLast2Week : (parseFloat(last2Week) || 0)
  const cal = hasRealData ? autoCalories : (parseInt(calories) || 0)

  const totalLost = sw - cw
  const weeklyRate = w > 0 ? totalLost / w : 0
  const efficiency = weeklyRate > 0 ? Math.round((weeklyRate / 0.5) * 100) : 0
  const isPlateau = Math.abs(l2) < 0.2 && w >= 3

  // Corrective targets using calculateAll
  const correctiveTargets = profile ? calculateAll(
    profile.weight_kg,
    profile.height_cm,
    profile.age,
    profile.gender,
    profile.body_fat_percent ?? null,
    profile.activity_level,
    profile.office_job,
    profile.training_days_per_week
  ) : null

  const chartData = weightLogs.slice(-30).map(l => ({
    date: l.date.slice(5),
    weight: l.weight_kg,
  }))

  const handleAnalyze = () => {
    if (!hasRealData) setAnalyzed(true)
    else setAnalyzed(true)
  }

  const applyToProfile = async () => {
    if (!profile || !correctiveTargets) return
    setSaving(true)
    try {
      await supabase.from('profiles').update({
        calorie_target: correctiveTargets.target_calories,
      }).eq('id', profile.id)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
        <TrendingUp className="w-7 h-7 text-red-400" />Plateau Breakthrough
      </h1>

      {/* Auto-detected data banner */}
      {hasRealData && (
        <Card className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-primary/15">
          <CardContent className="py-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
            <p className="text-sm text-foreground">
              Auto-loaded from your data. {weightLogs.length} weight entries found over {autoWeeks} week{autoWeeks > 1 ? 's' : ''}.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Weight Trend Chart */}
      {chartData.length > 1 && (
        <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Weight Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} domain={['dataMin - 0.5', 'dataMax + 0.5']} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', color: '#1A1A2E', fontSize: '13px' }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(value: unknown) => [`${value} kg`, 'Weight']}
                />
                <Line type="monotone" dataKey="weight" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3, fill: '#f43f5e' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Manual input card (only when insufficient data) */}
      {!hasRealData && (
        <Card className="bg-card border">
          <CardHeader><CardTitle className="text-foreground">Enter Your Progress Data</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-foreground">Starting Weight (kg)</Label><Input type="number" step="0.1" value={startW} onChange={e => setStartW(e.target.value)} className="bg-background border text-foreground" /></div>
              <div><Label className="text-foreground">Current Weight (kg)</Label><Input type="number" step="0.1" value={currentW} onChange={e => setCurrentW(e.target.value)} className="bg-background border text-foreground" /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label className="text-foreground">Weeks</Label><Input type="number" value={weeks} onChange={e => setWeeks(e.target.value)} className="bg-background border text-foreground" /></div>
              <div><Label className="text-foreground">Last 2-Week Change (kg)</Label><Input type="number" step="0.1" value={last2Week} onChange={e => setLast2Week(e.target.value)} className="bg-background border text-foreground" /></div>
              <div><Label className="text-foreground">Daily Calories</Label><Input type="number" value={calories} onChange={e => setCalories(e.target.value)} className="bg-background border text-foreground" /></div>
            </div>
            <Button onClick={handleAnalyze} className="w-full bg-primary text-primary-foreground">Analyze</Button>
          </CardContent>
        </Card>
      )}

      {/* Auto-analyze when data available */}
      {(hasRealData || analyzed) && cw > 0 && (
        <div className="space-y-4">
          {/* Progress Report */}
          <Card className="bg-card border">
            <CardHeader><CardTitle className="text-foreground">Progress Report</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border">
                    <td className="py-2 text-muted-foreground">Total Lost</td>
                    <td className={`py-2 text-right font-medium ${totalLost > 0 ? 'text-green-400' : 'text-foreground'}`}>{totalLost.toFixed(1)} kg</td>
                  </tr>
                  <tr className="border-b border">
                    <td className="py-2 text-muted-foreground">Weekly Rate</td>
                    <td className="py-2 text-right text-foreground font-medium">{weeklyRate.toFixed(2)} kg/wk</td>
                  </tr>
                  <tr className="border-b border">
                    <td className="py-2 text-muted-foreground">Efficiency</td>
                    <td className="py-2 text-right text-foreground font-medium">{efficiency}%</td>
                  </tr>
                  <tr className="border-b border">
                    <td className="py-2 text-muted-foreground">Last 2-Week Change</td>
                    <td className="py-2 text-right">
                      <span className={`flex items-center justify-end gap-1 ${l2 < 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {l2 < 0 ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                        {Math.abs(l2).toFixed(2)} kg
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-muted-foreground">Status</td>
                    <td className="py-2 text-right">
                      {isPlateau ? (
                        <Badge className="bg-red-500/20 text-red-400"><AlertTriangle className="w-3 h-3 mr-1 inline" />Plateau</Badge>
                      ) : (
                        <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="w-3 h-3 mr-1 inline" />On Track</Badge>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Corrective Targets */}
          {correctiveTargets && (
            <Card className="bg-card border-amber-500/20">
              <CardHeader>
                <CardTitle className="text-amber-400 text-sm">Corrective Calorie Targets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-background text-center">
                    <p className="text-xs text-muted-foreground">Maintenance</p>
                    <p className="text-lg font-bold text-foreground">{correctiveTargets.maintenance}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background text-center">
                    <p className="text-xs text-muted-foreground">Current Target</p>
                    <p className="text-lg font-bold text-amber-400">{correctiveTargets.target_calories}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background text-center">
                    <p className="text-xs text-muted-foreground">Mild Deficit</p>
                    <p className="text-lg font-bold text-green-400">{correctiveTargets.mild_deficit}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background text-center">
                    <p className="text-xs text-muted-foreground">Aggressive</p>
                    <p className="text-lg font-bold text-red-400">{correctiveTargets.aggressive_deficit}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-center mt-1">
                  Protein: {Math.round(correctiveTargets.protein_g)}g &middot; Carbs: {Math.round(correctiveTargets.carbs_g)}g &middot; Fat: {Math.round(correctiveTargets.fat_g)}g
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plateau Diagnosis */}
          {isPlateau && (
            <>
              <Card className="bg-card border-red-500/20">
                <CardHeader><CardTitle className="text-red-400">Plateau Diagnosis</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-foreground text-sm">Top 3 causes:</p>
                  <ol className="text-sm text-foreground space-y-1 ml-4 list-decimal">
                    <li><strong className="text-foreground">Adaptive Thermogenesis</strong> — Metabolism slowed to match lower weight.</li>
                    <li><strong className="text-foreground">Water Retention</strong> — Cortisol/sodium masking fat loss on scale.</li>
                    <li><strong className="text-foreground">NEAT Decrease</strong> — Less subconscious daily movement.</li>
                  </ol>
                </CardContent>
              </Card>

              <Card className="bg-card border">
                <CardHeader><CardTitle className="text-foreground">5 Corrective Actions</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { t: 'Calorie Cycling', d: `Alternate ${cal - 200} and ${cal + 200} cal across the week. Mon/Wed/Fri low, rest high.`, c: 'text-indigo-400' },
                    { t: 'Refeed Day', d: `One day at maintenance (${Math.round(cal * 1.25)} cal). Focus carbs to reset leptin.`, c: 'text-amber-400' },
                    { t: 'Increase NEAT', d: 'Add 2000-3000 steps/day. Target 10,000 steps daily.', c: 'text-green-400' },
                    { t: 'Sleep Optimization', d: 'Poor sleep raises cortisol. Aim 7-9 hours. Check Sleep module.', c: 'text-blue-400' },
                    { t: 'Workout Adjustment', d: 'Progressive overload: increase weight/reps/sets by 5-10%.', c: 'text-purple-400' },
                  ].map((a, i) => (
                    <div key={i} className="p-3 bg-background rounded-lg">
                      <p className={`font-medium ${a.c}`}>{i + 1}. {a.t}</p>
                      <p className="text-sm text-foreground mt-1">{a.d}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {/* Apply to Profile Button */}
          {correctiveTargets && (
            <Button
              onClick={applyToProfile}
              disabled={saving}
              className="w-full bg-primary text-primary-foreground"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Apply {correctiveTargets.target_calories} kcal to Profile</>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
