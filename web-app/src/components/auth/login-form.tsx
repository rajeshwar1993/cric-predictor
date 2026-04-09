'use client'

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { sendMagicLink } from '@/lib/actions/auth'
import { trackEvent } from '@/lib/analytics/client'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'

type FormState = 'EMAIL_INPUT' | 'SENDING' | 'CONFIRMATION'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RESEND_COOLDOWN_SECONDS = 60

interface LoginFormProps {
  redirectTo?: string
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [formState, setFormState] = useState<FormState>('EMAIL_INPUT')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return

    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [cooldown])

  const validateEmail = useCallback((value: string): string => {
    if (!value.trim()) return 'Email is required'
    if (!EMAIL_REGEX.test(value)) return 'Please enter a valid email address'
    return ''
  }, [])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()

      const validationError = validateEmail(email)
      if (validationError) {
        setError(validationError)
        return
      }

      setError('')
      setFormState('SENDING')

      const result = await sendMagicLink(email, redirectTo)

      if (result.success) {
        setFormState('CONFIRMATION')
        setCooldown(RESEND_COOLDOWN_SECONDS)
      } else {
        setFormState('EMAIL_INPUT')
        if (result.error.includes('Too many attempts')) {
          setError(result.error)
        } else {
          toast.error(result.error)
        }
      }
    },
    [email, redirectTo, validateEmail],
  )

  const handleResend = useCallback(async () => {
    if (cooldown > 0) return

    setFormState('SENDING')

    const result = await sendMagicLink(email, redirectTo)

    if (result.success) {
      setFormState('CONFIRMATION')
      setCooldown(RESEND_COOLDOWN_SECONDS)
      trackEvent(ANALYTICS_EVENTS.MAGIC_LINK_RESENT, { email_provided: true })
    } else {
      setFormState('CONFIRMATION')
      if (result.error.includes('Too many attempts')) {
        setError(result.error)
      } else {
        toast.error(result.error)
      }
    }
  }, [cooldown, email, redirectTo])

  const handleBackToInput = useCallback(() => {
    setFormState('EMAIL_INPUT')
    setError('')
  }, [])

  // Confirmation state
  if (formState === 'CONFIRMATION') {
    return (
      <div className="flex flex-col items-center gap-6 text-center" role="status" aria-live="polite">
        <div className="flex flex-col gap-2">
          <h2 className="text-h2 text-text-primary">Check your email</h2>
          <p className="text-body text-text-secondary">
            We sent a magic link to <strong className="text-text-primary">{email}</strong>
          </p>
        </div>

        {error && (
          <p className="text-body-sm text-electric-coral" role="alert">
            {error}
          </p>
        )}

        <div className="flex w-full flex-col gap-3">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={cooldown > 0}
            onClick={handleResend}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend magic link'}
          </Button>

          <button
            type="button"
            className="text-body-sm text-vivid-blue transition-colors duration-[var(--duration-state)] hover:text-text-primary"
            onClick={handleBackToInput}
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  // Email input + sending state
  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="login-email">Email address</Label>
        <Input
          id="login-email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (error) setError('')
          }}
          disabled={formState === 'SENDING'}
          aria-invalid={!!error}
          aria-describedby={error ? 'login-email-error' : undefined}
        />
        {error && (
          <p id="login-email-error" className="text-body-sm text-electric-coral" role="alert">
            {error}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={formState === 'SENDING'}>
        {formState === 'SENDING' ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Sending...
          </>
        ) : (
          'Send magic link'
        )}
      </Button>
    </form>
  )
}
