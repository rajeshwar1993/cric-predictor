import Link from 'next/link'

/**
 * Global footer — Server Component.
 *
 * Displays a legal disclaimer and links to Privacy Policy and Terms &
 * Conditions. Rendered on all authenticated (app) pages via the (app)
 * route group layout.
 *
 * @see docs/stories/LAY-003-footer.md
 * @see docs/design-systems/electric-street.md
 */
export function Footer() {
  return (
    <footer className="border-t border-mid-concrete mt-12">
      <div className="mx-auto max-w-[720px] px-4 md:px-8 py-6 text-center">
        <p className="text-caption text-text-muted mb-2">
          Bragg is a free prediction game for entertainment purposes only. No
          real money. No betting. No prizes.
        </p>
        <div className="flex items-center justify-center gap-4 text-xs text-text-secondary">
          <Link
            href="/privacy"
            className="inline-block py-2 hover:text-bragg-lime transition-colors duration-150 ease-out"
          >
            Privacy Policy
          </Link>
          <span className="text-text-muted" aria-hidden="true">
            &middot;
          </span>
          <Link
            href="/terms"
            className="inline-block py-2 hover:text-bragg-lime transition-colors duration-150 ease-out"
          >
            Terms &amp; Conditions
          </Link>
        </div>
      </div>
    </footer>
  )
}
