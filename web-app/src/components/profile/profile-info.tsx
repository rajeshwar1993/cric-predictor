'use client'

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from 'react'
import { Loader2, Pencil } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { getAvatarInitials } from '@/lib/utils'
import { formatDate } from '@/lib/format-date'
import { updateDisplayName as updateDisplayNameAction } from '@/lib/actions/profile'
import type { ActionResult } from '@/types'

const NAME_MIN = 2
const NAME_MAX = 30

export interface ProfileInfoProps {
  /** Current display name from v2_profiles. */
  displayName: string
  /** Current email from the auth user. Read-only. */
  email: string
  /** ISO date string of the user's date of birth. May be null. */
  dateOfBirth: string | null
  /** ISO timestamp of when the profile was created. */
  joinedAt: string
  /** Override the updateDisplayName server action (Storybook/testing). */
  onUpdateDisplayName?: (newName: string) => Promise<ActionResult>
}

/**
 * ProfileInfo — avatar, inline-editable display name, and read-only
 * email/date-of-birth/joined-on rows.
 *
 * Click the pencil button (or the display name) to enter edit mode. Save
 * disables until the trimmed value is between 2 and 30 characters and is
 * different from the saved value. Server errors are surfaced inline under
 * the input; success closes the editor and shows a toast.
 *
 * @see docs/stories/PRF-001-profile-page.md
 */
export function ProfileInfo({
  displayName,
  email,
  dateOfBirth,
  joinedAt,
  onUpdateDisplayName = updateDisplayNameAction,
}: ProfileInfoProps) {
  const inputId = useId()
  const errorId = useId()

  // `savedName` mirrors the server value; the form drives `name`.
  const [savedName, setSavedName] = useState(displayName)
  const [name, setName] = useState(displayName)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, startSaving] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync local baselines if the parent passes a fresh prop after refetch.
  useEffect(() => {
    setSavedName(displayName)
    setName(displayName)
  }, [displayName])

  // Auto-focus the input when entering edit mode for a fast keyboard flow.
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const trimmed = name.trim()
  const isDirty = trimmed !== savedName.trim()
  const isValid = trimmed.length >= NAME_MIN && trimmed.length <= NAME_MAX
  const canSave = isDirty && isValid && !isSaving

  function enterEditMode() {
    setError(null)
    setName(savedName)
    setIsEditing(true)
  }

  function cancelEdit() {
    setError(null)
    setName(savedName)
    setIsEditing(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (trimmed.length < NAME_MIN) {
      setError(`Display name must be at least ${NAME_MIN} characters.`)
      return
    }
    if (trimmed.length > NAME_MAX) {
      setError(`Display name must be at most ${NAME_MAX} characters.`)
      return
    }
    if (!canSave) return

    setError(null)

    startSaving(async () => {
      try {
        const result = await onUpdateDisplayName(trimmed)
        if (result.success) {
          setSavedName(trimmed)
          setName(trimmed)
          setIsEditing(false)
          toast.success('Display name updated')
        } else {
          setError(result.error)
        }
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <section
      className="mt-8 rounded-lg border border-wire bg-dark-concrete p-6"
      aria-labelledby="profile-info-heading"
    >
      <h2
        id="profile-info-heading"
        className="text-h3 font-bold uppercase tracking-[0.02em] text-text-primary"
      >
        Account
      </h2>

      <div className="mt-6 flex items-start gap-4">
        <Avatar size="lg">
          <AvatarFallback>{getAvatarInitials(savedName)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <form
              className="flex flex-col gap-2"
              onSubmit={handleSubmit}
              aria-label="Edit display name"
            >
              <Label htmlFor={inputId} className="normal-case">
                Display name
              </Label>
              <Input
                id={inputId}
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (error) setError(null)
                }}
                minLength={NAME_MIN}
                maxLength={NAME_MAX}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                disabled={isSaving}
                autoComplete="off"
              />
              {error ? (
                <p
                  id={errorId}
                  className="text-xs text-electric-coral"
                  role="alert"
                  aria-live="polite"
                >
                  {error}
                </p>
              ) : (
                <p className="text-xs text-text-muted">
                  {NAME_MIN}–{NAME_MAX} characters.
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={!canSave}
                >
                  {isSaving && (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={cancelEdit}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-start justify-between gap-3">
              {/* The name button uses visible text for its accessible name so
                  screen readers read out the name. The pencil button below
                  gets an aria-label. Both trigger the same enter-edit action. */}
              <button
                type="button"
                onClick={enterEditMode}
                className="-mx-2 -my-1 flex flex-col items-start rounded px-2 py-1 text-left transition-colors duration-[150ms] hover:bg-light-concrete focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-bragg-lime/50"
              >
                <span className="font-display text-h3 font-bold text-text-primary">
                  {savedName}
                </span>
                <span className="text-caption uppercase tracking-wide text-text-muted">
                  Tap to edit
                </span>
              </button>
              <button
                type="button"
                onClick={enterEditMode}
                aria-label="Edit display name"
                className="flex size-10 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors duration-[150ms] hover:bg-light-concrete hover:text-text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-bragg-lime/50"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Read-only details */}
      <dl className="mt-6 flex flex-col gap-4 border-t border-wire pt-6">
        <div className="flex flex-col gap-1">
          <dt className="text-caption uppercase tracking-wide text-text-muted">
            Email
          </dt>
          <dd className="break-all text-body-sm text-text-secondary">
            {email}
          </dd>
        </div>

        <div className="flex flex-col gap-1">
          <dt className="text-caption uppercase tracking-wide text-text-muted">
            Date of birth
          </dt>
          <dd className="text-body-sm text-text-secondary">
            {dateOfBirth ? formatDate(dateOfBirth) : 'Not set'}
          </dd>
        </div>

        <div className="flex flex-col gap-1">
          <dt className="text-caption uppercase tracking-wide text-text-muted">
            Member since
          </dt>
          <dd className="text-body-sm text-text-secondary">
            Joined {formatDate(joinedAt)}
          </dd>
        </div>
      </dl>
    </section>
  )
}
