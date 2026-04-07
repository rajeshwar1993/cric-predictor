'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { joinGang } from '@/lib/actions/gangs'

const ERROR_MESSAGES: Record<string, string> = {
  invalid_code: 'Invalid invite code. Check the code and try again.',
  already_member: "You're already in this gang.",
  gang_full: 'This gang is full (20 members max).',
  blocked: 'You have been blocked from this gang.',
  gang_deleted: 'This gang has been deleted.',
  max_gangs: "You've reached the maximum number of gangs.",
  name_collision:
    'Someone in this gang already has the same display name. Update your name on the Profile page and try again.',
  server_error: 'Something went wrong. Please try again.',
  not_authenticated: 'You must be signed in.',
}

export function JoinGangForm() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const normalizedCode = code.trim().toUpperCase()
  const isValid = normalizedCode.length > 0 && normalizedCode.length <= 6

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError(null)
    setPendingMessage(null)

    if (!isValid) {
      setError('Enter an invite code')
      return
    }

    startTransition(async () => {
      const result = await joinGang(normalizedCode)
      if (result.success) {
        if (result.status === 'approved') {
          router.push(`/group/${result.gangId}`)
        } else {
          setPendingMessage('Request sent, waiting for admin approval')
        }
      } else {
        setError(ERROR_MESSAGES[result.error] ?? result.message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--sp-3)]">
      <div className="flex flex-col gap-[var(--sp-1)]">
        <Label htmlFor="invite-code" className="text-[var(--text-secondary)]">
          Invite code
        </Label>
        <Input
          id="invite-code"
          type="text"
          placeholder="ABC123"
          value={code.toUpperCase()}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            if (error !== null) setError(null)
            if (pendingMessage !== null) setPendingMessage(null)
          }}
          maxLength={6}
          disabled={isPending}
          aria-invalid={error !== null ? true : undefined}
          aria-describedby={
            error !== null
              ? 'join-gang-error'
              : pendingMessage !== null
                ? 'join-gang-pending'
                : undefined
          }
          className="uppercase tracking-widest"
        />
        {error !== null && (
          <p
            id="join-gang-error"
            className="text-sm"
            style={{ color: 'var(--error)' }}
            role="alert"
          >
            {error}
          </p>
        )}
        {pendingMessage !== null && (
          <p
            id="join-gang-pending"
            className="text-sm"
            style={{ color: 'var(--warning)' }}
            role="status"
          >
            {pendingMessage}
          </p>
        )}
      </div>
      <Button type="submit" disabled={isPending || !isValid}>
        {isPending ? <LoadingSpinner size="sm" /> : 'Join Gang'}
      </Button>
    </form>
  )
}
