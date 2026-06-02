'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <Card className="bg-[#1a1d27] border-[#2a2d37] shadow-2xl shadow-indigo-500/5">
      <CardHeader className="text-center">
        <CardTitle className="text-xl text-white">Welcome back</CardTitle>
        <CardDescription className="text-gray-400">
          Sign in to continue your transformation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#0c0e14] border-[#2a2d37] text-white placeholder:text-gray-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/30"
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-300">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#0c0e14] border-[#2a2d37] text-white placeholder:text-gray-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/30"
              placeholder="Enter your password"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium shadow-lg shadow-indigo-500/25 transition-all duration-200"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          <p className="text-center text-sm text-gray-400">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Sign up
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
