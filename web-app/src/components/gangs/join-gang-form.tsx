'use client'

import { type FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { joinGangByCode } from '@/lib/actions/gangs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import type { ActionResult } from '@/types'

interface JoinGangFormProps {
  /** Override the server action for testing/Storybook. Defaults to the real `joinGangByCode`. */
  action?: (inviteCode: string) => Promise<ActionResult<{ gangId: string; status: 'approved' | 'pending' }>>
}

/**
 * Join Gang Form -- allows a user to enter a 6-character invite code and request to join a gang.
 *
 * On success (auto-accept): shows "You're in!" toast and redirects to `/group/[gangId]`.
 * On success (pending): shows "Request sent!" toast.
 * On error: shows an inline error message below the input.
 *
 * @see docs/stories/DASH-003-join-gang.md
 */
export function JoinGangForm({ action = joinGangByCode }: JoinGangFormProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Client-side validation: exactly 6 uppercase alphanumeric chars
  const sanitized = code.trim().toUpperCase()
  const isValid = /^[A-Z0-9]{6}$/.test(sanitized)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!sanitized) {
      setError('Please enter an invite code')
      return
    }

    if (!isValid) {
      setError('Invite code must be 6 characters (letters and numbers only)')
      return
    }

    setIsLoading(true)

    try {
      const result = await action(sanitized)

      if (result.success) {
        if (result.data?.status === 'approved') {
          toast.success("You're in!")
          router.push(`/group/${result.data.gangId}`)
        } else {
          toast.success('Request sent! Waiting for admin approval.')
          setCode('')
        }
      } else {
        // Handle "already a member" redirect
        if (result.error.startsWith('already_a_member:')) {
          const gangId = result.error.split(':')[1]
          toast.info("You're already a member of this gang.")
          router.push(`/group/${gangId}`)
          return
        }
        setError(result.error)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-code">Invite code</Label>
        <Input
          id="invite-code"
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            if (error) setError('')
          }}
          placeholder="e.g., XK42AB"
          disabled={isLoading}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'invite-code-error' : undefined}
          maxLength={6}
          autoComplete="off"
          className="uppercase"
        />
      </div>

      {error ? (
        <p
          id="invite-code-error"
          className="text-caption text-electric-coral"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="secondary"
        disabled={isLoading || !isValid}
        className="self-start"
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Joining...
          </>
        ) : (
          'Join Gang'
        )}
      </Button>
    </form>
  )
}
