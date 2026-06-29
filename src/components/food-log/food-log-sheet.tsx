'use client'

import { useState, useCallback } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Plus, Search, Camera, Loader2 } from 'lucide-react'
import { CookingDetailsPicker, useCookingDetails } from './cooking-details-picker'
import { ParseSkeleton } from './parse-skeleton'
import { FoodItemCard } from './food-item-card'
import { RunningTotal } from './running-total'
import type { CookingMethod, DiaryItem } from '@/types'

interface FoodLogSheetProps {
  date: string
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  onSaved?: () => void
  trigger?: React.ReactElement
}

function scaled(value: number | undefined, qty: number | undefined, unit: string | undefined): number {
  // Scale a per-100g value to the entered portion for the preview. The server
  // does the authoritative resolution+cooking-yield math on save; this just
  // keeps the confirm-step numbers honest instead of showing raw per-100g.
  const factor = unit === 'g' || unit === 'ml' ? (qty ?? 100) / 100 : 1
  return Math.round((value ?? 0) * factor)
}

export function FoodLogSheet({ date, mealType: initialMealType, onSaved, trigger }: FoodLogSheetProps) {
  const supabase = useSupabase()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('ai')
  const [mealType, setMealType] = useState(initialMealType ?? 'breakfast')
  const [aiText, setAiText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parsedItems, setParsedItems] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleParse = useCallback(async () => {
    if (!aiText.trim()) return
    setParsing(true)
    setError(null)
    try {
      const res = await fetch('/api/foods/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Parse failed')
      }
      const data = await res.json()
      setParsedItems(data.items || [])
      setTab('confirm')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parse failed')
    } finally {
      setParsing(false)
    }
  }, [aiText])

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    setError(null)
    try {
      const res = await fetch(`/api/foods/search?q=${encodeURIComponent(searchQuery)}`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setSearchResults(data.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }, [searchQuery])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)

    const itemsForSave = parsedItems
      .filter((i) => i.resolved)
      .map((i) => ({
        name: i.parsed.name,
        quantity: i.parsed.quantity,
        unit: i.parsed.unit || 'g',
        cooking_method: i.parsed.cooking_method,
        fat_trimmed: i.parsed.fat_trimmed,
        oil: i.parsed.oil,
        is_meat: i.parsed.is_meat,
        description: i.parsed.description,
      }))

    try {
      const res = await fetch('/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          meal_type: mealType,
          items: itemsForSave,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Save failed')
      }

      setParsedItems([])
      setAiText('')
      setOpen(false)
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [date, mealType, parsedItems, onSaved])

  const Content = (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">{error}</div>
      )}

      <div>
        <Label className="text-xs text-muted-foreground">Meal</Label>
        <Select value={mealType} onValueChange={(v: any) => setMealType(v)}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="breakfast">Breakfast</SelectItem>
            <SelectItem value="lunch">Lunch</SelectItem>
            <SelectItem value="dinner">Dinner</SelectItem>
            <SelectItem value="snack">Snack</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="ai" className="flex-1 text-xs">
            AI Quick Add
          </TabsTrigger>
          <TabsTrigger value="search" className="flex-1 text-xs">
            Search
          </TabsTrigger>
          <TabsTrigger value="barcode" className="flex-1 text-xs">
            Barcode
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-3 pt-3">
          <Textarea
            placeholder='Describe what you ate… e.g. "200g grilled chicken + 1 tsp olive oil + 150g rice"'
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />
          <Button
            onClick={handleParse}
            disabled={!aiText.trim() || parsing}
            className="w-full"
            size="sm"
          >
            {parsing ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Parsing…
              </>
            ) : (
              'Parse & Resolve'
            )}
          </Button>
        </TabsContent>

        <TabsContent value="search" className="space-y-3 pt-3">
          <div className="flex gap-2">
            <Input
              placeholder="Search foods…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="text-sm"
            />
            <Button size="icon" onClick={handleSearch} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((item, i) => (
                <div
                  key={i}
                  className="cursor-pointer rounded-lg border p-3 text-sm transition-colors hover:bg-accent"
                  onClick={() => {
                    setParsedItems([
                      {
                        parsed: {
                          name: item.food_name,
                          quantity: 100,
                          unit: 'g',
                          cooking_method: null,
                        },
                        resolved: item,
                      },
                    ])
                    setTab('confirm')
                  }}
                >
                  <div className="font-medium">{item.food_name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {Math.round(item.per100g?.kcal ?? 0)} kcal / 100g
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="barcode" className="space-y-3 pt-3">
          <p className="text-xs text-muted-foreground">
            Enter a barcode number to look up product information.
          </p>
          <Input
            placeholder="e.g. 8901234567890"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm"
          />
          <Button
            onClick={async () => {
              if (!searchQuery.trim()) return
              setSearching(true)
              setError(null)
              try {
                const res = await fetch(`/api/foods/barcode?code=${encodeURIComponent(searchQuery)}`)
                if (!res.ok) {
                  const err = await res.json()
                  throw new Error(err.error || 'Lookup failed')
                }
                const data = await res.json()
                if (data.item) {
                  setParsedItems([
                    {
                      parsed: {
                        name: data.item.food_name,
                        quantity: 100,
                        unit: 'g',
                      },
                      resolved: data.item,
                    },
                  ])
                  setTab('confirm')
                }
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Lookup failed')
              } finally {
                setSearching(false)
              }
            }}
            disabled={searching}
            className="w-full"
            size="sm"
          >
            {searching ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Looking up…
              </>
            ) : (
              'Look up'
            )}
          </Button>
        </TabsContent>
      </Tabs>

      {tab === 'confirm' && parsedItems.length > 0 && (
        <div className="space-y-3 rounded-lg border p-3">
          <h4 className="text-xs font-medium text-muted-foreground">Confirm items</h4>
          {parsedItems.map((item, i) => (
            <FoodItemCard
              key={i}
              item={{
                date,
                meal_type: mealType,
                food_name: item.resolved?.food_name ?? item.parsed?.name ?? 'Unknown',
                portion_amount: item.parsed?.quantity ?? 100,
                portion_unit: item.parsed?.unit ?? 'g',
                calories: scaled(item.resolved?.per100g?.kcal, item.parsed?.quantity, item.parsed?.unit),
                protein_g: scaled(item.resolved?.per100g?.protein_g, item.parsed?.quantity, item.parsed?.unit),
                carbs_g: scaled(item.resolved?.per100g?.carbs_g, item.parsed?.quantity, item.parsed?.unit),
                fat_g: scaled(item.resolved?.per100g?.fat_g, item.parsed?.quantity, item.parsed?.unit),
                fiber_g: item.resolved?.per100g?.fiber_g,
                confidence: item.resolved?.confidence,
                cooking_method: item.parsed?.cooking_method,
                fat_trimmed: item.parsed?.fat_trimmed,
                source: 'usda',
              }}
            />
          ))}
          <Button onClick={handleSave} disabled={saving} className="w-full" size="sm">
            {saving ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Saving…
              </>
            ) : (
              `Save to ${mealType}`
            )}
          </Button>
        </div>
      )}

      {parsing && <ParseSkeleton />}
    </div>
  )

  if (trigger) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={trigger} />
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle className="text-left text-base">Log food</SheetTitle>
          </SheetHeader>
          <div className="mt-4 overflow-y-auto">{Content}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Plus className="mr-1 h-4 w-4" />
        Log food
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Log food</DialogTitle>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  )
}
