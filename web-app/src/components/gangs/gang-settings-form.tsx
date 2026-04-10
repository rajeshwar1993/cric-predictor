'use client'

import {
  useEffect,
  useId,
  useState,
  useTransition,
  type FormEvent,
} from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import {
  updateAutoAccept as updateAutoAcceptAction,
  updateGangName as updateGangNameAction,
  updatePredictionDeadline as updatePredictionDeadlineAction,
} from '@/lib/actions/gangs'
import type { ActionResult } from '@/types'

const NAME_MIN = 3
const NAME_MAX = 50
const DEADLINE_MIN = 15
const DEADLINE_MAX = 720

export interface GangSettingsFormProps {
  gangId: string
  initialName: string
  initialAutoAccept: boolean
  initialPredictionDeadlineMins: number
  /** Override the updateGangName server action (Storybook/testing). */
  onUpdateName?: (gangId: string, name: string) => Promise<ActionResult>
  /** Override the updateAutoAccept server action (Storybook/testing). */
  onUpdateAutoAccept?: (
    gangId: string,
    autoAccept: boolean,
  ) => Promise<ActionResult>
  /** Override the updatePredictionDeadline server action (Storybook/testing). */
  onUpdatePredictionDeadline?: (
    gangId: string,
    minutes: number,
  ) => Promise<ActionResult>
}

/**
 * GangSettingsForm — composes the Gang Info and Prediction Settings sections
 * of the settings page. Each control saves independently (no single form
 * submit). Uses a loading state on each Save button while its action is in
 * flight and surfaces success via toast. Field-level validation/server
 * errors are shown inline under the field; action-wide failures fall back to
 * the generic error surface (caller's responsibility).
 *
 * @see docs/stories/SET-001-gang-settings.md
 */
export function GangSettingsForm({
  gangId,
  initialName,
  initialAutoAccept,
  initialPredictionDeadlineMins,
  onUpdateName = updateGangNameAction,
  onUpdateAutoAccept = updateAutoAcceptAction,
  onUpdatePredictionDeadline = updatePredictionDeadlineAction,
}: GangSettingsFormProps) {
  return (
    <>
      <GangInfoSection
        gangId={gangId}
        initialName={initialName}
        initialAutoAccept={initialAutoAccept}
        onUpdateName={onUpdateName}
        onUpdateAutoAccept={onUpdateAutoAccept}
      />
      <PredictionSettingsSection
        gangId={gangId}
        initialMinutes={initialPredictionDeadlineMins}
        onUpdatePredictionDeadline={onUpdatePredictionDeadline}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// GangInfoSection
// ---------------------------------------------------------------------------

interface GangInfoSectionProps {
  gangId: string
  initialName: string
  initialAutoAccept: boolean
  onUpdateName: (gangId: string, name: string) => Promise<ActionResult>
  onUpdateAutoAccept: (
    gangId: string,
    autoAccept: boolean,
  ) => Promise<ActionResult>
}

function GangInfoSection({
  gangId,
  initialName,
  initialAutoAccept,
  onUpdateName,
  onUpdateAutoAccept,
}: GangInfoSectionProps) {
  const nameInputId = useId()
  const nameErrorId = useId()
  const nameHintId = useId()
  const autoAcceptId = useId()

  // `savedName` is the "last known saved" name. This is the source of truth
  // for dirty-checking. It updates on successful save (so the Save button
  // disables again) and falls back via the effect below when the parent
  // passes a fresh `initialName` prop after a refetch.
  const [savedName, setSavedName] = useState(initialName)
  const [name, setName] = useState(initialName)
  const [nameError, setNameError] = useState<string | null>(null)
  const [isSavingName, startSaveName] = useTransition()

  // `savedAutoAccept` mirrors the server value so the Switch reflects the
  // current saved state even across re-renders after revalidation.
  const [savedAutoAccept, setSavedAutoAccept] = useState(initialAutoAccept)
  const [autoAccept, setAutoAccept] = useState(initialAutoAccept)
  const [isSavingAutoAccept, startSaveAutoAccept] = useTransition()

  // Sync local baselines when the parent passes new initial values (e.g.,
  // a full refetch / route re-render swaps this component instance).
  useEffect(() => {
    setSavedName(initialName)
    setName(initialName)
  }, [initialName])

  useEffect(() => {
    setSavedAutoAccept(initialAutoAccept)
    setAutoAccept(initialAutoAccept)
  }, [initialAutoAccept])

  const trimmed = name.trim()
  const isNameDirty = trimmed !== savedName.trim()
  const isNameValid = trimmed.length >= NAME_MIN && trimmed.length <= NAME_MAX
  const canSaveName = isNameDirty && isNameValid && !isSavingName

  function handleNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // Validate inline BEFORE firing the server action so the admin gets
    // immediate feedback instead of a silently-disabled Save button.
    if (trimmed.length < NAME_MIN) {
      setNameError(`Gang name must be at least ${NAME_MIN} characters.`)
      return
    }
    if (trimmed.length > NAME_MAX) {
      setNameError(`Gang name must be at most ${NAME_MAX} characters.`)
      return
    }

    if (!canSaveName) return

    setNameError(null)

    startSaveName(async () => {
      try {
        const result = await onUpdateName(gangId, trimmed)
        if (result.success) {
          // Advance the baseline so the Save button re-disables after save.
          setSavedName(trimmed)
          setName(trimmed)
          toast.success('Gang name updated')
        } else {
          // Field-level error — show inline only (no toast). R-003.
          setNameError(result.error)
        }
      } catch {
        // Unexpected network/runtime error — show inline.
        setNameError('Something went wrong. Please try again.')
      }
    })
  }

  function handleNameBlur() {
    // Surface inline feedback on blur so the admin doesn't have to hit
    // Save to learn the name is too short.
    if (trimmed.length === 0) return
    if (trimmed.length < NAME_MIN) {
      setNameError(`Gang name must be at least ${NAME_MIN} characters.`)
    }
  }

  function handleAutoAcceptChange(next: boolean) {
    // Optimistic UI would be risky here (revalidate may flip back). Stick
    // with synchronous state update + toast on error revert pattern.
    const previous = savedAutoAccept
    setAutoAccept(next)

    startSaveAutoAccept(async () => {
      try {
        const result = await onUpdateAutoAccept(gangId, next)
        if (result.success) {
          setSavedAutoAccept(next)
          toast.success(next ? 'Auto-accept enabled' : 'Auto-accept disabled')
        } else {
          // Revert optimistic update. The switch has no inline error slot,
          // so keep the toast here as the only surface for auto-accept failures.
          setAutoAccept(previous)
          toast.error(result.error)
        }
      } catch {
        setAutoAccept(previous)
        toast.error('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <section
      className="mt-8 rounded-lg border border-wire bg-dark-concrete p-6"
      aria-label="Gang info"
    >
      <h2 className="text-h3 font-bold uppercase tracking-[0.02em] text-text-primary">
        Gang Info
      </h2>

      {/* Gang name */}
      <form className="mt-6 flex flex-col gap-2" onSubmit={handleNameSubmit}>
        <Label htmlFor={nameInputId} className="normal-case">
          Gang name
        </Label>
        <Input
          id={nameInputId}
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            // Clear any stale error as soon as the user types a
            // potentially-valid value — they'll see fresh feedback on
            // blur or Save if it's still invalid.
            if (nameError) setNameError(null)
          }}
          onBlur={handleNameBlur}
          minLength={NAME_MIN}
          maxLength={NAME_MAX}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? nameErrorId : nameHintId}
          disabled={isSavingName}
          autoComplete="off"
        />
        {nameError ? (
          <p id={nameErrorId} className="text-xs text-electric-coral">
            {nameError}
          </p>
        ) : (
          <p id={nameHintId} className="text-xs text-text-muted">
            {NAME_MIN}–{NAME_MAX} characters.
          </p>
        )}
        <div className="mt-2 flex justify-end">
          <Button
            type="submit"
            variant="default"
            size="sm"
            disabled={!canSaveName}
          >
            {isSavingName && (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            )}
            {isSavingName ? 'Saving...' : 'Save Name'}
          </Button>
        </div>
      </form>

      {/* Auto-accept */}
      <div className="mt-8 flex items-start justify-between gap-4 border-t border-wire pt-6">
        <div className="flex-1">
          <Label htmlFor={autoAcceptId} className="normal-case text-text-primary">
            Auto-accept join requests
          </Label>
          <p className="mt-1 text-body-sm text-text-secondary">
            New members are approved instantly when they use the invite link.
          </p>
        </div>
        {/* Switch + text state. The visible "On"/"Off" label provides a
            non-color-dependent cue for sighted color-blind users; the
            underlying Switch primitive already exposes aria-checked for
            assistive tech. */}
        <div className="flex shrink-0 items-center gap-2">
          <span
            className="min-w-[1.75rem] text-right text-caption font-semibold uppercase tracking-wide text-text-secondary"
            aria-hidden="true"
          >
            {autoAccept ? 'On' : 'Off'}
          </span>
          <Switch
            id={autoAcceptId}
            checked={autoAccept}
            onCheckedChange={handleAutoAcceptChange}
            disabled={isSavingAutoAccept}
            aria-label="Auto-accept join requests"
          />
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// PredictionSettingsSection
// ---------------------------------------------------------------------------

interface PredictionSettingsSectionProps {
  gangId: string
  initialMinutes: number
  onUpdatePredictionDeadline: (
    gangId: string,
    minutes: number,
  ) => Promise<ActionResult>
}

function PredictionSettingsSection({
  gangId,
  initialMinutes,
  onUpdatePredictionDeadline,
}: PredictionSettingsSectionProps) {
  const inputId = useId()
  const errorId = useId()

  // `savedMinutes` is the "last known saved" deadline — the baseline for
  // dirty-checking and for rendering the prose above the input. It advances
  // on every successful save and syncs via the effect below when the parent
  // passes a fresh `initialMinutes` prop.
  const [savedMinutes, setSavedMinutes] = useState(initialMinutes)
  // Keep raw string state so we can validate on submit rather than blocking
  // typing. Displayed label below still reflects the parsed numeric value.
  const [value, setValue] = useState(String(initialMinutes))
  const [error, setError] = useState<string | null>(null)
  const [isSaving, startSaving] = useTransition()

  // Sync the local baseline when the parent passes new initial minutes.
  useEffect(() => {
    setSavedMinutes(initialMinutes)
    setValue(String(initialMinutes))
  }, [initialMinutes])

  // Accept any string that parses to a non-negative integer — including
  // leading-zero inputs like "015" and decimal-with-trailing-zero inputs
  // like "15.0". Reject non-integer inputs such as "15.5" or "abc".
  const trimmedValue = value.trim()
  const numericValue = Number(trimmedValue)
  const isParsed =
    trimmedValue !== '' &&
    Number.isInteger(numericValue) &&
    numericValue >= 0
  const parsed = isParsed ? numericValue : NaN
  const isValid =
    isParsed && parsed >= DEADLINE_MIN && parsed <= DEADLINE_MAX
  const isDirty = !isParsed || parsed !== savedMinutes
  const canSave = isValid && isDirty && !isSaving

  const displayMinutes = isValid ? parsed : savedMinutes

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isParsed) {
      setError('Deadline must be a whole number of minutes')
      return
    }
    if (parsed < DEADLINE_MIN) {
      setError(`Deadline must be at least ${DEADLINE_MIN} minutes`)
      return
    }
    if (parsed > DEADLINE_MAX) {
      setError(`Deadline must be at most ${DEADLINE_MAX} minutes (12 hours)`)
      return
    }
    if (!canSave) return

    setError(null)

    startSaving(async () => {
      try {
        const result = await onUpdatePredictionDeadline(gangId, parsed)
        if (result.success) {
          // Advance the baseline so the Save button re-disables and the
          // prose reflects the new value.
          setSavedMinutes(parsed)
          setValue(String(parsed))
          toast.success('Prediction deadline updated')
        } else {
          // Field-level error — show inline only (no toast). R-003.
          setError(result.error)
        }
      } catch {
        // Unexpected network/runtime error — show inline.
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <section
      className="mt-8 rounded-lg border border-wire bg-dark-concrete p-6"
      aria-label="Prediction settings"
    >
      <h2 className="text-h3 font-bold uppercase tracking-[0.02em] text-text-primary">
        Prediction Settings
      </h2>
      <p className="mt-2 text-body-sm text-text-secondary">
        Predictions close{' '}
        <span className="font-semibold text-text-primary">
          {displayMinutes}
        </span>{' '}
        minutes before match start.
      </p>

      <form className="mt-6 flex flex-col gap-2" onSubmit={handleSubmit}>
        <Label htmlFor={inputId} className="normal-case">
          Minutes before match start
        </Label>
        <Input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={DEADLINE_MIN}
          max={DEADLINE_MAX}
          step={1}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (error) setError(null)
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          disabled={isSaving}
        />
        {error ? (
          <p id={errorId} className="text-xs text-electric-coral">
            {error}
          </p>
        ) : (
          <p className="text-xs text-text-muted">
            Between {DEADLINE_MIN} and {DEADLINE_MAX} minutes (15 min – 12 h).
          </p>
        )}
        <div className="mt-2 flex justify-end">
          <Button
            type="submit"
            variant="default"
            size="sm"
            disabled={!canSave}
          >
            {isSaving && (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            )}
            {isSaving ? 'Saving...' : 'Save Deadline'}
          </Button>
        </div>
      </form>
    </section>
  )
}
