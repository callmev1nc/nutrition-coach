import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="font-display text-7xl font-extrabold text-gradient">404</div>
      <h1 className="font-display text-2xl font-bold text-foreground">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This page doesn&apos;t exist (yet) — maybe it unlocked at a higher level. 😉
      </p>
      <Link href="/dashboard">
        <Button className="press bg-primary text-primary-foreground">
          <Home className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>
    </div>
  )
}
