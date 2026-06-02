'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Calculator,
  Save,
  ChevronDown,
  ChevronUp,
  User,
  Activity,
  Flame,
  PieChart,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { calculateAll, getActivityMultiplier } from '@/lib/calculations'
import type { CalculationResult } from '@/types'
import { useSupabase } from '@/components/providers/supabase-provider'

type DeficitLevel = 'mild' | 'moderate' | 'aggressive'
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
type Gender = 'male' | 'female'

interface FormState {
  age: string
  gender: Gender
  height: string
  weight: string
  bodyFat: string
  activity: ActivityLevel
  trainingDays: number
  officeJob: boolean
}

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  light: 'Lightly Active',
  moderate: 'Moderately Active',
  active: 'Active',
  very_active: 'Very Active',
}

const DEFICIT_CONFIG: {
  key: DeficitLevel
  label: string
  percent: number
  weeklyLoss: string
  color: string
  gradientFrom: string
  gradientTo: string
}[] = [
  {
    key: 'mild',
    label: 'Mild',
    percent: 10,
    weeklyLoss: '~0.25 kg',
    color: 'text-green-400',
    gradientFrom: 'from-green-500/20',
    gradientTo: 'to-emerald-500/5',
  },
  {
    key: 'moderate',
    label: 'Moderate',
    percent: 20,
    weeklyLoss: '~0.5 kg',
    color: 'text-amber-400',
    gradientFrom: 'from-amber-500/20',
    gradientTo: 'to-orange-500/5',
  },
  {
    key: 'aggressive',
    label: 'Aggressive',
    percent: 25,
    weeklyLoss: '~0.75 kg',
    color: 'text-red-400',
    gradientFrom: 'from-red-500/20',
    gradientTo: 'to-rose-500/5',
  },
]

export default function CalculatorPage() {
  const supabase = useSupabase()
  const [form, setForm] = useState<FormState>({
    age: '',
    gender: 'male',
    height: '',
    weight: '',
    bodyFat: '',
    activity: 'moderate',
    trainingDays: 3,
    officeJob: true,
  })
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [selectedDeficit, setSelectedDeficit] = useState<DeficitLevel>('moderate')
  const [showExplanation, setShowExplanation] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleCalculate = () => {
    const w = parseFloat(form.weight)
    const h = parseFloat(form.height)
    const a = parseInt(form.age)
    const bf = form.bodyFat ? parseFloat(form.bodyFat) : null

    if (!w || !h || !a) return

    const calcResult = calculateAll(
      w,
      h,
      a,
      form.gender,
      bf,
      form.activity,
      form.officeJob,
      form.trainingDays
    )
    setResult(calcResult)
    setSaveStatus('idle')
  }

  // Derived macro values based on selected deficit
  const deficitCalories = useMemo(() => {
    if (!result) return 0
    if (selectedDeficit === 'mild') return result.mild_deficit
    if (selectedDeficit === 'aggressive') return result.aggressive_deficit
    return result.moderate_deficit
  }, [result, selectedDeficit])

  const macros = useMemo(() => {
    if (!result) return null
    const weight = parseFloat(form.weight) || 0
    const proteinG = +(2.2 * weight).toFixed(1)
    const proteinCal = Math.round(proteinG * 4)
    const fatCal = Math.round(deficitCalories * 0.25)
    const fatG = +(fatCal / 9).toFixed(1)
    const carbsCal = Math.round(deficitCalories - proteinCal - fatCal)
    const carbsG = +(carbsCal / 4).toFixed(1)
    const totalCal = proteinCal + fatCal + carbsCal
    return {
      protein: { grams: proteinG, calories: proteinCal, percent: totalCal > 0 ? +((proteinCal / totalCal) * 100).toFixed(1) : 0 },
      carbs: { grams: carbsG, calories: carbsCal, percent: totalCal > 0 ? +((carbsCal / totalCal) * 100).toFixed(1) : 0 },
      fat: { grams: fatG, calories: fatCal, percent: totalCal > 0 ? +((fatCal / totalCal) * 100).toFixed(1) : 0 },
    }
  }, [result, form.weight, deficitCalories])

  const handleSaveToProfile = async () => {
    if (!result) return
    setSaving(true)
    setSaveStatus('idle')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setSaveStatus('error')
        setSaving(false)
        return
      }

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        age: parseInt(form.age),
        gender: form.gender,
        height_cm: parseFloat(form.height),
        weight_kg: parseFloat(form.weight),
        body_fat_percent: form.bodyFat ? parseFloat(form.bodyFat) : null,
        activity_level: form.activity,
        training_days_per_week: form.trainingDays,
        office_job: form.officeJob,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error
      setSaveStatus('success')
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const activityMultiplier = getActivityMultiplier(form.activity)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
          <Calculator className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Calorie & Macro Calculator
          </h1>
          <p className="text-sm text-gray-500">
            Calculate your TDEE, deficit options, and optimal macro split
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ---------- Input Form ---------- */}
        <Card className="bg-[#1a1d27] border-[#2a2d37]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-400" />
              Your Details
            </CardTitle>
            <CardDescription className="text-gray-500">
              Enter your body metrics for accurate calculations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Age & Gender */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Age</Label>
                <Input
                  type="number"
                  value={form.age}
                  onChange={(e) => updateField('age', e.target.value)}
                  className="bg-[#0c0e14] border-[#2a2d37] text-white"
                  placeholder="30"
                  min={1}
                  max={120}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Gender</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => updateField('gender', v as Gender)}
                >
                  <SelectTrigger className="bg-[#0c0e14] border-[#2a2d37] text-white w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d27] border-[#2a2d37]">
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Height & Weight */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Height (cm)</Label>
                <Input
                  type="number"
                  value={form.height}
                  onChange={(e) => updateField('height', e.target.value)}
                  className="bg-[#0c0e14] border-[#2a2d37] text-white"
                  placeholder="175"
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.weight}
                  onChange={(e) => updateField('weight', e.target.value)}
                  className="bg-[#0c0e14] border-[#2a2d37] text-white"
                  placeholder="85"
                  min={1}
                />
              </div>
            </div>

            {/* Body Fat % */}
            <div className="space-y-2">
              <Label className="text-gray-300">
                Body Fat % <span className="text-gray-600">(optional)</span>
              </Label>
              <Input
                type="number"
                step="0.1"
                value={form.bodyFat}
                onChange={(e) => updateField('bodyFat', e.target.value)}
                className="bg-[#0c0e14] border-[#2a2d37] text-white"
                placeholder="22"
                min={1}
                max={60}
              />
              {form.bodyFat && (
                <p className="text-xs text-indigo-400/70">
                  Enables Katch-McArdle BMR for lean-mass-based accuracy
                </p>
              )}
            </div>

            {/* Activity Level */}
            <div className="space-y-2">
              <Label className="text-gray-300">Activity Level</Label>
              <Select
                value={form.activity}
                onValueChange={(v) => updateField('activity', v as ActivityLevel)}
              >
                <SelectTrigger className="bg-[#0c0e14] border-[#2a2d37] text-white w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d27] border-[#2a2d37]">
                  {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Training Days Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Training Days / Week</Label>
                <span className="text-sm font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-md">
                  {form.trainingDays}
                </span>
              </div>
              <Slider
                value={[form.trainingDays]}
                onValueChange={(v) => updateField('trainingDays', Array.isArray(v) ? v[0] : v)}
                min={0}
                max={7}
                step={1}
              />
              <div className="flex justify-between text-[10px] text-gray-600 px-0.5">
                <span>0</span>
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
                <span>6</span>
                <span>7</span>
              </div>
            </div>

            {/* Office Job Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-[#2a2d37] bg-[#0c0e14] p-3">
              <div>
                <Label className="text-gray-300 text-sm">Office Job</Label>
                <p className="text-xs text-gray-600 mt-0.5">
                  Applies -100 kcal NEAT adjustment
                </p>
              </div>
              <Switch
                checked={form.officeJob}
                onCheckedChange={(checked) => updateField('officeJob', !!checked)}
              />
            </div>

            {/* Calculate Button */}
            <Button
              onClick={handleCalculate}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/20 transition-all duration-200"
              size="lg"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Calculate
            </Button>
          </CardContent>
        </Card>

        {/* ---------- Results ---------- */}
        {result && macros && (
          <div className="space-y-4">
            {/* Body Composition Analysis */}
            <Card className="bg-[#1a1d27] border-[#2a2d37] relative overflow-hidden">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-400" />
                  Body Composition Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#2a2d37] hover:bg-transparent">
                      <TableHead className="text-gray-500">Metric</TableHead>
                      <TableHead className="text-gray-500 text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="border-[#2a2d37]">
                      <TableCell className="text-gray-400">BMR (Mifflin-St Jeor)</TableCell>
                      <TableCell className="text-right text-white font-semibold">
                        {result.bmr_mifflin.toLocaleString()} kcal
                      </TableCell>
                    </TableRow>
                    {result.bmr_katch !== null && (
                      <TableRow className="border-[#2a2d37]">
                        <TableCell className="text-gray-400">
                          BMR (Katch-McArdle)
                          <span className="ml-2 text-[10px] text-indigo-400/70 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                            BF%
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-white font-semibold">
                          {result.bmr_katch.toLocaleString()} kcal
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow className="border-[#2a2d37]">
                      <TableCell className="text-gray-400">TDEE</TableCell>
                      <TableCell className="text-right text-indigo-400 font-bold">
                        {result.tdee.toLocaleString()} kcal
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-[#2a2d37]">
                      <TableCell className="text-gray-400">Maintenance</TableCell>
                      <TableCell className="text-right text-white font-semibold">
                        {result.maintenance.toLocaleString()} kcal
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Deficit Options */}
            <Card className="bg-[#1a1d27] border-[#2a2d37]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-400" />
                  Deficit Options
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Select a deficit level to see your target calories and macros
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#2a2d37] hover:bg-transparent">
                      <TableHead className="text-gray-500">Deficit Level</TableHead>
                      <TableHead className="text-gray-500 text-right">Calories</TableHead>
                      <TableHead className="text-gray-500 text-right">Weekly Loss</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {DEFICIT_CONFIG.map(({ key, label, percent, weeklyLoss, color }) => {
                      const cal =
                        key === 'mild'
                          ? result.mild_deficit
                          : key === 'aggressive'
                            ? result.aggressive_deficit
                            : result.moderate_deficit
                      const isSelected = selectedDeficit === key
                      return (
                        <TableRow
                          key={key}
                          className={`border-[#2a2d37] cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-500/10 ring-1 ring-indigo-500/30'
                              : 'hover:bg-white/[0.02]'
                          }`}
                          onClick={() => setSelectedDeficit(key)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-2 w-2 rounded-full ${
                                  isSelected ? 'bg-indigo-400' : 'bg-gray-600'
                                }`}
                              />
                              <span className={isSelected ? 'text-white font-medium' : 'text-gray-400'}>
                                {label} ({percent}%)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold ${color}`}
                          >
                            {cal.toLocaleString()} kcal
                          </TableCell>
                          <TableCell className="text-right text-gray-400">
                            {weeklyLoss}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Macronutrient Breakdown */}
            <Card className="bg-[#1a1d27] border-[#2a2d37] relative overflow-hidden">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-pink-500 via-yellow-500 to-indigo-500" />
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-pink-400" />
                  Macronutrient Breakdown
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Target: <span className="text-white font-semibold">{deficitCalories.toLocaleString()} kcal</span> / day
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#2a2d37] hover:bg-transparent">
                      <TableHead className="text-gray-500">Macro</TableHead>
                      <TableHead className="text-gray-500 text-right">Grams</TableHead>
                      <TableHead className="text-gray-500 text-right">Calories</TableHead>
                      <TableHead className="text-gray-500 text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="border-[#2a2d37]">
                      <TableCell className="text-pink-400 font-medium">Protein</TableCell>
                      <TableCell className="text-right text-white">{macros.protein.grams}g</TableCell>
                      <TableCell className="text-right text-gray-400">{macros.protein.calories}</TableCell>
                      <TableCell className="text-right text-gray-400">{macros.protein.percent}%</TableCell>
                    </TableRow>
                    <TableRow className="border-[#2a2d37]">
                      <TableCell className="text-yellow-400 font-medium">Carbs</TableCell>
                      <TableCell className="text-right text-white">{macros.carbs.grams}g</TableCell>
                      <TableCell className="text-right text-gray-400">{macros.carbs.calories}</TableCell>
                      <TableCell className="text-right text-gray-400">{macros.carbs.percent}%</TableCell>
                    </TableRow>
                    <TableRow className="border-[#2a2d37]">
                      <TableCell className="text-indigo-400 font-medium">Fat</TableCell>
                      <TableCell className="text-right text-white">{macros.fat.grams}g</TableCell>
                      <TableCell className="text-right text-gray-400">{macros.fat.calories}</TableCell>
                      <TableCell className="text-right text-gray-400">{macros.fat.percent}%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                {/* Macro bar visual */}
                <div className="space-y-2">
                  <div className="h-3 rounded-full bg-[#0c0e14] flex overflow-hidden">
                    <div
                      className="bg-pink-500 transition-all duration-500"
                      style={{ width: `${macros.protein.percent}%` }}
                    />
                    <div
                      className="bg-yellow-500 transition-all duration-500"
                      style={{ width: `${macros.carbs.percent}%` }}
                    />
                    <div
                      className="bg-indigo-500 transition-all duration-500"
                      style={{ width: `${macros.fat.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-600">
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-pink-500" />
                      Protein
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
                      Carbs
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
                      Fat
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step-by-step Calculation Explanation */}
            <Card className="bg-[#1a1d27] border-[#2a2d37]">
              <button
                className="w-full"
                onClick={() => setShowExplanation(!showExplanation)}
                type="button"
              >
                <CardHeader className="hover:bg-white/[0.02] transition-colors rounded-t-xl">
                  <CardTitle className="text-white text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-gray-500" />
                      Step-by-Step Calculation
                    </span>
                    {showExplanation ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </CardTitle>
                </CardHeader>
              </button>
              {showExplanation && (
                <CardContent>
                  <div className="space-y-3 text-sm">
                    {/* Step 1: BMR */}
                    <div className="rounded-lg bg-[#0c0e14] p-3 space-y-1.5">
                      <p className="text-indigo-400 font-medium">
                        Step 1: Basal Metabolic Rate (BMR)
                      </p>
                      <p className="text-gray-400">
                        <span className="text-gray-500">Mifflin-St Jeor:</span>{' '}
                        BMR = 10 x weight + 6.25 x height - 5 x age{' '}
                        {form.gender === 'male' ? '+ 5' : '- 161'}
                      </p>
                      <p className="text-gray-400 font-mono text-xs">
                        BMR = 10 x {form.weight} + 6.25 x {form.height} - 5 x {form.age}{' '}
                        {form.gender === 'male' ? '+ 5' : '- 161'} ={' '}
                        <span className="text-white font-semibold">{result.bmr_mifflin}</span> kcal
                      </p>
                      {result.bmr_katch !== null && (
                        <>
                          <p className="text-gray-400 mt-2">
                            <span className="text-gray-500">Katch-McArdle:</span>{' '}
                            BMR = 370 + 21.6 x lean_mass
                          </p>
                          <p className="text-gray-400 font-mono text-xs">
                            lean_mass = {form.weight} x (1 - {form.bodyFat}/100) ={' '}
                            +({(parseFloat(form.weight) * (1 - parseFloat(form.bodyFat) / 100)).toFixed(1)} kg)
                          </p>
                          <p className="text-gray-400 font-mono text-xs">
                            BMR = 370 + 21.6 x{' '}
                            {(parseFloat(form.weight) * (1 - parseFloat(form.bodyFat) / 100)).toFixed(1)} ={' '}
                            <span className="text-white font-semibold">{result.bmr_katch}</span> kcal
                          </p>
                          <p className="text-xs text-indigo-400/70">
                            Using Katch-McArdle as primary BMR (body fat provided)
                          </p>
                        </>
                      )}
                    </div>

                    {/* Step 2: TDEE */}
                    <div className="rounded-lg bg-[#0c0e14] p-3 space-y-1.5">
                      <p className="text-amber-400 font-medium">
                        Step 2: Total Daily Energy Expenditure (TDEE)
                      </p>
                      <p className="text-gray-400">
                        TDEE = BMR x activity_multiplier
                        {form.officeJob ? ' - 100 (office adjustment)' : ''}
                      </p>
                      <p className="text-gray-400 font-mono text-xs">
                        TDEE = {result.bmr_katch ?? result.bmr_mifflin} x {activityMultiplier}
                        {form.officeJob ? ' - 100' : ''} ={' '}
                        <span className="text-white font-semibold">{result.tdee}</span> kcal
                      </p>
                    </div>

                    {/* Step 3: Deficit */}
                    <div className="rounded-lg bg-[#0c0e14] p-3 space-y-1.5">
                      <p className="text-green-400 font-medium">
                        Step 3: Caloric Deficit
                      </p>
                      <p className="text-gray-400">
                        Target = Maintenance - {DEFICIT_CONFIG.find((d) => d.key === selectedDeficit)?.percent}% deficit
                      </p>
                      <p className="text-gray-400 font-mono text-xs">
                        Target = {result.maintenance} x {(1 - (DEFICIT_CONFIG.find((d) => d.key === selectedDeficit)?.percent ?? 20) / 100).toFixed(2)} ={' '}
                        <span className="text-white font-semibold">{deficitCalories}</span> kcal
                      </p>
                    </div>

                    {/* Step 4: Macros */}
                    <div className="rounded-lg bg-[#0c0e14] p-3 space-y-1.5">
                      <p className="text-pink-400 font-medium">
                        Step 4: Macronutrient Split
                      </p>
                      <p className="text-gray-400">
                        <span className="text-pink-400/70">Protein:</span> {form.weight}kg x 2.2g/kg ={' '}
                        <span className="text-white">{macros.protein.grams}g</span>{' '}
                        ({macros.protein.calories} kcal)
                      </p>
                      <p className="text-gray-400">
                        <span className="text-indigo-400/70">Fat:</span> {deficitCalories} x 25% ={' '}
                        <span className="text-white">{macros.fat.grams}g</span>{' '}
                        ({macros.fat.calories} kcal)
                      </p>
                      <p className="text-gray-400">
                        <span className="text-yellow-400/70">Carbs:</span> {deficitCalories} - {macros.protein.calories} - {macros.fat.calories} ={' '}
                        <span className="text-white">{macros.carbs.grams}g</span>{' '}
                        ({macros.carbs.calories} kcal)
                      </p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Save to Profile */}
            <Card className="bg-[#1a1d27] border-[#2a2d37]">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleSaveToProfile}
                    disabled={saving || !result}
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/20"
                    size="lg"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save to Profile'}
                  </Button>
                  {saveStatus === 'success' && (
                    <div className="flex items-center gap-1.5 text-green-400 text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      Saved
                    </div>
                  )}
                  {saveStatus === 'error' && (
                    <div className="flex items-center gap-1.5 text-red-400 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      Error
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Saves your metrics to your profile for personalized recommendations across all modules.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
