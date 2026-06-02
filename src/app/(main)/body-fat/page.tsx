'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Ruler, Save, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { UserProfile } from '@/types'

const categories = [
  { label: 'Essential', male: '2-5%', female: '10-13%', color: 'text-red-400' },
  { label: 'Athletes', male: '6-13%', female: '14-20%', color: 'text-orange-400' },
  { label: 'Fitness', male: '14-17%', female: '21-24%', color: 'text-yellow-400' },
  { label: 'Average', male: '18-24%', female: '25-31%', color: 'text-green-400' },
  { label: 'Obese', male: '25%+', female: '32%+', color: 'text-red-500' },
]

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className ?? ''}`} />
}

export default function BodyFatPage() {
  const supabase = useSupabase()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [measurements, setMeasurements] = useState<{ id: string; date: string; body_fat_percent: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [height, setHeight] = useState('')
  const [waist, setWaist] = useState('')
  const [neck, setNeck] = useState('')
  const [hip, setHip] = useState('')
  const [bf, setBf] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profRes, measRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('body_fat_measurements').select('*').eq('user_id', user.id).order('date', { ascending: true }),
      ])

      if (profRes.data) {
        setProfile(profRes.data)
        setGender(profRes.data.gender ?? 'male')
        setHeight(profRes.data.height_cm?.toString() ?? '')
      }
      if (measRes.data) {
        setMeasurements(measRes.data)
      }
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Use actual weight from profile instead of hardcoded 80
  const actualWeight = profile?.weight_kg ?? 0

  const calculate = () => {
    const h = parseFloat(height), w = parseFloat(waist), n = parseFloat(neck), hp = parseFloat(hip)
    if (!h || !w || !n) return
    let result: number
    if (gender === 'male') {
      result = 495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h)) - 450
    } else {
      if (!hp) return
      result = 495 / (1.29579 - 0.35004 * Math.log10(w + hp - n) + 0.22100 * Math.log10(h)) - 450
    }
    setBf(Math.round(result * 10) / 10)
  }

  const getCategory = () => {
    if (bf === null) return null
    const ranges = gender === 'male'
      ? [[2, 5], [6, 13], [14, 17], [18, 24], [25, 100]]
      : [[10, 13], [14, 20], [21, 24], [25, 31], [32, 100]]
    const idx = ranges.findIndex(([min, max]) => bf! >= min && bf! <= max)
    return idx >= 0 ? categories[idx] : categories[4]
  }

  const leanMass = bf !== null ? +(actualWeight * (1 - bf / 100)).toFixed(1) : 0
  const fatMass = bf !== null ? +(actualWeight * bf / 100).toFixed(1) : 0
  const cat = getCategory()

  const handleSave = async () => {
    if (bf === null) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('body_fat_measurements').insert({
        user_id: user.id,
        body_fat_percent: bf,
        method: 'navy',
        height_cm: parseFloat(height),
        waist_cm: parseFloat(waist),
        neck_cm: parseFloat(neck),
        hip_cm: gender === 'female' && hip ? parseFloat(hip) : null,
        lean_mass_kg: leanMass,
        fat_mass_kg: fatMass,
      })
      loadData()
    } finally {
      setSaving(false)
    }
  }

  // Determine trend
  const trendDirection = measurements.length >= 2
    ? measurements[measurements.length - 1].body_fat_percent - measurements[measurements.length - 2].body_fat_percent
    : 0

  const TrendIcon = trendDirection < -0.1 ? TrendingDown : trendDirection > 0.1 ? TrendingUp : Minus
  const trendColor = trendDirection < -0.1 ? 'text-green-400' : trendDirection > 0.1 ? 'text-red-400' : 'text-gray-400'
  const trendLabel = trendDirection < -0.1
    ? `${Math.abs(trendDirection).toFixed(1)}% down`
    : trendDirection > 0.1
      ? `${trendDirection.toFixed(1)}% up`
      : 'Stable'

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-3">
        <Ruler className="w-7 h-7 text-cyan-400" />Body Fat Estimator
      </h1>
      <p className="text-gray-400 text-sm">US Navy Method &middot; Using weight: <span className="text-white font-medium">{actualWeight > 0 ? `${actualWeight.toFixed(1)} kg` : 'No weight set'}</span></p>

      {/* History Chart */}
      {measurements.length > 1 && (
        <Card className="bg-[#1a1d27] border-[#2a2d37]">
          <CardHeader>
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              Body Fat % Over Time
              <span className={`text-xs flex items-center gap-1 ${trendColor}`}>
                <TrendIcon className="w-3 h-3" />
                {trendLabel}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={measurements.map(m => ({ date: m.date.slice(5), bf: m.body_fat_percent }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} domain={['dataMin - 2', 'dataMax + 2']} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d37', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(value: unknown) => [`${value}%`, 'Body Fat']}
                />
                <Line type="monotone" dataKey="bf" stroke="#22d3ee" strokeWidth={2} dot={{ r: 4, fill: '#22d3ee', stroke: '#1a1d27', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>{measurements.length > 0 ? `${measurements[0].date.slice(0, 10)}` : ''}</span>
              <span>{measurements.length > 0 ? `${measurements[measurements.length - 1].date.slice(0, 10)}` : ''}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card className="bg-[#1a1d27] border-[#2a2d37]">
          <CardHeader><CardTitle className="text-white">Measurements</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-300">Gender</Label>
              <Select value={gender} onValueChange={v => v && setGender(v as 'male' | 'female')}>
                <SelectTrigger className="bg-[#0c0e14] border-[#2a2d37] text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1a1d27] border-[#2a2d37]">
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-gray-300">Height (cm)</Label><Input type="number" value={height} onChange={e => setHeight(e.target.value)} className="bg-[#0c0e14] border-[#2a2d37] text-white" placeholder="175" /></div>
              <div><Label className="text-gray-300">Waist (cm)</Label><Input type="number" value={waist} onChange={e => setWaist(e.target.value)} className="bg-[#0c0e14] border-[#2a2d37] text-white" placeholder="85" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-gray-300">Neck (cm)</Label><Input type="number" value={neck} onChange={e => setNeck(e.target.value)} className="bg-[#0c0e14] border-[#2a2d37] text-white" placeholder="38" /></div>
              {gender === 'female' && <div><Label className="text-gray-300">Hip (cm)</Label><Input type="number" value={hip} onChange={e => setHip(e.target.value)} className="bg-[#0c0e14] border-[#2a2d37] text-white" placeholder="95" /></div>}
            </div>
            <Button onClick={calculate} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white">Calculate</Button>
          </CardContent>
        </Card>

        {bf !== null && (
          <div className="space-y-4">
            <Card className="bg-gradient-to-br from-cyan-950/50 to-[#1a1d27] border-cyan-500/20">
              <CardContent className="pt-6 text-center">
                <p className="text-6xl font-bold text-white">{bf}<span className="text-2xl text-cyan-400">%</span></p>
                {cat && <p className={`mt-2 text-lg font-medium ${cat.color}`}>{cat.label}</p>}
                <div className="mt-4 h-4 rounded-full bg-[#0c0e14] flex overflow-hidden">
                  <div className="bg-cyan-500" style={{ width: `${100 - bf}%` }} /><div className="bg-amber-500" style={{ width: `${bf}%` }} />
                </div>
                <div className="flex justify-between text-xs mt-1"><span className="text-cyan-400">Lean Mass</span><span className="text-amber-400">Fat Mass</span></div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a1d27] border-[#2a2d37]">
              <CardContent className="pt-4 grid grid-cols-2 gap-4">
                <div className="text-center"><p className="text-xs text-gray-500">Lean Mass</p><p className="text-xl font-bold text-cyan-400">{leanMass} kg</p></div>
                <div className="text-center"><p className="text-xs text-gray-500">Fat Mass</p><p className="text-xl font-bold text-amber-400">{fatMass} kg</p></div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a1d27] border-[#2a2d37]">
              <CardHeader className="py-3"><CardTitle className="text-sm text-gray-400">Categories ({gender})</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <tbody>
                    {categories.map(c => (
                      <tr key={c.label} className={`border-b border-[#2a2d37]/50 ${cat?.label === c.label ? 'bg-white/5' : ''}`}>
                        <td className={`py-2 ${c.color}`}>{c.label}</td>
                        <td className="py-2 text-gray-300 text-right">{gender === 'male' ? c.male : c.female}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Measurement</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
