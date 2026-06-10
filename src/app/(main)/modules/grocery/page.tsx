'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Loader2, Sparkles, CheckCircle2, Circle, DollarSign } from 'lucide-react'
import type { UserProfile } from '@/types'
import { safeStorage } from '@/lib/safe-storage'

const staticCategories = [
  { name: 'Produce', items: [
    { item: 'Spinach (fresh)', qty: '1 bag (200g)', cost: 2.50, usage: 'Salads, smoothies' },
    { item: 'Bananas', qty: '1 bunch (6)', cost: 2.00, usage: 'Breakfast, snacks' },
    { item: 'Broccoli', qty: '2 heads', cost: 3.00, usage: 'Lunch, dinner' },
    { item: 'Sweet Potatoes', qty: '4 medium', cost: 3.00, usage: 'Lunch, dinner' },
    { item: 'Bell Peppers', qty: '3 pack', cost: 3.50, usage: 'Stir-fry, salads' },
  ]},
  { name: 'Protein', items: [
    { item: 'Chicken Breast', qty: '1kg', cost: 8.00, usage: 'Lunch, dinner (4 meals)' },
    { item: 'Eggs', qty: '1 dozen', cost: 4.00, usage: 'Breakfast, snacks' },
    { item: 'Canned Tuna', qty: '3 cans', cost: 4.50, usage: 'Lunch, quick meals' },
    { item: 'Greek Yogurt', qty: '500g tub', cost: 4.00, usage: 'Breakfast, snacks' },
  ]},
  { name: 'Dairy', items: [
    { item: 'Cottage Cheese', qty: '1 tub (340g)', cost: 3.50, usage: 'Snacks, breakfast' },
    { item: 'Milk (skim)', qty: '2L', cost: 3.00, usage: 'Smoothies, oats' },
  ]},
  { name: 'Pantry', items: [
    { item: 'Rolled Oats', qty: '1kg bag', cost: 3.00, usage: 'Breakfast (7 days)' },
    { item: 'Brown Rice', qty: '1kg bag', cost: 2.50, usage: 'Lunch, dinner' },
    { item: 'Canned Black Beans', qty: '3 cans', cost: 3.00, usage: 'Lunch, dinner' },
    { item: 'Almonds', qty: '200g bag', cost: 4.00, usage: 'Snacks' },
  ]},
  { name: 'Frozen', items: [
    { item: 'Mixed Vegetables', qty: '1 bag (1kg)', cost: 2.50, usage: 'Stir-fry, sides' },
    { item: 'Frozen Berries', qty: '1 bag (500g)', cost: 4.00, usage: 'Smoothies, oats' },
  ]},
]

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className ?? ''}`} />
}

function CategorySkeleton() {
  return (
    <Card className="bg-[#1a1d27] border-[#2a2d37]">
      <CardHeader className="py-3">
        <Skeleton className="h-4 w-28" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-full mb-2" />
        <Skeleton className="h-3 w-3/4 mb-2" />
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
    </Card>
  )
}

export default function GroceryPage() {
  const supabase = useSupabase()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [budget, setBudget] = useState('100')
  const [people, setPeople] = useState('1')
  const [started, setStarted] = useState(false)
  const [aiList, setAiList] = useState<{
    categories: { name: string; items: { name: string; quantity: string; estimatedCost: number; unit: string }[]; totalEstimatedCost: number }[]
    totalEstimatedCost: number
    withinBudget: boolean
  } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [checklist, setChecklist] = useState<Set<string>>(new Set())
  const [useAi, setUseAi] = useState(false)

  const totalCost = staticCategories.reduce((sum, cat) => sum + cat.items.reduce((s, item) => s + item.cost, 0), 0)
  const budgetNum = parseFloat(budget) || 100

  const aiTotalCost = aiList?.totalEstimatedCost ?? 0
  const currentTotal = useAi && aiList ? aiTotalCost : totalCost

  useEffect(() => {
    const saved = safeStorage.getItem('grocery-checklist')
    if (saved) setChecklist(new Set(JSON.parse(saved)))
  }, [])

  useEffect(() => {
    safeStorage.setItem('grocery-checklist', JSON.stringify([...checklist]))
  }, [checklist])

  const toggleCheck = (key: string) => {
    setChecklist(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfile(data)
      if (data.weekly_budget) setBudget(String(data.weekly_budget))
    }
  }, [supabase])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const generateAiList = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget: budgetNum }),
      })
      const json = await res.json()
      if (json.groceryList) {
        setAiList(json.groceryList)
        setUseAi(true)
      }
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent flex items-center gap-3">
        <ShoppingCart className="w-7 h-7 text-emerald-400" />Grocery Budget Planner
      </h1>

      {!started ? (
        <Card className="bg-[#1a1d27] border-[#2a2d37]">
          <CardHeader><CardTitle className="text-white">7-Day High-Protein Shopping Plan</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Weekly Budget ($)</Label>
                <Input type="number" value={budget} onChange={e => setBudget(e.target.value)} className="bg-[#0c0e14] border-[#2a2d37] text-white" />
              </div>
              <div>
                <Label className="text-gray-300">People</Label>
                <Select value={people} onValueChange={(v) => v && setPeople(v)}>
                  <SelectTrigger className="bg-[#0c0e14] border-[#2a2d37] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1a1d27] border-[#2a2d37]">
                    {[1, 2, 3, 4, 5, 6].map(n => <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'person' : 'people'}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => { setStarted(true); setUseAi(false) }} className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white">
              Show Shopping List
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cost Summary */}
          <Card className="bg-[#1a1d27] border-[#2a2d37]">
            <CardContent className="pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Estimated Cost</span>
                <span className={`text-xl font-bold ${currentTotal <= budgetNum ? 'text-green-400' : 'text-red-400'}`}>
                  ${currentTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Budget</span>
                <span className="text-gray-300">${budgetNum.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Remaining</span>
                <span className={budgetNum - currentTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  ${(budgetNum - currentTotal).toFixed(2)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, (currentTotal / budgetNum) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* AI Generate Button */}
          {!useAi && !aiList && (
            <Card className="bg-gradient-to-br from-emerald-950/30 to-[#1a1d27] border-emerald-500/20">
              <CardContent className="pt-4 text-center space-y-3">
                <p className="text-sm text-gray-400">
                  Want a personalized list based on your meal plan?
                </p>
                <Button
                  onClick={generateAiList}
                  disabled={generating}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                >
                  {generating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating AI List...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Generate AI Grocery List</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* AI Generated List */}
          {generating && (
            <div className="space-y-4">
              <CategorySkeleton />
              <CategorySkeleton />
              <CategorySkeleton />
            </div>
          )}

          {aiList && useAi && (
            <>
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/20">
                  {aiList.withinBudget ? 'Within Budget' : 'Over Budget'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUseAi(false)}
                  className="border-[#2a2d37] text-gray-400 hover:text-white text-xs"
                >
                  Show Static List
                </Button>
              </div>
              {aiList.categories.map((cat, ci) => {
                const checked = cat.items.every((_, ii) => checklist.has(`ai-${ci}-${ii}`))
                return (
                  <Card key={ci} className={`bg-[#1a1d27] border-[#2a2d37] ${checked ? 'ring-1 ring-green-500/30' : ''}`}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm text-emerald-400 flex items-center gap-2 capitalize">
                        {cat.name}
                        <Badge className="bg-emerald-500/20 text-emerald-400">${cat.totalEstimatedCost.toFixed(2)}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {cat.items.map((item, ii) => {
                        const key = `ai-${ci}-${ii}`
                        const isChecked = checklist.has(key)
                        return (
                          <div
                            key={ii}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                              isChecked ? 'bg-green-500/5 line-through opacity-60' : 'hover:bg-[#0c0e14]'
                            }`}
                            onClick={() => toggleCheck(key)}
                          >
                            {isChecked ? (
                              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-600 shrink-0" />
                            )}
                            <span className={`flex-1 text-sm ${isChecked ? 'text-gray-500' : 'text-gray-300'}`}>{item.name}</span>
                            <span className="text-xs text-gray-500">{item.quantity}</span>
                            <span className="text-xs text-emerald-400">${item.estimatedCost.toFixed(2)}</span>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                )
              })}
            </>
          )}

          {/* Static Fallback List */}
          {!useAi && !generating && (
            <>
              {staticCategories.map(cat => {
                const checked = cat.items.every((_, ii) => checklist.has(`static-${cat.name}-${ii}`))
                return (
                  <Card key={cat.name} className={`bg-[#1a1d27] border-[#2a2d37] ${checked ? 'ring-1 ring-green-500/30' : ''}`}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm text-emerald-400 flex items-center gap-2">
                        {cat.name}
                        <Badge className="bg-emerald-500/20 text-emerald-400">
                          ${cat.items.reduce((s, i) => s + i.cost, 0).toFixed(2)}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {cat.items.map((item, i) => {
                        const key = `static-${cat.name}-${i}`
                        const isChecked = checklist.has(key)
                        return (
                          <div
                            key={i}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                              isChecked ? 'bg-green-500/5 line-through opacity-60' : 'hover:bg-[#0c0e14]'
                            }`}
                            onClick={() => toggleCheck(key)}
                          >
                            {isChecked ? (
                              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-600 shrink-0" />
                            )}
                            <span className={`flex-1 text-sm ${isChecked ? 'text-gray-500' : 'text-gray-300'}`}>{item.item}</span>
                            <span className="text-xs text-gray-500">{item.qty}</span>
                            <span className="text-xs text-emerald-400">${item.cost.toFixed(2)}</span>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                )
              })}

              <div className="flex items-center justify-center gap-2 p-3 bg-[#0c0e14] rounded-lg">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-gray-400">Cost per Meal: <span className="text-white font-medium">${(totalCost / 21).toFixed(2)}</span></span>
              </div>

              {/* Switch to AI */}
              {aiList && (
                <Button
                  onClick={() => setUseAi(true)}
                  variant="outline"
                  className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Switch to AI-Generated List
                </Button>
              )}
            </>
          )}

          {/* Checklist progress */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <span>{checklist.size} items checked off</span>
            {checklist.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setChecklist(new Set())}
                className="text-gray-500 hover:text-white text-xs h-6 px-2"
              >
                Reset
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
