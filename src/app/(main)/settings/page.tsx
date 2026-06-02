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
  Save,
  Settings,
  Trash2,
  User,
} from 'lucide-react'

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

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

      if (error) {
        setProfileMsg({ type: 'error', text: error.message })
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

      // Delete profile row
      await supabase.from('profiles').delete().eq('id', user.id)

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

  // ---------- Loading state ----------
  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c0e14]">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    )
  }

  const inputClass =
    'bg-[#0c0e14] border-[#2a2d37] text-white placeholder:text-gray-500'
  const selectTriggerClass = 'w-full bg-[#0c0e14] border-[#2a2d37] text-white'

  return (
    <div className="min-h-screen bg-[#0c0e14] py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-sm text-gray-400">
              Manage your profile and account
            </p>
          </div>
        </div>

        {/* ===== Profile Section ===== */}
        <Card className="bg-[#1a1d27] border-[#2a2d37]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              <CardTitle className="text-lg text-white">Profile</CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              Update your personal information and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {profileMsg && (
              <div
                className={`p-3 rounded-lg border text-sm ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}
              >
                {profileMsg.text}
              </div>
            )}

            {/* Basic stats row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Age</Label>
                <Input
                  type="number"
                  value={form.age}
                  onChange={(e) => updateField('age', e.target.value)}
                  className={inputClass}
                  placeholder="25"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Gender</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => v && updateField('gender', v)}
                >
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d27] border-[#2a2d37]">
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
                <Label className="text-gray-300">Height (cm)</Label>
                <Input
                  type="number"
                  value={form.height_cm}
                  onChange={(e) => updateField('height_cm', e.target.value)}
                  className={inputClass}
                  placeholder="175"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Weight (kg)</Label>
                <Input
                  type="number"
                  value={form.weight_kg}
                  onChange={(e) => updateField('weight_kg', e.target.value)}
                  className={inputClass}
                  placeholder="80"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">
                  Body Fat %{' '}
                  <span className="text-gray-500 text-xs">(opt)</span>
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
                <Label className="text-gray-300">Activity Level</Label>
                <Select
                  value={form.activity_level}
                  onValueChange={(v) => v && updateField('activity_level', v)}
                >
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d27] border-[#2a2d37]">
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
                <Label className="text-gray-300">Training Days / Week</Label>
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
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#0c0e14] border border-[#2a2d37]">
              <div>
                <Label className="text-gray-300">Office Job</Label>
                <p className="text-xs text-gray-500">
                  Do you mostly sit during work?
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.office_job}
                onClick={() => updateField('office_job', !form.office_job)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  form.office_job ? 'bg-indigo-500' : 'bg-[#2a2d37]'
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
                <Label className="text-gray-300">Goal Weight (kg)</Label>
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
                <Label className="text-gray-300">
                  Weekly Budget ($){' '}
                  <span className="text-gray-500 text-xs">(opt)</span>
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
              <Label className="text-gray-300">Food Preferences</Label>
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
              <Label className="text-gray-300">Medical Limitations</Label>
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
              <Label className="text-gray-300">Joint Pain Areas</Label>
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
              <Label className="text-gray-300">Sleep Quality</Label>
              <Select
                value={form.sleep_quality}
                onValueChange={(v) => v && updateField('sleep_quality', v)}
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d27] border-[#2a2d37]">
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
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
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

        {/* ===== Change Password Section ===== */}
        <Card className="bg-[#1a1d27] border-[#2a2d37]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-400" />
              <CardTitle className="text-lg text-white">
                Change Password
              </CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              Update your account password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {passwordMsg && (
              <div
                className={`p-3 rounded-lg border text-sm ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}
              >
                {passwordMsg.text}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-gray-300">Current Password</Label>
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
              <Label className="text-gray-300">New Password</Label>
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
              <Label className="text-gray-300">Confirm New Password</Label>
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
              className="w-full bg-[#0c0e14] border border-[#2a2d37] text-gray-200 hover:bg-[#1a1d27] hover:text-white"
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
        <Card className="bg-[#1a1d27] border-[#2a2d37]">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Data &amp; Account
            </CardTitle>
            <CardDescription className="text-gray-400">
              Export your data or manage your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Export */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#0c0e14] border border-[#2a2d37]">
              <div>
                <p className="text-gray-200 font-medium">Export Your Data</p>
                <p className="text-xs text-gray-500">
                  Download all your data as a JSON file
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={exporting}
                className="bg-[#1a1d27] border-[#2a2d37] text-gray-200 hover:text-white"
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
                  <p className="text-xs text-gray-500">
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

              <DialogContent className="bg-[#1a1d27] border-[#2a2d37] text-gray-200">
                <DialogHeader>
                  <DialogTitle className="text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    Delete Account
                  </DialogTitle>
                  <DialogDescription className="text-gray-400">
                    This action is permanent and cannot be undone. All your data
                    including profile, weight logs, and habit history will be
                    permanently deleted.
                  </DialogDescription>
                </DialogHeader>

                {deleteMsg && (
                  <div
                    className={`p-3 rounded-lg border text-sm ${
                      deleteMsg.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}
                  >
                    {deleteMsg.text}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-gray-300">
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
                        className="bg-[#0c0e14] border-[#2a2d37] text-gray-400"
                      />
                    }
                  >
                    Cancel
                  </DialogClose>
                  <Button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="bg-red-600 hover:bg-red-700 text-white"
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
