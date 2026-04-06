'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { trackServerEvent } from '@/lib/analytics/server'
import { AUTH_ACCOUNT_DELETED } from '@/lib/analytics/events'
import { performSignOut } from './auth'

interface ActionResult {
  success: boolean
  error?: string
}

/**
 * AUTH-API-006: Delete account server action.
 *
 * Calls the `delete_account` RPC (AUTH-DB-001) which atomically handles
 * admin auto-promotion, gang cleanup, and profile soft-delete.
 * Then signs the user out.
 */
export async function deleteAccount(): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    return { success: false, error: 'You must be signed in' }
  }

  // Fire analytics BEFORE sign-out (so distinct_id is still set)
  trackServerEvent(user.id, AUTH_ACCOUNT_DELETED, {})

  // Call the atomic delete_account RPC
  const { error: rpcError } = await supabase.rpc('delete_account', {
    p_user_id: user.id,
  })

  if (rpcError !== null) {
    return { success: false, error: 'Failed to delete account. Please try again.' }
  }

  // Sign out (clears Supabase session + app cookies)
  await performSignOut()
  redirect('/')
}
