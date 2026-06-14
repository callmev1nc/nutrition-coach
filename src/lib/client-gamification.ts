'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { XpAction } from './gamification'

export interface AwardResult {
  awarded: boolean
  xp_total: number
  level: number
  leveled_up: boolean
  previous_level: number
}

/**
 * Award XP for an action by calling the secured `award_xp` Postgres function.
 * The client only passes the reason — the server resolves the user (auth.uid())
 * and the reward amount, so this can't be used to inflate XP or target another
 * user. Per-(user, reason, day) dedup is enforced server-side.
 *
 * Never throws: on any error returns null so callers can no-op.
 */
export async function awardXp(
  supabase: SupabaseClient,
  reason: XpAction
): Promise<AwardResult | null> {
  try {
    const { data, error } = await supabase.rpc('award_xp', { p_reason: reason })
    if (error || !data) return null
    const r = data as AwardResult
    if (!r.awarded) return { ...r, awarded: false }
    return r
  } catch {
    return null
  }
}

export interface MoodUpdate {
  mood_today?: number | null
  energy_today?: number | null
}

/**
 * Persist today's mood / energy check-in by writing to the profile (allowed via
 * RLS + the sanitized /api/profile route). Returns true on success.
 */
export async function saveMoodEnergy(
  supabase: SupabaseClient,
  patch: MoodUpdate
): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return false

    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    return res.ok
  } catch {
    return false
  }
}
