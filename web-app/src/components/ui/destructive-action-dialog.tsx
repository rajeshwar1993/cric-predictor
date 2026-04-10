'use client'

import * as React from 'react'
import { TriangleAlert, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DestructiveActionDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when the open state changes */
  onOpenChange: (open: boolean) => void
  /** Dialog title (e.g. "Delete Gang") */
  title: string
  /** Description explaining consequences */
  description: string
  /** The value the user must type to confirm (e.g. gang name) */
  confirmValue: string
  /** Label for the confirm button (default: "Delete") */
  confirmLabel?: string
  /** Callback when the user confirms the action */
  onConfirm: () => void | Promise<void>
  /** Whether the action is in progress */
  isLoading?: boolean
  /** Additional class name for the dialog content */
  className?: string
  /**
   * Require the user's input to match `confirmValue` exactly (case and
   * whitespace-trimmed). Defaults to `false` for backwards compatibility
   * with member-removal flows that only need case-insensitive matching.
   * Set to `true` for the highest-risk destructive actions (e.g. deleting
   * a gang) where the confirmation step should be unambiguous.
   */
  caseSensitive?: boolean
}

function DestructiveActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmValue,
  confirmLabel = 'Delete',
  onConfirm,
  isLoading = false,
  className,
  caseSensitive = false,
}: DestructiveActionDialogProps) {
  const inputId = React.useId()
  const [inputValue, setInputValue] = React.useState('')

  const isMatch = caseSensitive
    ? inputValue.trim() === confirmValue.trim()
    : inputValue.toLowerCase().trim() === confirmValue.toLowerCase().trim()
  const isConfirmEnabled = isMatch && !isLoading

  // Reset input value when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setInputValue('')
    }
  }, [open])

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter' && isConfirmEnabled) {
      event.preventDefault()
      onConfirm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={isLoading ? () => {} : onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(e) => {
          if (isLoading) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (isLoading) e.preventDefault()
        }}
        className={cn('max-w-md', className)}
      >
        <DialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-md bg-electric-coral/15"
              aria-hidden="true"
            >
              <TriangleAlert className="size-5 text-electric-coral" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <label
            htmlFor={inputId}
            className={cn(
              'text-body-sm text-text-secondary',
              'select-none'
            )}
          >
            Type{' '}
            <span className="font-semibold text-text-primary">
              {confirmValue}
            </span>{' '}
            to confirm
          </label>
          <Input
            id={inputId}
            type="text"
            placeholder={confirmValue}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            autoComplete="off"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={!isConfirmEnabled}
            type="button"
          >
            {isLoading && (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            )}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { DestructiveActionDialog }
export type { DestructiveActionDialogProps }
