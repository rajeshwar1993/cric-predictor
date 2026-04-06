'use client'

import { useCallback, useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { acceptUpdatedTerms } from '@/lib/actions/onboarding'

export function AcceptTermsForm() {
  const [accepted, setAccepted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault()
      if (!accepted) return
      startTransition(async () => {
        const result: { success: boolean; error?: string } = await acceptUpdatedTerms()
        if (!result.success && result.error !== undefined) {
          setErrorMessage(result.error)
        }
      })
    },
    [accepted],
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-[length:var(--radius-ds-lg)] border border-[var(--border-default)] bg-[var(--bg-raised)] p-[var(--sp-4)]">
        <p className="text-sm text-[var(--text-secondary)]">
          We&apos;ve updated our terms and privacy policy. Please review the changes and accept to
          continue using Bragg.
        </p>
        <div className="mt-3 flex gap-4">
          <Link
            href="/privacy"
            target="_blank"
            className="text-sm text-[var(--brand)] underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            target="_blank"
            className="text-sm text-[var(--brand)] underline-offset-4 hover:underline"
          >
            Terms & Conditions
          </Link>
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => {
            setAccepted(e.target.checked)
          }}
          className="mt-1 h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--brand)]"
        />
        <span className="text-sm text-[var(--text-secondary)]">
          I have read and accept the updated Terms & Conditions and Privacy Policy
        </span>
      </label>

      {errorMessage !== '' && <p className="text-sm text-[var(--error)]">{errorMessage}</p>}

      <Button type="submit" className="w-full" disabled={!accepted || isPending}>
        {isPending ? <LoadingSpinner size="sm" /> : 'Continue'}
      </Button>
    </form>
  )
}
