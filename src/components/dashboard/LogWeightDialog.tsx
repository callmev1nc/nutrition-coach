'use client'

import { useState } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'

interface LogWeightDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function LogWeightDialog({ open, onOpenChange, onSaved }: LogWeightDialogProps) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = useSupabase()

  const handleSave = async () => {
    setError(null)
    const weightVal = parseFloat(weight)
    if (!weight || isNaN(weightVal) || weightVal <= 0) {
      setError('Please enter a valid weight.')
      return
    }

    const bfVal = bodyFat ? parseFloat(bodyFat) : null
    if (bodyFat && (isNaN(bfVal!) || bfVal! <= 0 || bfVal! > 70)) {
      setError('Body fat percentage must be between 0.1 and 70.')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not authenticated.')
        setSaving(false)
        return
      }

      const { error: upsertError } = await supabase
        .from('weight_logs')
        .upsert(
          {
            user_id: user.id,
            date,
            weight_kg: weightVal,
            body_fat_percent: bfVal,
            notes: notes.trim() || null,
          },
          { onConflict: 'user_id,date' }
        )

      if (upsertError) {
        setError(upsertError.message)
        setSaving(false)
        return
      }

      // Reset form
      setWeight('')
      setBodyFat('')
      setNotes('')
      setDate(format(new Date(), 'yyyy-MM-dd'))
      onOpenChange(false)
      onSaved()
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1d27] border-[#2a2d37] text-gray-200">
        <DialogHeader>
          <DialogTitle className="text-white">Log Weight</DialogTitle>
          <DialogDescription className="text-gray-500">
            Record your weight for a specific date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-gray-300">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-[#0c0e14] border-[#2a2d37] text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-300">Weight (kg) *</Label>
            <Input
              type="number"
              step="0.1"
              min="20"
              max="300"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="bg-[#0c0e14] border-[#2a2d37] text-white"
              placeholder="85.5"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-300">Body Fat % (optional)</Label>
            <Input
              type="number"
              step="0.1"
              min="1"
              max="70"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              className="bg-[#0c0e14] border-[#2a2d37] text-white"
              placeholder="22.5"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-300">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-[#0c0e14] border-[#2a2d37] text-white min-h-[60px]"
              placeholder="Fasting day, post-workout, etc."
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#2a2d37] text-gray-400 hover:bg-[#0c0e14]"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !weight}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
