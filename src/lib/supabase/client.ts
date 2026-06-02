'use client'

import { createBrowserClient } from '@supabase/ssr'

function isValidUrl(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

export function createClient() {
  const url = isValidUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    ? process.env.NEXT_PUBLIC_SUPABASE_URL!
    : 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
  return createBrowserClient(url, key)
}
