'use client'

import { useState, useCallback, type FormEvent } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/toast'
import { completeOnboarding } from '@/lib/actions/auth'

interface OnboardingFormProps {
  redirectTo?: string
}

interface FieldErrors {
  displayName?: string
  dateOfBirth?: string
  termsAccepted?: string
}

/**
 * Check whether a date of birth represents someone who is at least 18 years old.
 * Client-side mirror of the server-side validation.
 */
function isAtLeast18(dateOfBirth: Date): boolean {
  const today = new Date()
  const age = today.getFullYear() - dateOfBirth.getFullYear()
  const monthDiff = today.getMonth() - dateOfBirth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    return age - 1 >= 18
  }
  return age >= 18
}

export function OnboardingForm({ redirectTo }: OnboardingFormProps) {
  const [displayName, setDisplayName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = useCallback((): FieldErrors => {
    const fieldErrors: FieldErrors = {}

    const trimmedName = displayName.trim()
    if (trimmedName.length < 2) {
      fieldErrors.displayName = 'Display name must be at least 2 characters'
    } else if (trimmedName.length > 30) {
      fieldErrors.displayName = 'Display name must be at most 30 characters'
    }

    if (!dateOfBirth) {
      fieldErrors.dateOfBirth = 'Date of birth is required'
    } else if (isNaN(Date.parse(dateOfBirth))) {
      fieldErrors.dateOfBirth = 'Invalid date'
    } else if (!isAtLeast18(new Date(dateOfBirth))) {
      fieldErrors.dateOfBirth = 'You must be 18 or older to use Bragg'
    }

    if (!termsAccepted) {
      fieldErrors.termsAccepted = 'You must accept the Terms of Service and Privacy Policy'
    }

    return fieldErrors
  }, [displayName, dateOfBirth, termsAccepted])

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
    [displayName, dateOfBirth, termsAccepted, redirectTo, validate],
  )

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
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value)
            if (errors.displayName) {
              setErrors((prev) => ({ ...prev, displayName: undefined }))
            }
          }}
          disabled={isSubmitting}
          aria-invalid={!!errors.displayName}
          aria-describedby={errors.displayName ? 'onboarding-display-name-error' : undefined}
        />
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
      <div className="flex flex-col gap-2">
        <Label htmlFor="onboarding-dob">Date of birth</Label>
        <Input
          id="onboarding-dob"
          type="date"
          max={new Date().toISOString().split('T')[0]}
          value={dateOfBirth}
          onChange={(e) => {
            setDateOfBirth(e.target.value)
            if (errors.dateOfBirth) {
              setErrors((prev) => ({ ...prev, dateOfBirth: undefined }))
            }
          }}
          disabled={isSubmitting}
          aria-invalid={!!errors.dateOfBirth}
          aria-describedby={errors.dateOfBirth ? 'onboarding-dob-error' : undefined}
        />
        {errors.dateOfBirth && (
          <p id="onboarding-dob-error" className="text-body-sm text-electric-coral" role="alert">
            {errors.dateOfBirth}
          </p>
        )}
      </div>

      {/* Terms Checkbox */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-3">
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
          <Label htmlFor="onboarding-terms" className="text-body-sm leading-snug font-normal">
            I agree to the{' '}
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-vivid-blue underline transition-colors duration-[var(--duration-state)] hover:text-text-primary"
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-vivid-blue underline transition-colors duration-[var(--duration-state)] hover:text-text-primary"
            >
              Privacy Policy
            </Link>
          </Label>
        </div>
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
          'Get Started'
        )}
      </Button>
    </form>
  )
}
