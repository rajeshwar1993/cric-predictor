import Link from 'next/link'

export function GlobalFooter() {
  return (
    <footer className="border-t border-[var(--border-default)] px-[var(--sp-5)] py-[var(--sp-6)]">
      <div className="mx-auto max-w-[480px] space-y-3 text-center">
        <p className="text-sm text-[var(--text-tertiary)]">
          Not affiliated with BCCI, IPL, or any franchise. Bragg is a free prediction game — no real
          money, no gambling.
        </p>
        <div className="flex items-center justify-center gap-4 text-sm">
          <Link
            href="/privacy"
            className="text-[var(--text-secondary)] underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
          <span className="text-[var(--text-tertiary)]">·</span>
          <Link
            href="/terms"
            className="text-[var(--text-secondary)] underline-offset-4 hover:underline"
          >
            Terms & Conditions
          </Link>
        </div>
      </div>
    </footer>
  )
}
