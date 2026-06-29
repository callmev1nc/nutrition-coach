'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Confetti } from '@/components/motion/confetti'
import { Droplets, Plus } from 'lucide-react'
import { awardXp } from '@/lib/client-gamification'

interface WaterTrackerCardProps {
  currentMl: number
  onUpdate?: (ml: number) => void
}

const TARGET_ML = 2000

export function WaterTrackerCard({ currentMl, onUpdate }: WaterTrackerCardProps) {
  const supabase = useSupabase()
  const [customOpen, setCustomOpen] = useState(false)
  const [customMl, setCustomMl] = useState('')
  const [confetti, setConfetti] = useState(0)

  const pct = Math.min(100, Math.round((currentMl / TARGET_ML) * 100))

  const addWater = async (ml: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date().toISOString().split('T')[0]
    const newTotal = currentMl + ml

    await supabase.from('habit_logs').upsert({
      user_id: user.id,
      date: today,
      water_ml: newTotal,
    }, { onConflict: 'user_id,date' })

    if (newTotal >= 2000 && currentMl < 2000) {
      setConfetti((c) => c + 1)
      await awardXp(supabase, 'log_water')
    }

    onUpdate?.(newTotal)
  }

  return (
    <>
      <Confetti fire={confetti} />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Droplets className="h-4 w-4 text-[var(--hydration)]" />
            Water
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold tabular-nums">{currentMl}</span>
            <span className="text-xs text-muted-foreground">/ {TARGET_ML} ml</span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: 'var(--hydration)' }}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => addWater(250)}
            >
              <Plus className="mr-1 h-3 w-3" />250ml
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => addWater(500)}
            >
              <Plus className="mr-1 h-3 w-3" />500ml
            </Button>
            <Dialog open={customOpen} onOpenChange={setCustomOpen}>
              <DialogTrigger render={<Button variant="outline" size="sm" className="text-xs" />}>
                Custom
              </DialogTrigger>
              <DialogContent className="w-72">
                <DialogHeader>
                  <DialogTitle className="text-sm">Add water</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Amount (ml)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 300"
                      value={customMl}
                      onChange={(e) => setCustomMl(e.target.value)}
                    />
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const ml = parseInt(customMl)
                      if (ml > 0) {
                        addWater(ml)
                        setCustomMl('')
                        setCustomOpen(false)
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
