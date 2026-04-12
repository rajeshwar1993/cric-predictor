'use client'

import { useState, useCallback, useRef, type FormEvent } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/toast'
import { isAtLeast18 } from '@/lib/constants'
import { completeOnboarding } from '@/lib/actions/auth'

interface OnboardingFormProps {
  redirectTo?: string
}

interface FieldErrors {
  displayName?: string
  dateOfBirth?: string
  termsAccepted?: string
}

export function OnboardingForm({ redirectTo }: OnboardingFormProps) {
  const [displayName, setDisplayName] = useState('')
  const [dobDay, setDobDay] = useState('')
  const [dobMonth, setDobMonth] = useState('')
  const [dobYear, setDobYear] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const monthRef = useRef<HTMLInputElement>(null)
  const yearRef = useRef<HTMLInputElement>(null)

  const validate = useCallback((): FieldErrors => {
    const fieldErrors: FieldErrors = {}

    const trimmedName = displayName.trim()
    if (trimmedName.length < 2) {
      fieldErrors.displayName = 'Display name must be at least 2 characters'
    } else if (trimmedName.length > 30) {
      fieldErrors.displayName = 'Display name must be at most 30 characters'
    }

    if (!dobDay || !dobMonth || !dobYear) {
      fieldErrors.dateOfBirth = 'Date of birth is required'
    } else {
      const dayNum = parseInt(dobDay, 10)
      const monthNum = parseInt(dobMonth, 10)
      const yearNum = parseInt(dobYear, 10)

      if (
        isNaN(dayNum) ||
        isNaN(monthNum) ||
        isNaN(yearNum) ||
        dayNum < 1 ||
        dayNum > 31 ||
        monthNum < 1 ||
        monthNum > 12 ||
        yearNum < 1900
      ) {
        fieldErrors.dateOfBirth = 'Invalid date'
      } else {
        const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
        const parsed = new Date(dateStr)
        if (isNaN(parsed.getTime()) || parsed.getDate() !== dayNum) {
          fieldErrors.dateOfBirth = 'Invalid date'
        } else if (!isAtLeast18(parsed)) {
          fieldErrors.dateOfBirth = 'You must be 18 or older to use Bragg'
        }
      }
    }

    if (!termsAccepted) {
      fieldErrors.termsAccepted = 'You must accept the Terms of Service and Privacy Policy'
    }

    return fieldErrors
  }, [displayName, dobDay, dobMonth, dobYear, termsAccepted])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()

      const fieldErrors = validate()
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
        return
      }

      setErrors({})
      setIsSubmitting(true)

      const dateOfBirth = `${dobYear}-${String(parseInt(dobMonth, 10)).padStart(2, '0')}-${String(parseInt(dobDay, 10)).padStart(2, '0')}`

      const result = await completeOnboarding(
        {
          displayName: displayName.trim(),
          dateOfBirth,
          termsAccepted,
        },
        redirectTo,
      )

      // If redirect succeeds, we never reach here.
      // If we reach here, it means an error occurred.
      if (!result.success) {
        setIsSubmitting(false)
        toast.error(result.error)
      }
    },
    [displayName, dobDay, dobMonth, dobYear, termsAccepted, redirectTo, validate],
  )

  const clearDobError = () => {
    if (errors.dateOfBirth) {
      setErrors((prev) => ({ ...prev, dateOfBirth: undefined }))
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {/* Display Name */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="onboarding-display-name">Display name</Label>
        <Input
          id="onboarding-display-name"
          type="text"
          placeholder="What should we call you?"
          autoComplete="name"
          autoFocus
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value)
            if (errors.displayName) {
              setErrors((prev) => ({ ...prev, displayName: undefined }))
            }
          }}
          disabled={isSubmitting}
          aria-invalid={!!errors.displayName}
          aria-describedby={
            errors.displayName
              ? 'onboarding-display-name-error'
              : 'onboarding-display-name-hint'
          }
        />
        <p id="onboarding-display-name-hint" className="text-body-sm text-text-muted">
          This is how others see you on leaderboards.
        </p>
        {errors.displayName && (
          <p
            id="onboarding-display-name-error"
            className="text-body-sm text-electric-coral"
            role="alert"
          >
            {errors.displayName}
          </p>
        )}
      </div>

      {/* Date of Birth */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-caption text-text-secondary">Date of birth</legend>
        <p className="text-body-sm text-text-muted">You must be 18+ to play. We never share this.</p>
        <div className="flex gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="onboarding-dob-day" className="text-caption text-text-muted">
              DD
            </label>
            <Input
              id="onboarding-dob-day"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              placeholder="DD"
              className="w-16 text-center"
              value={dobDay}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 2)
                setDobDay(val)
                if (val.length === 2) monthRef.current?.focus()
                clearDobError()
              }}
              disabled={isSubmitting}
              aria-invalid={!!errors.dateOfBirth}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="onboarding-dob-month" className="text-caption text-text-muted">
              MM
            </label>
            <Input
              ref={monthRef}
              id="onboarding-dob-month"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              placeholder="MM"
              className="w-16 text-center"
              value={dobMonth}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 2)
                setDobMonth(val)
                if (val.length === 2) yearRef.current?.focus()
                clearDobError()
              }}
              disabled={isSubmitting}
              aria-invalid={!!errors.dateOfBirth}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="onboarding-dob-year" className="text-caption text-text-muted">
              YYYY
            </label>
            <Input
              ref={yearRef}
              id="onboarding-dob-year"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="YYYY"
              className="w-20 text-center"
              value={dobYear}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                setDobYear(val)
                clearDobError()
              }}
              disabled={isSubmitting}
              aria-invalid={!!errors.dateOfBirth}
            />
          </div>
        </div>
        {errors.dateOfBirth && (
          <p id="onboarding-dob-error" className="text-body-sm text-electric-coral" role="alert">
            {errors.dateOfBirth}
          </p>
        )}
      </fieldset>

      {/* Terms Checkbox */}
      <div className="flex flex-col gap-2">
        <label htmlFor="onboarding-terms" className="-m-2 flex cursor-pointer items-start gap-3 p-2">
          <Checkbox
            id="onboarding-terms"
            checked={termsAccepted}
            onCheckedChange={(checked) => {
              setTermsAccepted(checked === true)
              if (errors.termsAccepted) {
                setErrors((prev) => ({ ...prev, termsAccepted: undefined }))
              }
            }}
            disabled={isSubmitting}
            aria-invalid={!!errors.termsAccepted}
            aria-describedby={errors.termsAccepted ? 'onboarding-terms-error' : undefined}
            className="mt-0.5"
          />
          <span className="text-body-sm leading-snug text-text-secondary">
            I agree to the{' '}
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-vivid-blue underline transition-colors duration-[var(--duration-state)] hover:text-text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-vivid-blue underline transition-colors duration-[var(--duration-state)] hover:text-text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              Privacy Policy
            </Link>
          </span>
        </label>
        {errors.termsAccepted && (
          <p id="onboarding-terms-error" className="text-body-sm text-electric-coral" role="alert">
            {errors.termsAccepted}
          </p>
        )}
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Setting up...
          </>
        ) : (
          "Let's Go"
        )}
      </Button>
    </form>
  )
}
