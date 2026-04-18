'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  createScenarioTemplate,
  updateScenarioTemplate,
} from '@/lib/actions/admin/scenario-templates'
import { toast } from '@/components/ui/toast'
import type { ScenarioTemplate } from '@/lib/dal/admin/reference'
import type { Sport } from '@/lib/dal/admin/reference'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SLUG_REGEX = /^[a-z][a-z0-9_]*$/

const INPUT_TYPES = [
  { value: 'team_pick', label: 'Team Pick' },
  { value: 'player_pick', label: 'Player Pick' },
  { value: 'range', label: 'Range' },
  { value: 'yes_no', label: 'Yes / No' },
] as const

const RESOLUTION_PHASES = [
  { value: 'toss', label: 'Toss' },
  { value: 'first_wicket', label: 'First Wicket' },
  { value: 'team_powerplay_end', label: 'Powerplay End' },
  { value: 'mid_match', label: 'Mid Match' },
  { value: 'team_innings_end', label: 'Innings End' },
  { value: 'end', label: 'End' },
  { value: 'post_match', label: 'Post Match' },
] as const

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ScenarioTemplateFormProps {
  /** When set, the dialog is open */
  open: boolean
  /** Callback when the dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Existing template to edit; null = create new */
  template: ScenarioTemplate | null
  /** Number of fixtures this template has been seeded to (for warning) */
  seededCount?: number
  /** Available sports for the dropdown */
  sports: Sport[]
  /** All existing slugs for client-side uniqueness check */
  existingSlugs: string[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScenarioTemplateForm({
  open,
  onOpenChange,
  template,
  seededCount = 0,
  sports,
  existingSlugs,
}: ScenarioTemplateFormProps) {
  const isEditing = !!template

  // Form state
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [sportId, setSportId] = useState('')
  const [inputType, setInputType] = useState<string>('team_pick')
  const [optionsJson, setOptionsJson] = useState('')
  const [points, setPoints] = useState(10)
  const [resolutionPhase, setResolutionPhase] = useState<string>('end')
  const [isActive, setIsActive] = useState(true)

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when dialog opens or template changes
  useEffect(() => {
    if (open) {
      if (template) {
        setSlug(template.slug)
        setTitle(template.title)
        setSportId(template.sport_id)
        setInputType(template.input_type)
        setOptionsJson(
          template.options !== null && template.options !== undefined
            ? JSON.stringify(template.options, null, 2)
            : '',
        )
        setPoints(template.points)
        setResolutionPhase(template.resolution_phase)
        setIsActive(template.is_active)
      } else {
        setSlug('')
        setTitle('')
        setSportId(sports[0]?.id ?? '')
        setInputType('team_pick')
        setOptionsJson('')
        setPoints(10)
        setResolutionPhase('end')
        setIsActive(true)
      }
      setErrors({})
      setIsSubmitting(false)
    }
  }, [open, template, sports])

  // Derived state
  const showOptions = inputType === 'range'

  // Client-side validation
  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}

    if (!slug.trim()) {
      errs.slug = 'Slug is required'
    } else if (!SLUG_REGEX.test(slug)) {
      errs.slug =
        'Must start with a lowercase letter, followed by lowercase letters, digits, or underscores'
    } else if (
      !isEditing &&
      existingSlugs.includes(slug)
    ) {
      errs.slug = 'A template with this slug already exists'
    }

    if (!title.trim()) {
      errs.title = 'Title is required'
    }

    if (!sportId) {
      errs.sport_id = 'Sport is required'
    }

    if (points < 1 || !Number.isInteger(points)) {
      errs.points = 'Points must be a positive integer'
    }

    if (showOptions) {
      if (!optionsJson.trim()) {
        errs.options = 'Options are required for range input type'
      } else {
        try {
          JSON.parse(optionsJson)
        } catch {
          errs.options = 'Options must be valid JSON'
        }
      }
    }

    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors({})
    setIsSubmitting(true)

    const parsedOptions = showOptions ? JSON.parse(optionsJson) : null

    const payload = {
      title,
      sport_id: sportId,
      input_type: inputType as 'team_pick' | 'player_pick' | 'range' | 'yes_no',
      options: parsedOptions,
      points,
      resolution_phase: resolutionPhase as
        | 'toss'
        | 'first_wicket'
        | 'team_powerplay_end'
        | 'mid_match'
        | 'team_innings_end'
        | 'end'
        | 'post_match',
      is_active: isActive,
    }

    try {
      let result
      if (isEditing) {
        result = await updateScenarioTemplate(template.id, payload)
      } else {
        result = await createScenarioTemplate({ ...payload, slug })
      }

      if (result.success) {
        toast.success(
          isEditing
            ? `Template "${slug}" updated`
            : `Template "${slug}" created`,
        )
        onOpenChange(false)
      } else {
        // Show server-side error
        if (result.error.includes('slug')) {
          setErrors({ slug: result.error })
        } else {
          setErrors({ _form: result.error })
        }
      }
    } catch {
      setErrors({ _form: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? () => {} : onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Template' : 'Create Template'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the template fields below. Changes only affect future fixtures.'
              : 'Define a new scenario template that will be seeded for upcoming fixtures.'}
          </DialogDescription>
        </DialogHeader>

        {/* Seeded warning */}
        {isEditing && seededCount > 0 && (
          <div className="flex items-start gap-3 rounded-md border border-sunburst-yellow/30 bg-sunburst-yellow/10 p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-sunburst-yellow" />
            <p className="text-body-sm text-text-secondary">
              This template has been seeded to{' '}
              <span className="font-medium text-text-primary">
                {seededCount} fixture{seededCount !== 1 ? 's' : ''}
              </span>
              . Changes to title, points, or options will only affect future
              fixtures — already-seeded scenarios are not retroactively updated.
            </p>
          </div>
        )}

        {/* Form error */}
        {errors._form && (
          <div className="rounded-md border border-electric-coral/30 bg-electric-coral/10 p-3">
            <p className="text-body-sm text-electric-coral">{errors._form}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Slug */}
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. match_winner"
              disabled={isEditing}
              readOnly={isEditing}
              data-error={!!errors.slug || undefined}
              aria-invalid={!!errors.slug || undefined}
              className={isEditing ? 'opacity-60' : undefined}
            />
            {errors.slug && (
              <p className="text-body-sm text-electric-coral">{errors.slug}</p>
            )}
            {isEditing && (
              <p className="text-body-sm text-text-muted">
                Slug cannot be changed after creation
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g. Who will win {Home Team} vs {Away Team}?'
              data-error={!!errors.title || undefined}
              aria-invalid={!!errors.title || undefined}
            />
            {errors.title && (
              <p className="text-body-sm text-electric-coral">{errors.title}</p>
            )}
          </div>

          {/* Sport */}
          <div className="space-y-1.5">
            <Label htmlFor="sport_id">Sport</Label>
            <select
              id="sport_id"
              value={sportId}
              onChange={(e) => setSportId(e.target.value)}
              className="flex h-12 w-full rounded-md border-2 border-wire bg-dark-concrete px-4 font-body text-base text-text-primary outline-none transition-[color,border-color,box-shadow] duration-[var(--duration-exit)] ease-out focus-visible:border-bragg-lime focus-visible:ring-[3px] focus-visible:ring-bragg-lime/50 focus-visible:ring-offset-0"
              aria-invalid={!!errors.sport_id || undefined}
            >
              {sports.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.name}
                </option>
              ))}
            </select>
            {errors.sport_id && (
              <p className="text-body-sm text-electric-coral">
                {errors.sport_id}
              </p>
            )}
          </div>

          {/* Input Type + Resolution Phase (side by side) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="input_type">Input Type</Label>
              <select
                id="input_type"
                value={inputType}
                onChange={(e) => setInputType(e.target.value)}
                className="flex h-12 w-full rounded-md border-2 border-wire bg-dark-concrete px-4 font-body text-base text-text-primary outline-none transition-[color,border-color,box-shadow] duration-[var(--duration-exit)] ease-out focus-visible:border-bragg-lime focus-visible:ring-[3px] focus-visible:ring-bragg-lime/50 focus-visible:ring-offset-0"
              >
                {INPUT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="resolution_phase">Resolution Phase</Label>
              <select
                id="resolution_phase"
                value={resolutionPhase}
                onChange={(e) => setResolutionPhase(e.target.value)}
                className="flex h-12 w-full rounded-md border-2 border-wire bg-dark-concrete px-4 font-body text-base text-text-primary outline-none transition-[color,border-color,box-shadow] duration-[var(--duration-exit)] ease-out focus-visible:border-bragg-lime focus-visible:ring-[3px] focus-visible:ring-bragg-lime/50 focus-visible:ring-offset-0"
              >
                {RESOLUTION_PHASES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Options (visible only for range type) */}
          {showOptions && (
            <div className="space-y-1.5">
              <Label htmlFor="options">Options (JSON)</Label>
              <textarea
                id="options"
                value={optionsJson}
                onChange={(e) => setOptionsJson(e.target.value)}
                placeholder='e.g. ["0-29", "30-59", "60-89", "90+"]'
                rows={4}
                className="flex w-full rounded-md border-2 border-wire bg-dark-concrete px-4 py-3 font-mono text-sm text-text-primary outline-none transition-[color,border-color,box-shadow] duration-[var(--duration-exit)] ease-out placeholder:text-text-muted focus-visible:border-bragg-lime focus-visible:ring-[3px] focus-visible:ring-bragg-lime/50 focus-visible:ring-offset-0 aria-invalid:border-electric-coral aria-invalid:ring-electric-coral/20"
                aria-invalid={!!errors.options || undefined}
              />
              {errors.options && (
                <p className="text-body-sm text-electric-coral">
                  {errors.options}
                </p>
              )}
            </div>
          )}

          {/* Points */}
          <div className="space-y-1.5">
            <Label htmlFor="points">Points</Label>
            <Input
              id="points"
              type="number"
              min={1}
              step={1}
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value, 10) || 0)}
              data-error={!!errors.points || undefined}
              aria-invalid={!!errors.points || undefined}
            />
            {errors.points && (
              <p className="text-body-sm text-electric-coral">
                {errors.points}
              </p>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isEditing ? 'Save changes' : 'Create template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
