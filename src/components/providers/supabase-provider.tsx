'use client'

import { createContext, useContext, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const SupabaseContext = createContext<SupabaseClient | undefined>(undefined)

function isValidUrl(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const url = isValidUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    ? process.env.NEXT_PUBLIC_SUPABASE_URL!
    : 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

  const client = useMemo(() => createBrowserClient(url, key), [url, key])

  return (
    <SupabaseContext.Provider value={client}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}
