'use client'
import { useState, useEffect, useRef } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Loader2, Sparkles } from 'lucide-react'
import { awardXp } from '@/lib/client-gamification'
import { COACH_PERSONAS } from '@/lib/themes'

interface Msg { role: string; content: string }
const quickActions = ['Daily check-in 🔍', 'Hype me up 🔥', 'Meal ideas 🍱', 'I craved junk 🍕']

export default function CoachPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [coachAvatar, setCoachAvatar] = useState('🔥')
  const [coachPersona, setCoachPersona] = useState('hype')
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = useSupabase()

  const loadHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [hist, prof] = await Promise.all([
      supabase.from('coach_messages').select('role, content').eq('user_id', user.id).order('created_at', { ascending: true }).limit(20),
      supabase.from('profiles').select('avatar_emoji, coach_persona, mood_today, energy_today').eq('id', user.id).single(),
    ])
    if (hist.data) setMessages(hist.data)
    if (prof.data) {
      setCoachAvatar(prof.data.avatar_emoji ?? '🔥')
      setCoachPersona(prof.data.coach_persona ?? 'hype')
    }
  }

  useEffect(() => { loadHistory() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const personaMeta = COACH_PERSONAS.find((p) => p.key === coachPersona)

  const sendMessage = async (text?: string) => {
    const msg = text || input
    if (!msg.trim()) return
    setInput('')
    setLoading(true)

    const userMsg: Msg = { role: 'user', content: msg.trim() }
    setMessages(prev => [...prev, userMsg])

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg.trim(), stream: true }),
      })

      if (!res.ok || !res.body) {
        const json = await res.json()
        if (json.response) {
          setMessages(prev => [...prev, { role: 'assistant', content: json.response }])
        }
        return
      }

      // Add empty AI message and stream into it
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let received = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                received = true
                setMessages(prev => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last && last.role === 'assistant') {
                    updated[updated.length - 1] = { ...last, content: last.content + parsed.text }
                  }
                  return updated
                })
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }

      // Reward a chat once per day (server dedups).
      if (received) {
        await awardXp(supabase, 'chat_coach')
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 safari-safe-height flex flex-col">
      {/* Coach header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[var(--brand)] text-2xl brand-glow">
          {coachAvatar}
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            {personaMeta?.name ?? 'AI Coach'}
          </h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" />
            {personaMeta?.blurb ?? 'Your personal nutrition & fitness coach'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2" aria-live="polite" aria-atomic="false">
        {messages.length === 0 && (
          <Card className="bg-card border">
            <CardContent className="pt-6 text-center">
              <p className="text-4xl mb-2">{coachAvatar}</p>
              <p className="text-muted-foreground">
                Hey! Ask me about food, workouts, motivation — anything. I&apos;ve got you.
              </p>
            </CardContent>
          </Card>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm">
                {coachAvatar}
              </div>
            )}
            <div
              className={`max-w-[80%] p-3 text-sm whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm'
                  : 'bg-muted text-foreground rounded-2xl rounded-bl-sm'
              }`}
            >
              {m.content || (loading && i === messages.length - 1 ? '…' : m.content)}
            </div>
          </div>
        ))}
        {loading && (messages.length === 0 || messages[messages.length - 1].role !== 'assistant') && (
          <div className="flex justify-start items-end gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm">{coachAvatar}</div>
            <div className="bg-card border flex items-center gap-2 p-3 rounded-2xl rounded-bl-sm">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-muted-foreground text-sm">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {quickActions.map(a => (
            <Button
              key={a}
              variant="outline"
              size="sm"
              onClick={() => sendMessage(a)}
              className="press border text-muted-foreground hover:text-foreground hover:bg-card whitespace-nowrap text-xs"
            >
              {a}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()}
            placeholder="Ask your coach anything..."
            className="bg-card border text-foreground"
            disabled={loading}
            aria-label="Message your coach"
          />
          <Button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="press bg-primary hover:bg-primary/90 text-primary-foreground" aria-label="Send message">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
