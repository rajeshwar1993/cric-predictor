'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { updateGangSettings } from '@/lib/actions/gangs'

// ---------------------------------------------------------------------------
// GangNameEditor
// ---------------------------------------------------------------------------

export function GangNameEditor({ gangId, currentName }: { gangId: string; currentName: string }) {
  const router = useRouter()
  const [name, setName] = useState(currentName)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const trimmedName = name.trim()
  const isValid = trimmedName.length >= 3 && trimmedName.length <= 50
  const hasChanged = trimmedName !== currentName

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!isValid) {
      setError('Gang name must be 3\u201350 characters')
      return
    }

    startTransition(async () => {
      const result = await updateGangSettings(gangId, { name: trimmedName })
      if (result.success) {
        setSuccess(true)
        router.refresh()
        setTimeout(() => {
          setSuccess(false)
        }, 2000)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--sp-3)]">
      <div className="flex flex-col gap-[var(--sp-1)]">
        <Label htmlFor="gang-name-edit" className="text-[var(--text-secondary)]">
          Gang name
        </Label>
        <Input
          id="gang-name-edit"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (error !== null) setError(null)
            if (success) setSuccess(false)
          }}
          maxLength={50}
          minLength={3}
          disabled={isPending}
          aria-invalid={error !== null ? true : undefined}
          aria-describedby={error !== null ? 'gang-name-edit-error' : undefined}
        />
        {error !== null && (
          <p
            id="gang-name-edit-error"
            className="text-sm"
            style={{ color: 'var(--error)' }}
            role="alert"
          >
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm" style={{ color: 'var(--success)' }} role="status">
            Name updated
          </p>
        )}
      </div>
      <Button type="submit" disabled={isPending || !isValid || !hasChanged}>
        {isPending ? <LoadingSpinner size="sm" /> : 'Save Name'}
      </Button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// AutoAcceptToggle
// ---------------------------------------------------------------------------

export function AutoAcceptToggle({
  gangId,
  currentValue,
}: {
  gangId: string
  currentValue: boolean
}) {
  const router = useRouter()
  const [checked, setChecked] = useState(currentValue)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleChange(newValue: boolean) {
    setChecked(newValue)
    setError(null)
    startTransition(async () => {
      const result = await updateGangSettings(gangId, { autoAccept: newValue })
      if (result.success) {
        router.refresh()
      } else {
        // Revert
        setChecked(!newValue)
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-[var(--sp-2)]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-[var(--sp-1)]">
          <Label htmlFor="auto-accept-toggle" className="text-[var(--text-primary)]">
            Auto-accept new members
          </Label>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            When enabled, join requests are approved instantly
          </p>
        </div>
        <Switch
          id="auto-accept-toggle"
          checked={checked}
          onCheckedChange={handleChange}
          disabled={isPending}
          aria-label="Auto-accept new members"
        />
      </div>
      {error !== null && (
        <p className="text-sm" style={{ color: 'var(--error)' }} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// PredictionDeadlineEditor
// ---------------------------------------------------------------------------

export function PredictionDeadlineEditor({
  gangId,
  currentMins,
}: {
  gangId: string
  currentMins: number
}) {
  const router = useRouter()
  const [mins, setMins] = useState(String(currentMins))
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const numMins = Number(mins)
  const isValid = Number.isInteger(numMins) && numMins >= 1 && numMins <= 1440
  const hasChanged = numMins !== currentMins

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!isValid) {
      setError('Deadline must be between 1 and 1440 minutes')
      return
    }

    startTransition(async () => {
      const result = await updateGangSettings(gangId, {
        predictionDeadlineMins: numMins,
      })
      if (result.success) {
        setSuccess(true)
        router.refresh()
        setTimeout(() => {
          setSuccess(false)
        }, 2000)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--sp-3)]">
      <div className="flex flex-col gap-[var(--sp-1)]">
        <Label htmlFor="prediction-deadline" className="text-[var(--text-secondary)]">
          Prediction deadline (minutes before match)
        </Label>
        <Input
          id="prediction-deadline"
          type="number"
          min={1}
          max={1440}
          value={mins}
          onChange={(e) => {
            setMins(e.target.value)
            if (error !== null) setError(null)
            if (success) setSuccess(false)
          }}
          disabled={isPending}
          aria-invalid={error !== null ? true : undefined}
          aria-describedby={error !== null ? 'deadline-error' : undefined}
        />
        {error !== null && (
          <p id="deadline-error" className="text-sm" style={{ color: 'var(--error)' }} role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm" style={{ color: 'var(--success)' }} role="status">
            Deadline updated
          </p>
        )}
      </div>
      <Button type="submit" disabled={isPending || !isValid || !hasChanged}>
        {isPending ? <LoadingSpinner size="sm" /> : 'Save Deadline'}
      </Button>
    </form>
  )
}
