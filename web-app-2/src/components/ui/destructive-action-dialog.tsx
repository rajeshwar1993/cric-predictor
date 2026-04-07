'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface DestructiveActionDialogProps {
  title: string
  description: string
  confirmValue: string
  confirmLabel: string
  onConfirm: () => Promise<void>
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DestructiveActionDialog({
  title,
  description,
  confirmValue,
  confirmLabel,
  onConfirm,
  open,
  onOpenChange,
}: DestructiveActionDialogProps) {
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isMatch = inputValue.trim() === confirmValue

  // Reset input when dialog closes
  useEffect(() => {
    if (!open) {
      setInputValue('')
      setIsLoading(false)
    }
  }, [open])

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      return () => {
        clearTimeout(timer)
      }
    }
    return undefined
  }, [open])

  const handleConfirm = useCallback(async () => {
    if (!isMatch || isLoading) return
    setIsLoading(true)
    try {
      await onConfirm()
    } finally {
      setIsLoading(false)
    }
  }, [isMatch, isLoading, onConfirm])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && isMatch && !isLoading) {
        void handleConfirm()
      }
    },
    [isMatch, isLoading, handleConfirm],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-[var(--warning)]">{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <p className="text-sm text-[var(--text-secondary)]">
            Type <strong className="text-[var(--text-primary)]">{confirmValue}</strong> to confirm
          </p>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
            }}
            onKeyDown={handleKeyDown}
            placeholder={confirmValue}
            aria-label={`Type ${confirmValue} to confirm`}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={!isMatch || isLoading}
            onClick={() => {
              void handleConfirm()
            }}
          >
            {isLoading ? <LoadingSpinner size="sm" /> : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
