'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertTriangle,
  Download,
  Key,
  Loader2,
  Palette,
  Save,
  Settings,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react'
import { useTheme } from '@/components/providers/theme-provider'
import { THEMES, COACH_PERSONAS, AVATAR_OPTIONS, type ThemeKey } from '@/lib/themes'

interface ProfileFormData {
  age: string
  gender: string
  height_cm: string
  weight_kg: string
  body_fat_percent: string
  activity_level: string
  training_days_per_week: number
  office_job: boolean
  goal_weight_kg: string
  weekly_budget: string
  food_preferences: string
  medical_limitations: string
  joint_pain_areas: string
  sleep_quality: string
}

const EMPTY_FORM: ProfileFormData = {
  age: '',
  gender: '',
  height_cm: '',
  weight_kg: '',
  body_fat_percent: '',
  activity_level: '',
  training_days_per_week: 3,
  office_job: false,
  goal_weight_kg: '',
  weekly_budget: '',
  food_preferences: '',
  medical_limitations: '',
  joint_pain_areas: '',
  sleep_quality: '',
}

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'active', label: 'Active' },
  { value: 'very_active', label: 'Very Active' },
]

const SLEEP_OPTIONS = [
  { value: 'poor', label: 'Poor' },
  { value: 'fair', label: 'Fair' },
  { value: 'good', label: 'Good' },
  { value: 'excellent', label: 'Excellent' },
]

export default function SettingsPage() {
  const supabase = useSupabase()
  const router = useRouter()
  const { setTheme } = useTheme()
  const [theme, setThemeState] = useState<string>('volt')
  const [persona, setPersona] = useState<string>('hype')
  const [avatar, setAvatar] = useState<string>('🔥')

  // Profile form
  const [form, setForm] = useState<ProfileFormData>(EMPTY_FORM)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Password
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Delete
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Export
  const [exporting, setExporting] = useState(false)

  // ---------- Load profile ----------
  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error || !data) {
        setProfileLoading(false)
        return
      }

      setForm({
        age: String(data.age ?? ''),
        gender: data.gender ?? '',
        height_cm: String(data.height_cm ?? ''),
        weight_kg: String(data.weight_kg ?? ''),
        body_fat_percent: String(data.body_fat_percent ?? ''),
        activity_level: data.activity_level ?? '',
        training_days_per_week: data.training_days_per_week ?? 3,
        office_job: data.office_job ?? false,
        goal_weight_kg: String(data.goal_weight_kg ?? ''),
        weekly_budget: String(data.weekly_budget ?? ''),
        food_preferences: data.food_preferences ?? '',
        medical_limitations: data.medical_limitations ?? '',
        joint_pain_areas: data.joint_pain_areas ?? '',
        sleep_quality: data.sleep_quality ?? '',
      })
      setThemeState(data.theme ?? 'volt')
      setPersona(data.coach_persona ?? 'hype')
      setAvatar(data.avatar_emoji ?? '🔥')
      setProfileLoading(false)
    }

    loadProfile()
  }, [supabase, router])

  const updateField = useCallback(
    <K extends keyof ProfileFormData>(field: K, value: ProfileFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      setProfileMsg(null)
    },
    []
  )

  // ---------- Save profile ----------
  const handleSaveProfile = async () => {
    setProfileSaving(true)
    setProfileMsg(null)

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) {
        setProfileMsg({ type: 'error', text: 'Not authenticated.' })
        setProfileSaving(false)
        return
      }

      const updates = {
        id: user.id,
        age: form.age ? +form.age : null,
        gender: form.gender || null,
        height_cm: form.height_cm ? +form.height_cm : null,
        weight_kg: form.weight_kg ? +form.weight_kg : null,
        body_fat_percent: form.body_fat_percent ? +form.body_fat_percent : null,
        activity_level: form.activity_level || null,
        training_days_per_week: form.training_days_per_week,
        office_job: form.office_job,
        goal_weight_kg: form.goal_weight_kg ? +form.goal_weight_kg : null,
        weekly_budget: form.weekly_budget ? +form.weekly_budget : null,
        food_preferences: form.food_preferences || null,
        medical_limitations: form.medical_limitations || null,
        joint_pain_areas: form.joint_pain_areas || null,
        sleep_quality: form.sleep_quality || null,
        updated_at: new Date().toISOString(),
      }

      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed to save profile.' }))
        setProfileMsg({ type: 'error', text: error || 'Failed to save profile.' })
      } else {
        setProfileMsg({ type: 'success', text: 'Profile updated successfully.' })
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Something went wrong.' })
    } finally {
      setProfileSaving(false)
    }
  }

  // ---------- Change password ----------
  const handleChangePassword = async () => {
    setPasswordMsg(null)

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({
        type: 'error',
        text: 'All password fields are required.',
      })
      return
    }
    if (newPassword.length < 8) {
      setPasswordMsg({
        type: 'error',
        text: 'New password must be at least 8 characters.',
      })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' })
      return
    }

    setPasswordSaving(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPasswordMsg({ type: 'error', text: error.message })
    } else {
      setPasswordMsg({
        type: 'success',
        text: 'Password changed successfully.',
      })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
    setPasswordSaving(false)
  }

  // ---------- Delete account ----------
  const handleDeleteAccount = async () => {
    if (deleteText !== 'DELETE') {
      setDeleteMsg({ type: 'error', text: 'Please type DELETE to confirm.' })
      return
    }

    setDeleting(true)
    setDeleteMsg(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setDeleteMsg({ type: 'error', text: 'Not authenticated.' })
        setDeleting(false)
        return
      }

      // Delete profile row via API (bypasses RLS)
      const res = await fetch('/api/profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id }),
      })

      if (!res.ok) {
        setDeleteMsg({ type: 'error', text: 'Failed to delete profile data.' })
        setDeleting(false)
        return
      }

      // Sign out and redirect
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      setDeleteMsg({ type: 'error', text: 'Failed to delete account.' })
      setDeleting(false)
    }
  }

  // ---------- Export data ----------
  const handleExport = async () => {
    setExporting(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setExporting(false)
        return
      }

      const [profileRes, weightRes, habitRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),
        supabase
          .from('weight_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false }),
        supabase
          .from('habit_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false }),
      ])

      const exportData = {
        exported_at: new Date().toISOString(),
        profile: profileRes.data || null,
        weight_logs: weightRes.data || [],
        habit_logs: habitRes.data || [],
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nutricoach-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Silent fail for export
    } finally {
      setExporting(false)
    }
  }

  // ---------- Personalization (theme / persona / avatar) ----------
  const savePersonalization = useCallback(
    async (patch: Record<string, string>) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return
        await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
      } catch {
        // best-effort — UI already updated optimistically
      }
    },
    [supabase]
  )

  const onTheme = (k: ThemeKey) => {
    setThemeState(k)
    setTheme(k)
    savePersonalization({ theme: k })
  }
  const onPersona = (k: string) => {
    setPersona(k)
    savePersonalization({ coach_persona: k })
  }
  const onAvatar = (e: string) => {
    setAvatar(e)
    savePersonalization({ avatar_emoji: e })
  }

  // ---------- Loading state ----------
  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  const inputClass =
    'bg-background border text-foreground placeholder:text-muted-foreground'
  const selectTriggerClass = 'w-full bg-background border text-foreground'

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Settings className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your profile and account
            </p>
          </div>
        </div>

        {/* ===== Profile Section ===== */}
        <Card className="bg-card border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <CardTitle className="text-lg text-foreground">Profile</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">
              Update your personal information and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {profileMsg && (
              <div
                className={`p-3 rounded-lg border text-sm ${
                  profileMsg.type === 'success'
                    ? 'bg-primary/10 border-primary/20 text-primary'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}
              >
                {profileMsg.text}
              </div>
            )}

            {/* Basic stats row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Age</Label>
                <Input
                  type="number"
                  value={form.age}
                  onChange={(e) => updateField('age', e.target.value)}
                  className={inputClass}
                  placeholder="25"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Gender</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => v && updateField('gender', v)}
                >
                  <SelectTrigger className={selectTriggerClass}>
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

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Height (cm)</Label>
                <Input
                  type="number"
                  value={form.height_cm}
                  onChange={(e) => updateField('height_cm', e.target.value)}
                  className={inputClass}
                  placeholder="175"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Weight (kg)</Label>
                <Input
                  type="number"
                  value={form.weight_kg}
                  onChange={(e) => updateField('weight_kg', e.target.value)}
                  className={inputClass}
                  placeholder="80"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">
                  Body Fat %{' '}
                  <span className="text-muted-foreground text-xs">(opt)</span>
                </Label>
                <Input
                  type="number"
                  value={form.body_fat_percent}
                  onChange={(e) =>
                    updateField('body_fat_percent', e.target.value)
                  }
                  className={inputClass}
                  placeholder="20"
                />
              </div>
            </div>

            {/* Activity & training */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Activity Level</Label>
                <Select
                  value={form.activity_level}
                  onValueChange={(v) => v && updateField('activity_level', v)}
                >
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border">
                    {ACTIVITY_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-gray-200"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Training Days / Week</Label>
                <Input
                  type="number"
                  min={0}
                  max={7}
                  value={String(form.training_days_per_week)}
                  onChange={(e) =>
                    updateField(
                      'training_days_per_week',
                      Math.min(7, Math.max(0, parseInt(e.target.value) || 0))
                    )
                  }
                  className={inputClass}
                />
              </div>
            </div>

            {/* Office job toggle */}
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
                aria-checked={form.office_job}
                onClick={() => updateField('office_job', !form.office_job)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  form.office_job ? 'bg-primary' : 'bg-border'
                }`}
              >
                <span
                  className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${
                    form.office_job ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Goals */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Goal Weight (kg)</Label>
                <Input
                  type="number"
                  value={form.goal_weight_kg}
                  onChange={(e) =>
                    updateField('goal_weight_kg', e.target.value)
                  }
                  className={inputClass}
                  placeholder="70"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">
                  Weekly Budget ($){' '}
                  <span className="text-muted-foreground text-xs">(opt)</span>
                </Label>
                <Input
                  type="number"
                  value={form.weekly_budget}
                  onChange={(e) => updateField('weekly_budget', e.target.value)}
                  className={inputClass}
                  placeholder="75"
                />
              </div>
            </div>

            {/* Text areas */}
            <div className="space-y-2">
              <Label className="text-foreground">Food Preferences</Label>
              <Textarea
                value={form.food_preferences}
                onChange={(e) =>
                  updateField('food_preferences', e.target.value)
                }
                className={`${inputClass} min-h-[70px]`}
                placeholder="e.g. vegetarian, gluten-free..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Medical Limitations</Label>
              <Textarea
                value={form.medical_limitations}
                onChange={(e) =>
                  updateField('medical_limitations', e.target.value)
                }
                className={`${inputClass} min-h-[70px]`}
                placeholder="e.g. diabetes, IBS..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Joint Pain Areas</Label>
              <Textarea
                value={form.joint_pain_areas}
                onChange={(e) =>
                  updateField('joint_pain_areas', e.target.value)
                }
                className={`${inputClass} min-h-[60px]`}
                placeholder="e.g. knees, lower back..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Sleep Quality</Label>
              <Select
                value={form.sleep_quality}
                onValueChange={(v) => v && updateField('sleep_quality', v)}
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-card border">
                  {SLEEP_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-gray-200"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={profileSaving}
              className="w-full bg-primary text-primary-foreground"
            >
              {profileSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ===== Personalization Section ===== */}
        <Card className="bg-card border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              <CardTitle className="text-lg text-foreground">Make it yours</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">
              Pick your vibe — theme, coach personality, and avatar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Theme picker */}
            <div className="space-y-2">
              <Label className="text-foreground">Theme</Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {THEMES.map((t) => {
                  const active = theme === t.key
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => onTheme(t.key)}
                      className={`press relative overflow-hidden rounded-2xl border-2 p-3 text-left transition-all ${
                        active ? 'border-primary brand-glow' : 'border-border hover:border-primary/40'
                      }`}
                      aria-pressed={active}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex">
                          <span
                            className="h-6 w-6 rounded-full border-2 border-white"
                            style={{ background: t.swatch.primary }}
                          />
                          <span
                            className="-ml-2 h-6 w-6 rounded-full border-2 border-white"
                            style={{ background: t.swatch.accent }}
                          />
                        </span>
                        <span className="text-sm">{t.emoji}</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{t.name}</p>
                      <p className="text-[11px] leading-tight text-muted-foreground">{t.blurb}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Persona picker */}
            <div className="space-y-2">
              <Label className="text-foreground">Coach personality</Label>
              <div className="grid grid-cols-2 gap-3">
                {COACH_PERSONAS.map((p) => {
                  const active = persona === p.key
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => onPersona(p.key)}
                      className={`press rounded-2xl border-2 p-3 text-left transition-all ${
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

            {/* Avatar picker */}
            <div className="space-y-2">
              <Label className="text-foreground">
                Avatar <span className="text-xs text-muted-foreground">(shown on your dashboard & sidebar)</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_OPTIONS.map((e) => {
                  const active = avatar === e
                  return (
                    <button
                      key={e}
                      type="button"
                      onClick={() => onAvatar(e)}
                      className={`press flex h-11 w-11 items-center justify-center rounded-xl text-xl transition-all ${
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

            <div className="flex items-center gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              Changes save instantly. Theme applies across the whole app.
            </div>
          </CardContent>
        </Card>

        {/* ===== Change Password Section ===== */}
        <Card className="bg-card border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              <CardTitle className="text-lg text-foreground">
                Change Password
              </CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">
              Update your account password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {passwordMsg && (
              <div
                className={`p-3 rounded-lg border text-sm ${
                  passwordMsg.type === 'success'
                    ? 'bg-primary/10 border-primary/20 text-primary'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}
              >
                {passwordMsg.text}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-foreground">Current Password</Label>
              <Input
                type="password"
                value={oldPassword}
                onChange={(e) => {
                  setOldPassword(e.target.value)
                  setPasswordMsg(null)
                }}
                className={inputClass}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  setPasswordMsg(null)
                }}
                className={inputClass}
                placeholder="Min. 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setPasswordMsg(null)
                }}
                className={inputClass}
                placeholder="Re-enter new password"
              />
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={passwordSaving}
              className="w-full bg-background border border text-gray-200 hover:bg-card hover:text-foreground"
              variant="outline"
            >
              {passwordSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ===== Data & Account Section ===== */}
        <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">
              Data &amp; Account
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Export your data or manage your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Export */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-background border border">
              <div>
                <p className="text-gray-200 font-medium">Export Your Data</p>
                <p className="text-xs text-muted-foreground">
                  Download all your data as a JSON file
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={exporting}
                className="bg-card border text-gray-200 hover:text-foreground"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export
              </Button>
            </div>

            {/* Delete account */}
            <Dialog>
              <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                <div>
                  <p className="text-red-400 font-medium">Delete Account</p>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete your account and all data
                  </p>
                </div>
                <DialogTrigger
                  render={
                    <Button
                      variant="outline"
                      className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                    />
                  }
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DialogTrigger>
              </div>

              <DialogContent className="bg-card border text-gray-200">
                <DialogHeader>
                  <DialogTitle className="text-foreground flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    Delete Account
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    This action is permanent and cannot be undone. All your data
                    including profile, weight logs, and habit history will be
                    permanently deleted.
                  </DialogDescription>
                </DialogHeader>

                {deleteMsg && (
                  <div
                    className={`p-3 rounded-lg border text-sm ${
                      deleteMsg.type === 'success'
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}
                  >
                    {deleteMsg.text}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-foreground">
                    Type <strong className="text-red-400">DELETE</strong> to
                    confirm
                  </Label>
                  <Input
                    value={deleteText}
                    onChange={(e) => {
                      setDeleteText(e.target.value)
                      setDeleteMsg(null)
                    }}
                    className={inputClass}
                    placeholder="DELETE"
                  />
                </div>

                <DialogFooter>
                  <DialogClose
                    render={
                      <Button
                        variant="outline"
                        className="bg-background border text-muted-foreground"
                      />
                    }
                  >
                    Cancel
                  </DialogClose>
                  <Button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="bg-red-600 hover:bg-red-700 text-foreground"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Forever
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
