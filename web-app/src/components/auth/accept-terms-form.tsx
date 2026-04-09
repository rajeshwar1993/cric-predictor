'use client'

import { useState, useCallback, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { acceptTerms } from '@/lib/actions/auth'

export function AcceptTermsForm() {
  const [accepted, setAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()

      if (!accepted) return

      setIsSubmitting(true)

      const result = await acceptTerms()

      // If redirect succeeds, we never reach here.
      // If we reach here, it means an error occurred.
      if (!result.success) {
        setIsSubmitting(false)
        toast.error(result.error)
      }
    },
    [accepted],
  )

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {/* Acceptance checkbox */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="accept-terms-checkbox"
          checked={accepted}
          onCheckedChange={(checked) => setAccepted(checked === true)}
          disabled={isSubmitting}
          className="mt-0.5"
        />
        <Label htmlFor="accept-terms-checkbox" className="text-body-sm leading-snug font-normal">
          I accept the updated Terms of Service and Privacy Policy
        </Label>
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={!accepted || isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Updating...
          </>
        ) : (
          'Continue'
        )}
      </Button>
    </form>
  )
}
