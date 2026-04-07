'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { createGang } from '@/lib/actions/gangs'

export function CreateGangForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const trimmedName = name.trim()
  const isValid = trimmedName.length >= 3 && trimmedName.length <= 50

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError(null)

    if (!isValid) {
      setError('Gang name must be 3\u201350 characters')
      return
    }

    startTransition(async () => {
      const result = await createGang(trimmedName)
      if (result.success) {
        router.push(`/group/${result.gangId}`)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--sp-3)]">
      <div className="flex flex-col gap-[var(--sp-1)]">
        <Label htmlFor="gang-name" className="text-[var(--text-secondary)]">
          Gang name
        </Label>
        <Input
          id="gang-name"
          type="text"
          placeholder="e.g. The Sixes"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (error !== null) setError(null)
          }}
          maxLength={50}
          minLength={3}
          disabled={isPending}
          aria-invalid={error !== null ? true : undefined}
          aria-describedby={error !== null ? 'create-gang-error' : undefined}
        />
        {error !== null && (
          <p
            id="create-gang-error"
            className="text-sm"
            style={{ color: 'var(--error)' }}
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
      <Button type="submit" disabled={isPending || !isValid}>
        {isPending ? <LoadingSpinner size="sm" /> : 'Create Gang'}
      </Button>
    </form>
  )
}
