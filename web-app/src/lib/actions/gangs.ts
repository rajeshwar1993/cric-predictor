'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { trackEvent } from '@/lib/analytics/server'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import type { ActionResult } from '@/types'

const gangNameSchema = z.string().trim().min(3).max(50)

/**
 * Create a new gang via the `create_gang` Postgres RPC.
 *
 * Flow: auth check → rate limit → validate → RPC → analytics → revalidate → return gangId.
 *
 * @param gangName - The desired gang name (3–50 characters after trim)
 * @returns ActionResult with gangId and inviteCode on success
 *
 * @see docs/stories/DASH-002-create-gang.md
 */
export async function createGang(
  gangName: string,
): Promise<ActionResult<{ gangId: string; inviteCode: string }>> {
  const supabase = await createServerClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Rate limit: 10 per hour
  const rl = await rateLimit(user.id, 'create_gang', {
    max: 10,
    windowSeconds: 3600,
  })
  if (!rl.allowed) {
    return { success: false, error: 'Too many requests. Try again later.' }
  }

  // Validate gang name
  const parsed = gangNameSchema.safeParse(gangName)
  if (!parsed.success) {
    return { success: false, error: 'Gang name must be 3\u201350 characters' }
  }

  // Call RPC
  const { data, error } = await supabase.rpc('create_gang', {
    p_gang_name: parsed.data,
    p_creator_id: user.id,
  })

  if (error) {
    if (error.message.includes('MAX_GANGS_REACHED')) {
      return {
        success: false,
        error: "You've reached the maximum of 40 gangs.",
      }
    }
    if (error.message.includes('INVITE_CODE_GENERATION_FAILED')) {
      return {
        success: false,
        error: 'Unable to generate invite code. Please try again.',
      }
    }
    return { success: false, error: 'Failed to create gang. Please try again.' }
  }

  // Analytics
  trackEvent(user.id, ANALYTICS_EVENTS.GANG_CREATED, {
    gang_name: parsed.data,
  })

  // Revalidate dashboard to reflect new gang
  revalidatePath('/dashboard')

  // data is the new gang_id returned by the RPC.
  // inviteCode is empty here because the RPC only returns the gang_id.
  // The invite code is fetched separately on the gang detail page via the gangs DAL.
  return { success: true, data: { gangId: data as string, inviteCode: '' } }
}
