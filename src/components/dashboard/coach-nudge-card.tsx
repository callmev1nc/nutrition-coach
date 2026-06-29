'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageCircle, Zap, Heart, Shield, Coffee } from 'lucide-react'
import Link from 'next/link'

const TONE_META: Record<string, { icon: React.ElementType; color: string }> = {
  celebrate: { icon: Zap, color: 'var(--energy)' },
  nudge: { icon: Heart, color: 'var(--chart-1)' },
  redirect: { icon: Shield, color: 'var(--accent)' },
}

export function CoachNudgeCard() {
  const [nudge, setNudge] = useState<{
    headline: string
    body: string
    tone: string
    delta_calories: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const loadNudge = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/plan-vs-actual', { method: 'POST' })
      if (!res.ok) {
        setNudge(null)
        return
      }
      const data = await res.json()
      setNudge(data.nudge ?? null)
    } catch {
      setNudge(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNudge()
  }, [loadNudge])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-3 w-3/4 rounded bg-muted" />
            <div className="h-2 w-full rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!nudge) return null

  const meta = TONE_META[nudge.tone] ?? TONE_META.redirect
  const Icon = meta.icon

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4" style={{ color: meta.color }} />
          <span>{nudge.headline}</span>
        </CardTitle>
        <Link href="/coach">
          <Button variant="ghost" size="sm" className="text-xs">
            Chat <MessageCircle className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        <p>{nudge.body}</p>
        {nudge.delta_calories !== 0 && (
          <p className="mt-1">
            {nudge.delta_calories > 0 ? '+' : ''}
            {Math.round(nudge.delta_calories)} kcal vs plan
          </p>
        )}
      </CardContent>
    </Card>
  )
}
