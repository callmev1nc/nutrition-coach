'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error boundary:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-6xl">😵‍💫</div>
      <h2 className="font-display text-2xl font-bold text-foreground">
        Well that wasn&apos;t supposed to happen
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Something broke on this screen. Try again — your data is safe.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} className="press bg-primary text-primary-foreground">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
        <Link href="/dashboard">
          <Button variant="outline" className="press border">
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
