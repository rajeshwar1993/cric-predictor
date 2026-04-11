import { cn } from '@/lib/utils'

interface BraggWordmarkProps {
  /** Heading element to render the wordmark as. Defaults to `p` (decorative). */
  as?: 'h1' | 'p'
  /** Brand color treatment. Defaults to `lime` for marketing/recovery surfaces. */
  tone?: 'lime' | 'primary'
  /**
   * Mark the wordmark as decorative when a sibling heading already
   * carries the page title (e.g. landing hero, login form).
   */
  decorative?: boolean
  className?: string
}

/**
 * BraggWordmark — the canonical "BRAGG" text logotype.
 *
 * Centralises the markup, color, and semantics of the brand wordmark
 * so every public surface (landing, login, 404, error) renders it the
 * same way and a future logotype refresh only touches one file.
 *
 * Use `as="h1"` when the wordmark IS the page title (404, error, login).
 * Use the default `as="p"` plus `decorative` when there is a separate
 * `<h1>` carrying the actual page heading (landing hero).
 */
export function BraggWordmark({
  as: Tag = 'p',
  tone = 'lime',
  decorative = false,
  className,
}: BraggWordmarkProps) {
  return (
    <Tag
      className={cn(
        'text-h1',
        tone === 'lime' ? 'text-bragg-lime' : 'text-text-primary',
        className,
      )}
      aria-hidden={decorative ? true : undefined}
    >
      BRAGG
    </Tag>
  )
}
