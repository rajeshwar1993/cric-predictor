'use client'

import { useCallback, useState, useTransition, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { signInWithMagicLink } from '@/lib/actions/auth'

type FormState = 'input' | 'sent' | 'error'

export function LoginForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? undefined
  const callbackError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [formState, setFormState] = useState<FormState>(
    callbackError === 'auth_callback_failed' ? 'error' : 'input',
  )
  const [errorMessage, setErrorMessage] = useState(
    callbackError === 'auth_callback_failed'
      ? 'That link expired. Let\u2019s get you a fresh one.'
      : '',
  )
  const [isPending, startTransition] = useTransition()
  const [cooldown, setCooldown] = useState(0)

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1)
    }, 1000)
    return () => {
      clearInterval(timer)
    }
  }, [cooldown])

  const handleSubmit = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault()
      startTransition(async () => {
        const result = await signInWithMagicLink(email, redirectTo)
        if (result.success) {
          setFormState('sent')
          setCooldown(60)
          setErrorMessage('')
        } else {
          setFormState('error')
          setErrorMessage(result.error ?? 'Something went wrong')
        }
      })
    },
    [email, redirectTo],
  )

  const handleResend = useCallback(() => {
    startTransition(async () => {
      const result = await signInWithMagicLink(email, redirectTo)
      if (result.success) {
        setCooldown(60)
        setErrorMessage('')
      } else {
        setErrorMessage(result.error ?? 'Something went wrong')
      }
    })
  }, [email, redirectTo])

  if (formState === 'sent') {
    return (
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <h2 className="font-heading text-xl font-semibold text-[var(--text-primary)]">
            Check your inbox
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Magic link sent to <strong className="text-[var(--text-primary)]">{email}</strong>
          </p>
        </div>

        {errorMessage !== '' && <p className="text-sm text-[var(--error)]">{errorMessage}</p>}

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            disabled={cooldown > 0 || isPending}
            onClick={handleResend}
          >
            {isPending ? (
              <LoadingSpinner size="sm" />
            ) : cooldown > 0 ? (
              `Resend in ${String(cooldown)}s`
            ) : (
              'Resend Magic Link'
            )}
          </Button>
          <button
            type="button"
            className="text-sm text-[var(--text-secondary)] underline-offset-4 hover:underline"
            onClick={() => {
              setFormState('input')
              setErrorMessage('')
            }}
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)]">
          Email address
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
          }}
          autoFocus
          required
          autoComplete="email"
        />
      </div>

      {errorMessage !== '' && <p className="text-sm text-[var(--error)]">{errorMessage}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <LoadingSpinner size="sm" /> : 'Send Magic Link'}
      </Button>
    </form>
  )
}
