'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  Target,
  User,
  Zap,
} from 'lucide-react'
import { useTheme } from '@/components/providers/theme-provider'
import { THEMES, COACH_PERSONAS, AVATAR_OPTIONS } from '@/lib/themes'

interface OnboardingData {
  age: string
  gender: string
  height_cm: string
  weight_kg: string
  body_fat_percent: string
  training_experience: string
  activity_level: string
  training_days_per_week: number
  office_job: boolean
  goal_weight_kg: string
  weekly_budget: string
  food_preferences: string
  medical_limitations: string
  joint_pain_areas: string
  sleep_quality: string
  coach_persona: string
  avatar_emoji: string
  theme: string
}

const INITIAL_DATA: OnboardingData = {
  age: '',
  gender: '',
  height_cm: '',
  weight_kg: '',
  body_fat_percent: '',
  training_experience: '',
  activity_level: '',
  training_days_per_week: 3,
  office_job: true,
  goal_weight_kg: '',
  weekly_budget: '',
  food_preferences: '',
  medical_limitations: '',
  joint_pain_areas: '',
  sleep_quality: '',
  coach_persona: 'hype',
  avatar_emoji: '🔥',
  theme: 'volt',
}

const TOTAL_STEPS = 7

const ACTIVITY_DESCRIPTIONS: Record<string, string> = {
  sedentary: 'Little or no exercise, desk job',
  light: 'Light exercise 1-3 days/week',
  moderate: 'Moderate exercise 3-5 days/week',
  active: 'Hard exercise 6-7 days/week',
  very_active: 'Very hard exercise, physical job or training twice/day',
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = useSupabase()
  const router = useRouter()
  const { setTheme } = useTheme()

  const update = useCallback(
    <K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) => {
      setData((prev) => ({ ...prev, [field]: value }))
      setError('')
    },
    []
  )

  const progressPercent = ((step + 1) / TOTAL_STEPS) * 100

  // ---------- Validation per step ----------
  const validateCurrentStep = (): boolean => {
    switch (step) {
      case 1:
        if (!data.age || +data.age < 10 || +data.age > 120) {
          setError('Please enter a valid age (10-120).')
          return false
        }
        if (!data.gender) {
          setError('Please select your gender.')
          return false
        }
        if (!data.height_cm || +data.height_cm < 50 || +data.height_cm > 300) {
          setError('Please enter a valid height (50-300 cm).')
          return false
        }
        if (!data.weight_kg || +data.weight_kg < 20 || +data.weight_kg > 400) {
          setError('Please enter a valid weight (20-400 kg).')
          return false
        }
        return true
      case 2:
        if (
          data.body_fat_percent &&
          (+data.body_fat_percent < 2 || +data.body_fat_percent > 70)
        ) {
          setError('Body fat % must be between 2 and 70.')
          return false
        }
        if (!data.training_experience) {
          setError('Please select your training experience.')
          return false
        }
        return true
      case 3:
        if (!data.activity_level) {
          setError('Please select your activity level.')
          return false
        }
        return true
      case 4:
        if (
          !data.goal_weight_kg ||
          +data.goal_weight_kg < 20 ||
          +data.goal_weight_kg > 400
        ) {
          setError('Please enter a valid goal weight (20-400 kg).')
          return false
        }
        return true
      case 5:
        if (!data.sleep_quality) {
          setError('Please select your sleep quality.')
          return false
        }
        return true
      default:
        return true
    }
  }

  const handleNext = () => {
    if (!validateCurrentStep()) return
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1)
    }
  }

  const handleBack = () => {
    setError('')
    if (step > 0) setStep((s) => s - 1)
  }

  // ---------- Save profile ----------
  const handleFinish = async () => {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) {
        setError('Not authenticated. Please log in again.')
        return
      }

      const profile = {
        id: user.id,
        email: user.email!,
        age: +data.age,
        gender: data.gender as 'male' | 'female',
        height_cm: +data.height_cm,
        weight_kg: +data.weight_kg,
        body_fat_percent: data.body_fat_percent ? +data.body_fat_percent : null,
        activity_level: data.activity_level,
        training_days_per_week: data.training_days_per_week,
        office_job: data.office_job,
        goal_weight_kg: +data.goal_weight_kg,
        weekly_budget: data.weekly_budget ? +data.weekly_budget : null,
        food_preferences: data.food_preferences || null,
        medical_limitations: data.medical_limitations || null,
        joint_pain_areas: data.joint_pain_areas || null,
        sleep_quality: data.sleep_quality,
        coach_persona: data.coach_persona,
        avatar_emoji: data.avatar_emoji,
        theme: data.theme,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }

      const timeoutPromise = new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), 15000)
      )

      const res = await Promise.race([
        fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profile),
        }),
        timeoutPromise,
      ])

      if (!res.ok) {
        const { error } = await res.json()
        setError(error || 'Failed to save profile. Please try again.')
        return
      }

      router.replace('/dashboard')
    } catch (err) {
      if (err instanceof Error && err.message === 'Request timed out') {
        setError('Request timed out. Please try again.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ---------- Step renderers ----------

  const renderStep0 = () => (
    <div className="space-y-6 py-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-[var(--brand)] flex items-center justify-center brand-glow">
          <Zap className="w-10 h-10 text-white" fill="currentColor" />
        </div>
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground mb-2">
            Let&apos;s set up your vibe
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Pick your look, then we&apos;ll build a personalized plan around your goals.
          </p>
        </div>
      </div>

      {/* Theme */}
      <div className="space-y-2">
        <Label className="text-foreground">Theme</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {THEMES.map((t) => {
            const active = data.theme === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  update('theme', t.key)
                  setTheme(t.key)
                }}
                className={`press flex items-center gap-2 rounded-xl border-2 p-2 text-left transition-all ${
                  active ? 'border-primary brand-glow' : 'border-border hover:border-primary/40'
                }`}
                aria-pressed={active}
              >
                <span className="flex">
                  <span className="h-5 w-5 rounded-full border-2 border-white" style={{ background: t.swatch.primary }} />
                  <span className="-ml-2 h-5 w-5 rounded-full border-2 border-white" style={{ background: t.swatch.accent }} />
                </span>
                <span className="text-xs font-medium text-foreground">{t.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Coach persona */}
      <div className="space-y-2">
        <Label className="text-foreground">Coach personality</Label>
        <div className="grid grid-cols-2 gap-2">
          {COACH_PERSONAS.map((p) => {
            const active = data.coach_persona === p.key
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => update('coach_persona', p.key)}
                className={`press rounded-xl border-2 p-2.5 text-left transition-all ${
                  active ? 'border-primary bg-primary/10 brand-glow' : 'border-border hover:border-primary/40'
                }`}
                aria-pressed={active}
              >
                <p className="text-sm font-semibold text-foreground">
                  {p.emoji} {p.name}
                </p>
                <p className="text-[11px] leading-tight text-muted-foreground">{p.blurb}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Avatar */}
      <div className="space-y-2">
        <Label className="text-foreground">Avatar</Label>
        <div className="flex flex-wrap gap-2">
          {AVATAR_OPTIONS.map((e) => {
            const active = data.avatar_emoji === e
            return (
              <button
                key={e}
                type="button"
                onClick={() => update('avatar_emoji', e)}
                className={`press flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-all ${
                  active ? 'bg-primary brand-glow scale-105' : 'bg-muted hover:bg-muted/70'
                }`}
                aria-pressed={active}
              >
                {e}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Basic Information</h2>
          <p className="text-sm text-muted-foreground">Tell us about yourself</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Age</Label>
          <Input
            type="number"
            placeholder="25"
            value={data.age}
            onChange={(e) => update('age', e.target.value)}
            className="bg-background border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Gender</Label>
          <Select
            value={data.gender}
            onValueChange={(v) => v && update('gender', v)}
          >
            <SelectTrigger className="w-full bg-background border text-foreground">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent className="bg-card border">
              <SelectItem value="male" className="text-gray-200">
                Male
              </SelectItem>
              <SelectItem value="female" className="text-gray-200">
                Female
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Height (cm)</Label>
          <Input
            type="number"
            placeholder="175"
            value={data.height_cm}
            onChange={(e) => update('height_cm', e.target.value)}
            className="bg-background border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Weight (kg)</Label>
          <Input
            type="number"
            placeholder="80"
            value={data.weight_kg}
            onChange={(e) => update('weight_kg', e.target.value)}
            className="bg-background border text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Activity className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Body Composition</h2>
          <p className="text-sm text-muted-foreground">
            Help us understand your body better
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">
          Body Fat %{' '}
          <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input
          type="number"
          placeholder="e.g. 20"
          value={data.body_fat_percent}
          onChange={(e) => update('body_fat_percent', e.target.value)}
          className="bg-background border text-foreground placeholder:text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground">
          If you know it from calipers, DEXA, or bioimpedance. Skip if unsure.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">Training Experience</Label>
        <Select
          value={data.training_experience}
          onValueChange={(v) => v && update('training_experience', v)}
        >
          <SelectTrigger className="w-full bg-background border text-foreground">
            <SelectValue placeholder="Select your level..." />
          </SelectTrigger>
          <SelectContent className="bg-card border">
            <SelectItem value="beginner" className="text-gray-200">
              Beginner (&lt; 1 year)
            </SelectItem>
            <SelectItem value="intermediate" className="text-gray-200">
              Intermediate (1-3 years)
            </SelectItem>
            <SelectItem value="advanced" className="text-gray-200">
              Advanced (3+ years)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Activity &amp; Lifestyle
          </h2>
          <p className="text-sm text-muted-foreground">
            How active are you day-to-day?
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">Activity Level</Label>
        <Select
          value={data.activity_level}
          onValueChange={(v) => v && update('activity_level', v)}
        >
          <SelectTrigger className="w-full bg-background border text-foreground">
            <SelectValue placeholder="Select activity level..." />
          </SelectTrigger>
          <SelectContent className="bg-card border">
            {Object.entries(ACTIVITY_DESCRIPTIONS).map(([value, desc]) => (
              <SelectItem key={value} value={value} className="text-gray-200">
                <div className="flex flex-col items-start">
                  <span className="capitalize font-medium">
                    {value.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className="text-foreground">Training Days / Week</Label>
          <span className="text-primary font-semibold text-lg">
            {data.training_days_per_week}
          </span>
        </div>
        <Slider
          value={[data.training_days_per_week]}
          onValueChange={(v) =>
            update('training_days_per_week', typeof v === 'number' ? v : v[0])
          }
          min={0}
          max={7}
          step={1}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0 days</span>
          <span>7 days</span>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl bg-background border border">
        <div>
          <Label className="text-foreground">Office Job</Label>
          <p className="text-xs text-muted-foreground">
            Do you mostly sit during work?
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={data.office_job}
          onClick={() => update('office_job', !data.office_job)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            data.office_job ? 'bg-primary' : 'bg-border'
          }`}
        >
          <span
            className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${
              data.office_job ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <Target className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Your Goals</h2>
          <p className="text-sm text-muted-foreground">
            What are you working toward?
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">Goal Weight (kg)</Label>
        <Input
          type="number"
          placeholder="e.g. 70"
          value={data.goal_weight_kg}
          onChange={(e) => update('goal_weight_kg', e.target.value)}
          className="bg-background border text-foreground placeholder:text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground">
          Your target weight. We&apos;ll calculate a realistic timeline.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">
          Weekly Budget ($){' '}
          <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input
          type="number"
          placeholder="e.g. 75"
          value={data.weekly_budget}
          onChange={(e) => update('weekly_budget', e.target.value)}
          className="bg-background border text-foreground placeholder:text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground">
          Helps us suggest affordable meal plans that fit your budget.
        </p>
      </div>
    </div>
  )

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
          <Heart className="w-5 h-5 text-rose-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Preferences &amp; Health
          </h2>
          <p className="text-sm text-muted-foreground">
            Anything we should know about?
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">
          Food Preferences{' '}
          <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Textarea
          placeholder="e.g. vegetarian, gluten-free, no dairy, Mediterranean..."
          value={data.food_preferences}
          onChange={(e) => update('food_preferences', e.target.value)}
          className="bg-background border text-foreground placeholder:text-muted-foreground min-h-[80px]"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">
          Medical Limitations{' '}
          <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Textarea
          placeholder="e.g. diabetes, IBS, high blood pressure, food allergies..."
          value={data.medical_limitations}
          onChange={(e) => update('medical_limitations', e.target.value)}
          className="bg-background border text-foreground placeholder:text-muted-foreground min-h-[80px]"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">
          Joint Pain Areas{' '}
          <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Textarea
          placeholder="e.g. knees, lower back, shoulders..."
          value={data.joint_pain_areas}
          onChange={(e) => update('joint_pain_areas', e.target.value)}
          className="bg-background border text-foreground placeholder:text-muted-foreground min-h-[60px]"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">Sleep Quality</Label>
        <Select
          value={data.sleep_quality}
          onValueChange={(v) => v && update('sleep_quality', v)}
        >
          <SelectTrigger className="w-full bg-background border text-foreground">
            <SelectValue placeholder="How well do you sleep?" />
          </SelectTrigger>
          <SelectContent className="bg-card border">
            <SelectItem value="poor" className="text-gray-200">
              Poor - Frequently wake up, feel unrested
            </SelectItem>
            <SelectItem value="fair" className="text-gray-200">
              Fair - Occasional disturbances
            </SelectItem>
            <SelectItem value="good" className="text-gray-200">
              Good - Mostly consistent sleep
            </SelectItem>
            <SelectItem value="excellent" className="text-gray-200">
              Excellent - Deep, refreshing sleep
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  const renderStep6 = () => (
    <div className="text-center space-y-6 py-4">
      <div className="mx-auto w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-sm">
        <Check className="w-10 h-10 text-foreground" />
      </div>
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">
          Your plan is ready!
        </h2>
        <p className="text-muted-foreground">
          We&apos;ve built a personalized plan based on your profile.
        </p>
      </div>

      {/* Summary card */}
      <div className="text-left space-y-3 p-4 rounded-xl bg-background border border">
        <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider mb-3">
          Profile Summary
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <SummaryRow label="Age" value={data.age ? `${data.age} yrs` : '-'} />
          <SummaryRow label="Gender" value={data.gender || '-'} />
          <SummaryRow
            label="Height"
            value={data.height_cm ? `${data.height_cm} cm` : '-'}
          />
          <SummaryRow
            label="Weight"
            value={data.weight_kg ? `${data.weight_kg} kg` : '-'}
          />
          <SummaryRow
            label="Goal Weight"
            value={data.goal_weight_kg ? `${data.goal_weight_kg} kg` : '-'}
          />
          <SummaryRow
            label="Activity"
            value={
              data.activity_level ? data.activity_level.replace('_', ' ') : '-'
            }
          />
          <SummaryRow
            label="Training"
            value={`${data.training_days_per_week} days/week`}
          />
          <SummaryRow label="Sleep" value={data.sleep_quality || '-'} />
        </div>
        {(data.food_preferences || data.medical_limitations) && (
          <div className="mt-3 pt-3 border-t border space-y-1">
            {data.food_preferences && (
              <p className="text-xs text-muted-foreground">
                <span className="text-muted-foreground">Food prefs:</span>{' '}
                {data.food_preferences}
              </p>
            )}
            {data.medical_limitations && (
              <p className="text-xs text-muted-foreground">
                <span className="text-muted-foreground">Medical:</span>{' '}
                {data.medical_limitations}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )

  const stepRenderers = [
    renderStep0,
    renderStep1,
    renderStep2,
    renderStep3,
    renderStep4,
    renderStep5,
    renderStep6,
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-600/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Progress bar */}
        {step > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                Step {step} of {TOTAL_STEPS - 1}
              </span>
              <span className="text-xs text-muted-foreground">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-card overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        <Card className="bg-card border">
          <CardContent className="pt-6">
            {/* Error banner */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Step content */}
            {stepRenderers[step]()}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border">
              {step > 0 ? (
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="text-muted-foreground hover:text-foreground hover:bg-transparent"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              {step < TOTAL_STEPS - 1 ? (
                <Button
                  onClick={handleNext}
                  className="bg-primary text-primary-foreground"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  disabled={loading}
                  className="bg-primary text-primary-foreground"
                >
                  {loading ? 'Saving...' : 'Go to Dashboard'}
                  {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---------- Helper component ----------

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-gray-200 capitalize">{value}</span>
    </div>
  )
}
