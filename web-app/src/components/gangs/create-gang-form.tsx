'use client'

import { type FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createGang } from '@/lib/actions/gangs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import type { ActionResult } from '@/types'

interface CreateGangFormProps {
  /** Override the server action for testing/Storybook. Defaults to the real `createGang`. */
  action?: (gangName: string) => Promise<ActionResult<{ gangId: string; inviteCode: string }>>
}

/**
 * Create Gang Form — allows a user to enter a gang name and submit it.
 *
 * On success: shows a toast and redirects to `/group/[gangId]`.
 * On error: shows an inline error message below the input.
 *
 * @see docs/stories/DASH-002-create-gang.md
 */
export function CreateGangForm({ action = createGang }: CreateGangFormProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const trimmedLength = name.trim().length
  const isValid = trimmedLength >= 3 && trimmedLength <= 50

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    // Client-side validation
    if (trimmedLength < 3) {
      setError('Gang name must be at least 3 characters')
      return
    }
    if (trimmedLength > 50) {
      setError('Gang name must be at most 50 characters')
      return
    }

    setIsLoading(true)

    try {
      const result = await action(name)

      if (result.success) {
        toast.success('Gang created!')
        router.push(`/group/${result.data?.gangId}`)
      } else {
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
        <Label htmlFor="gang-name">Gang name</Label>
        <Input
          id="gang-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (error) setError('')
          }}
          placeholder="Enter your gang name"
          disabled={isLoading}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'gang-name-error' : undefined}
          maxLength={50}
          autoComplete="off"
        />
      </div>

      {error ? (
        <p
          id="gang-name-error"
          className="text-caption text-electric-coral"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isLoading || !isValid}
        className="self-start"
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Creating...
          </>
        ) : (
          'Create Gang'
        )}
      </Button>
    </form>
  )
}
