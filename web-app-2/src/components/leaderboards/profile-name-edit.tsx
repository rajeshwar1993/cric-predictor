'use client'

import { useCallback, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { updateProfile } from '@/lib/actions/profile'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileNameEditProps {
  currentName: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProfileNameEdit({ currentName }: ProfileNameEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(currentName)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSave = useCallback(async () => {
    const trimmed = name.trim()
    if (trimmed === currentName) {
      setIsEditing(false)
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    const result = await updateProfile({ displayName: trimmed })

    setIsLoading(false)

    if (result.success) {
      setIsEditing(false)
      setSuccessMessage('Name updated')
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
    } else {
      setError(result.error)
    }
  }, [name, currentName])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        void handleSave()
      }
      if (e.key === 'Escape') {
        setIsEditing(false)
        setName(currentName)
        setError(null)
      }
    },
    [handleSave, currentName],
  )

  if (!isEditing) {
    return (
      <div className="flex flex-col gap-[var(--sp-1)]">
        <label className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">
          Display name
        </label>
        <div className="flex items-center gap-[var(--sp-2)]">
          <span className="text-lg font-semibold text-[var(--text-primary)] font-heading">
            {currentName}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsEditing(true)
              setError(null)
              setSuccessMessage(null)
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-ds-sm)] transition-colors hover:bg-[var(--bg-overlay)]"
            aria-label="Edit display name"
          >
            <Pencil size={14} strokeWidth={1.5} className="text-[var(--text-secondary)]" />
          </button>
          {successMessage !== null && (
            <span className="text-xs font-medium text-[var(--success)]">{successMessage}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[var(--sp-2)]">
      <label
        htmlFor="display-name-input"
        className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]"
      >
        Display name
      </label>
      <div className="flex items-center gap-[var(--sp-2)]">
        <Input
          id="display-name-input"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          onKeyDown={handleKeyDown}
          maxLength={30}
          autoFocus
          aria-label="Display name"
          className="max-w-[240px]"
        />
        <Button
          onClick={() => {
            void handleSave()
          }}
          disabled={isLoading || name.trim().length < 2}
          size="sm"
        >
          {isLoading ? <LoadingSpinner size="sm" /> : 'Save'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsEditing(false)
            setName(currentName)
            setError(null)
          }}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
      {error !== null && <p className="text-sm text-[var(--error)]">{error}</p>}
    </div>
  )
}
