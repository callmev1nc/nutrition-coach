'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Cookie, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Circle, User } from 'lucide-react'
import type { UserProfile } from '@/types'
import { safeStorage } from '@/lib/safe-storage'

const plan7 = [
  { day: 1, theme: 'Trigger Interruption', color: 'text-red-400 bg-red-500/10', actions: ['Identify your top 3 craving triggers and write them down', 'When craving hits, immediately stand up and change rooms', 'Set a phone timer for 10 minutes before giving in'], replacement: 'Dark chocolate square (20 cal) instead of candy bar', envTip: 'Remove trigger foods from your kitchen today', emergency: 'Drink 500ml ice water + 5 deep breaths' },
  { day: 2, theme: 'Replacement Strategy', color: 'text-orange-400 bg-orange-500/10', actions: ['Prepare 3 healthy alternatives for your favorite junk food', 'Practice the swap - crave chips? Eat air-popped popcorn', 'Rate craving intensity before and after swap (1-10)'], replacement: 'Greek yogurt with berries instead of ice cream', envTip: 'Keep healthy snacks at eye level in fridge', emergency: 'Chew sugar-free gum for 10 minutes' },
  { day: 3, theme: 'Environment Design', color: 'text-yellow-400 bg-yellow-500/10', actions: ['Clean your kitchen of all trigger foods', 'Set up a craving corner with tea and healthy options', 'Pre-portion all snacks into single-serving bags'], replacement: 'Apple slices with cinnamon instead of cookies', envTip: 'Use smaller plates and bowls for all meals', emergency: 'Leave the kitchen entirely for 15 minutes' },
  { day: 4, theme: 'Habit Rewiring', color: 'text-green-400 bg-green-500/10', actions: ['Map your craving habit loop (trigger, action, reward)', 'Create a new reward that does not involve food', 'Practice your new habit 3 times today'], replacement: 'Handful of nuts instead of chips', envTip: 'Put a sticky note on your fridge with your why', emergency: 'Call or text someone for support' },
  { day: 5, theme: 'Emergency Protocol', color: 'text-blue-400 bg-blue-500/10', actions: ['Write your personal craving emergency card', 'Practice HALT: Hungry, Angry, Lonely, Tired?', 'If HALT applies, address the real need, not food'], replacement: 'Protein shake instead of fast food', envTip: 'Keep emergency snack kit in your bag', emergency: 'Brush teeth + mouthwash (kills craving)' },
  { day: 6, theme: 'Mindful Practice', color: 'text-purple-400 bg-purple-500/10', actions: ['When craving hits, eat one bite mindfully', 'Notice texture, flavor, satisfaction after each bite', 'Journal: Did the food live up to expectation?'], replacement: 'Dark chocolate + almonds instead of candy bar', envTip: 'Eat all meals at a table, no screens', emergency: '10 minutes of deep breathing meditation' },
  { day: 7, theme: 'Review & Plan', color: 'text-indigo-400 bg-indigo-500/10', actions: ['Review which strategies worked best this week', 'Rate your craving control improvement (1-10)', 'Plan your strategy for next week challenges'], replacement: 'Your favorite healthy alternative from this week', envTip: 'Meal prep for the next 3 days', emergency: 'Review progress photos for motivation' },
]

export default function CravingsPage() {
  const supabase = useSupabase()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [started, setStarted] = useState(false)
  const [junkFood, setJunkFood] = useState('')
  const [openDays, setOpenDays] = useState<Set<number>>(new Set())
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set())

  useEffect(() => {
    const saved = safeStorage.getItem('cravings-completed')
    if (saved) setCompletedActions(new Set(JSON.parse(saved)))
  }, [])

  useEffect(() => {
    safeStorage.setItem('cravings-completed', JSON.stringify([...completedActions]))
  }, [completedActions])

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) setProfile(data)
  }, [supabase])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const toggleDay = (day: number) => {
    setOpenDays(prev => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  const expandAll = () => setOpenDays(new Set(plan7.map(d => d.day)))
  const collapseAll = () => setOpenDays(new Set())

  const toggleAction = (key: string) => {
    setCompletedActions(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const totalActions = plan7.reduce((s, d) => s + d.actions.length, 0)
  const doneCount = completedActions.size
  const progressPct = totalActions > 0 ? Math.round((doneCount / totalActions) * 100) : 0

  const getPersonalizedEmergency = () => {
    const prefs = profile?.food_preferences
    const medical = profile?.medical_limitations
    if (prefs?.toLowerCase().includes('vegetarian') || prefs?.toLowerCase().includes('vegan')) {
      return 'Try roasted chickpeas or edamame instead of meat-based snacks'
    }
    if (medical?.toLowerCase().includes('diabetes')) {
      return 'Choose low-GI options like berries or nuts to stabilize blood sugar'
    }
    if (medical?.toLowerCase().includes('ibd') || medical?.toLowerCase().includes('digest')) {
      return 'Stick to low-fiber options like applesauce or white rice cakes'
    }
    return 'Drink 500ml ice water + take 10 deep breaths before deciding'
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent flex items-center gap-3">
        <Cookie className="w-7 h-7 text-orange-400" />Cravings Management
      </h1>

      {/* Emergency Quick-Action Button */}
      {started && (
        <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-300">Emergency Craving Protocol</p>
              <p className="text-xs text-gray-400">{getPersonalizedEmergency()}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!started ? (
        <Card className="bg-[#1a1d27] border-[#2a2d37]">
          <CardHeader><CardTitle className="text-white">7-Day Tactical Craving Control</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Profile-based personalization */}
            {profile && (
              <div className="p-3 rounded-lg bg-[#0c0e14] border border-[#2a2d37]">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-orange-400" />
                  <span className="text-xs text-gray-400">Your Profile</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.food_preferences && (
                    <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/20">{profile.food_preferences}</Badge>
                  )}
                  {profile.medical_limitations && (
                    <Badge className="bg-red-500/15 text-red-400 border-red-500/20">{profile.medical_limitations}</Badge>
                  )}
                </div>
              </div>
            )}
            <div>
              <Label className="text-gray-300">Favorite Junk Food</Label>
              <Input value={junkFood} onChange={e => setJunkFood(e.target.value)} className="bg-[#0c0e14] border-[#2a2d37] text-white" placeholder="e.g. chocolate, chips, ice cream" />
            </div>
            <Button onClick={() => setStarted(true)} className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white">
              Start 7-Day Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Progress Bar */}
          <Card className="bg-[#1a1d27] border-[#2a2d37]">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Progress</span>
                <span className="text-sm text-gray-400">{doneCount}/{totalActions} actions</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Expand/Collapse Controls */}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll} className="text-gray-500 hover:text-orange-400 text-xs h-7 px-2">
              Expand All
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll} className="text-gray-500 hover:text-orange-400 text-xs h-7 px-2">
              Collapse All
            </Button>
          </div>

          {plan7.map(d => {
            const isOpen = openDays.has(d.day)
            const allActionsDone = d.actions.every((_, i) => completedActions.has(`${d.day}-${i}`))
            return (
              <Card key={d.day} className={`bg-[#1a1d27] border-[#2a2d37] overflow-hidden transition-colors hover:border-orange-500/20 ${allActionsDone ? 'ring-1 ring-green-500/30' : ''}`}>
                <button
                  type="button"
                  onClick={() => toggleDay(d.day)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-white font-semibold text-sm shrink-0">Day {d.day}</span>
                    <Badge className={d.color}>{d.theme}</Badge>
                    {allActionsDone && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  </div>
                  <div className="shrink-0 text-gray-500">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isOpen && (
                  <CardContent className="px-6 pb-5 pt-0 space-y-3">
                    {/* Action Items with Checkboxes */}
                    <div className="space-y-1">
                      {d.actions.map((a, i) => {
                        const key = `${d.day}-${i}`
                        const done = completedActions.has(key)
                        return (
                          <div
                            key={i}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                              done ? 'bg-green-500/5 line-through opacity-60' : 'hover:bg-[#0c0e14]'
                            }`}
                            onClick={() => toggleAction(key)}
                          >
                            {done ? (
                              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-600 shrink-0" />
                            )}
                            <span className={`text-sm ${done ? 'text-gray-500' : 'text-gray-300'}'}`}>{a}</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Strategy Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="p-3 bg-[#0c0e14] rounded text-xs">
                        <span className="text-green-400 font-medium">Replace: </span>
                        <span className="text-gray-300">{d.replacement}</span>
                      </div>
                      <div className="p-3 bg-[#0c0e14] rounded text-xs">
                        <span className="text-blue-400 font-medium">Environment: </span>
                        <span className="text-gray-300">{d.envTip}</span>
                      </div>
                      <div className="p-3 bg-[#0c0e14] rounded text-xs">
                        <span className="text-red-400 font-medium">Emergency: </span>
                        <span className="text-gray-300">{d.emergency}</span>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
