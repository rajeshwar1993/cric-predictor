'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DestructiveActionDialog } from '@/components/ui/destructive-action-dialog'
import { toast } from '@/components/ui/toast'
import { deleteAccount as deleteAccountAction } from '@/lib/actions/profile'
import type { ActionResult } from '@/types'

export interface DeleteAccountSectionProps {
  /** The authenticated user's email — what they must type to confirm. */
  email: string
  /** Override delete action for Storybook/testing. */
  onDelete?: () => Promise<ActionResult>
  /** Force the confirmation dialog open — Storybook/testing only. */
  initialDialogOpen?: boolean
}

/**
 * Type guard for the `NEXT_REDIRECT` error thrown by `redirect()` in
 * server actions. Next.js attaches a `digest` field starting with
 * `NEXT_REDIRECT;...`. The error must be re-thrown so Next.js can
 * complete the navigation — swallowing it would leave the user stuck
 * on a deleted account.
 */
function isNextRedirectError(error: unknown): error is Error & { digest: string } {
  return (
    error instanceof Error &&
    'digest' in error &&
    typeof (error as { digest?: unknown }).digest === 'string' &&
    (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  )
}

/**
 * DeleteAccountSection -- the destructive button + confirmation dialog
 * on `/profile/delete`.
 *
 * On confirm:
 *   1. Call the `deleteAccount` server action.
 *   2. On `NEXT_REDIRECT` — fire a success toast (this IS the success
 *      signal) and rethrow so Next.js completes the navigation.
 *   3. On any other error or `success: false` — surface the message via
 *      a persistent error toast and re-enable the dialog. No optimistic
 *      success toast is ever shown on the failure path.
 *
 * @see docs/stories/PRF-002-delete-account.md
 */
export function DeleteAccountSection({
  email,
  onDelete = deleteAccountAction,
  initialDialogOpen = false,
}: DeleteAccountSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(initialDialogOpen)
  const [isLoading, setIsLoading] = useState(false)

  async function handleConfirm() {
    setIsLoading(true)

    try {
      const result = await onDelete()

      // We only get here if the action returned an ActionResult instead
      // of redirecting (i.e. an error path). Surface the real error —
      // no optimistic success toast has been fired, so there is nothing
      // to dismiss.
      toast.error(result.success ? 'Failed to delete account.' : result.error)
      setIsDialogOpen(false)
      setIsLoading(false)
    } catch (error) {
      // Rethrow Next.js redirect errors so the framework can navigate.
      // The thrown NEXT_REDIRECT IS the success signal, so the success
      // toast only fires here — failure paths never flash a green toast.
      if (isNextRedirectError(error)) {
        toast.success('Account deleted')
        throw error
      }

      toast.error('Failed to delete account. Please try again.')
      setIsDialogOpen(false)
      setIsLoading(false)
    }
  }

  return (
    <>
      <section
        className="mt-8 rounded-lg border-2 border-electric-coral/40 bg-dark-concrete p-6"
        aria-label="Delete account"
      >
        <h2 className="text-h3 font-bold uppercase tracking-[0.02em] text-electric-coral">
          Permanent action
        </h2>
        <p className="mt-2 text-body-sm text-text-secondary">
          Once you confirm, your account is deleted immediately. You can sign
          back in later with the same email to restore it.
        </p>
        <Button
          variant="destructive"
          onClick={() => setIsDialogOpen(true)}
          className="mt-4 w-full sm:w-auto"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Delete Account
        </Button>
      </section>

      <DestructiveActionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Delete Account"
        description="This permanently deletes your account. Your predictions stay in your gangs for other members. If you are the only admin of a gang, another member is promoted — or the gang is deleted if you are the only one left."
        confirmValue={email}
        confirmLabel="Delete Account"
        caseSensitive
        onConfirm={handleConfirm}
        isLoading={isLoading}
      />
    </>
  )
}
