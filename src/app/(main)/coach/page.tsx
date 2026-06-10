'use client'
import { useState, useEffect, useRef } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MessageCircle, Send, Loader2 } from 'lucide-react'

interface Msg { role: string; content: string }
const quickActions = ['Daily check-in', 'Review my progress', 'Motivation boost', 'Meal advice']

export default function CoachPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = useSupabase()

  useEffect(() => { loadHistory() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const loadHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('coach_messages').select('role, content').eq('user_id', user.id).order('created_at', { ascending: true }).limit(20)
    if (data) setMessages(data)
  }

  const sendMessage = async (text?: string) => {
    const msg = text || input
    if (!msg.trim()) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg }) })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response || data.error || 'Connection error. Check API key.' }])
    } catch { setMessages(prev => [...prev, { role: 'assistant', content: 'Unable to connect. Check API configuration.' }]) }
    setLoading(false)
  }

  return (
    <div className="space-y-4 safari-safe-height flex flex-col">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-3"><MessageCircle className="w-7 h-7 text-indigo-400" />AI Coach Chat</h1>
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {messages.length === 0 && <Card className="bg-[#1a1d27] border-[#2a2d37]"><CardContent className="pt-4"><p className="text-gray-400 text-center">Start a conversation with your AI coach. Ask about nutrition, workouts, or motivation.</p></CardContent></Card>}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-xl text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-[#1a1d27] border border-[#2a2d37] text-gray-200 rounded-bl-sm'}`}>{m.content}</div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="bg-[#1a1d27] border border-[#2a2d37] p-3 rounded-xl rounded-bl-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-indigo-400" /><span className="text-gray-400 text-sm">Thinking...</span></div></div>}
        <div ref={bottomRef} />
      </div>
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1">{quickActions.map(a => <Button key={a} variant="outline" size="sm" onClick={() => sendMessage(a)} className="border-[#2a2d37] text-gray-400 hover:text-white hover:bg-[#1a1d27] whitespace-nowrap text-xs">{a}</Button>)}</div>
        <div className="flex gap-2">
          <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()} placeholder="Ask your AI coach anything..." className="bg-[#1a1d27] border-[#2a2d37] text-white" disabled={loading} />
          <Button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="bg-indigo-500 hover:bg-indigo-600 text-white"><Send className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  )
}
