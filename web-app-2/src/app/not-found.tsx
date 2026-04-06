import Link from 'next/link'
import { Logo } from '@/components/ui/logo'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-[var(--sp-5)]">
      <div className="space-y-6 text-center">
        <Logo size="sm" />
        <h1 className="font-heading text-3xl font-bold text-[var(--text-primary)]">Wrong pitch.</h1>
        <p className="max-w-xs text-base text-[var(--text-secondary)]">
          That page doesn&apos;t exist — maybe it got bowled out. Let&apos;s get you back in the
          game.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex h-12 items-center justify-center rounded-[length:var(--radius-ds-md)] bg-[var(--brand)] px-6 font-semibold text-[var(--brand-on)] transition-colors hover:bg-[var(--brand-hover)]"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
