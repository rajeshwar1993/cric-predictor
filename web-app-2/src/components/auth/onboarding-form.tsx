'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { completeOnboarding } from '@/lib/actions/onboarding'

function calculateAge(dob: Date, today: Date): number {
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age
}

export function OnboardingForm() {
  const [displayName, setDisplayName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState('')

  const today = new Date().toISOString().split('T')[0] ?? ''

  const nameError = useMemo(() => {
    const trimmed = displayName.trim()
    if (trimmed.length === 0) return ''
    if (trimmed.length < 2) return 'At least 2 characters'
    if (trimmed.length > 30) return 'Maximum 30 characters'
    return ''
  }, [displayName])

  const dobError = useMemo(() => {
    if (dateOfBirth === '') return ''
    const dob = new Date(dateOfBirth)
    if (isNaN(dob.getTime())) return 'Invalid date'
    const age = calculateAge(dob, new Date())
    if (age < 18) return 'You must be at least 18 years old'
    return ''
  }, [dateOfBirth])

  const isValid =
    displayName.trim().length >= 2 &&
    displayName.trim().length <= 30 &&
    dateOfBirth !== '' &&
    dobError === '' &&
    nameError === '' &&
    acceptedTerms

  const handleSubmit = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault()
      if (!isValid) return
      startTransition(async () => {
        const result = await completeOnboarding(displayName.trim(), dateOfBirth, acceptedTerms)
        if (!result.success && result.error !== undefined) {
          setErrorMessage(result.error)
        }
      })
    },
    [isValid, displayName, dateOfBirth, acceptedTerms],
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="displayName"
          className="block text-sm font-medium text-[var(--text-secondary)]"
        >
          Display name
        </label>
        <Input
          id="displayName"
          type="text"
          placeholder="What should we call you?"
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value)
          }}
          maxLength={30}
          autoFocus
          autoComplete="name"
        />
        {nameError !== '' && <p className="text-xs text-[var(--error)]">{nameError}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="dob" className="block text-sm font-medium text-[var(--text-secondary)]">
          Date of birth
        </label>
        <Input
          id="dob"
          type="date"
          value={dateOfBirth}
          onChange={(e) => {
            setDateOfBirth(e.target.value)
          }}
          max={today}
        />
        {dobError !== '' && <p className="text-xs text-[var(--error)]">{dobError}</p>}
      </div>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => {
            setAcceptedTerms(e.target.checked)
          }}
          className="mt-1 h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--brand)]"
        />
        <span className="text-sm text-[var(--text-secondary)]">
          I agree to the{' '}
          <Link
            href="/terms"
            target="_blank"
            className="text-[var(--brand)] underline-offset-4 hover:underline"
          >
            Terms & Conditions
          </Link>{' '}
          and{' '}
          <Link
            href="/privacy"
            target="_blank"
            className="text-[var(--brand)] underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
        </span>
      </label>

      {errorMessage !== '' && <p className="text-sm text-[var(--error)]">{errorMessage}</p>}

      <Button type="submit" className="w-full" disabled={!isValid || isPending}>
        {isPending ? <LoadingSpinner size="sm" /> : "Let's go"}
      </Button>
    </form>
  )
}
