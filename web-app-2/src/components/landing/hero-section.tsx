import Link from 'next/link'
import { Logo } from '@/components/ui/logo'

export function HeroSection() {
  return (
    <section
      className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-[var(--sp-5)] py-[var(--sp-16)]"
      aria-label="Hero"
    >
      {/* Ambient background effects */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {/* Diagonal energy lines */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, var(--brand) 0px, var(--brand) 1px, transparent 1px, transparent 40px)',
          }}
        />

        {/* Stadium floodlight glow — top left */}
        <div
          className="absolute -left-20 -top-20 h-[400px] w-[400px] rounded-full opacity-[0.06] blur-[120px]"
          style={{ background: 'var(--brand)' }}
        />

        {/* Stadium floodlight glow — bottom right */}
        <div
          className="absolute -bottom-20 -right-20 h-[300px] w-[300px] rounded-full opacity-[0.04] blur-[100px]"
          style={{ background: 'var(--brand)' }}
        />

        {/* Film grain overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex max-w-[480px] flex-col items-center gap-[var(--sp-8)] text-center">
        {/* Logo + wordmark */}
        <div className="animate-[fadeInUp_0.6s_ease-out_both]" style={{ animationDelay: '0ms' }}>
          <Logo size="lg" />
        </div>

        {/* Tagline */}
        <div
          className="flex flex-col gap-[var(--sp-3)] animate-[fadeInUp_0.6s_ease-out_both]"
          style={{ animationDelay: '150ms' }}
        >
          <h1
            className="font-heading text-4xl font-bold leading-tight tracking-tight md:text-5xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Predict right. Prove it.{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-hover) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Bragg.
            </span>
          </h1>
          <p className="mx-auto max-w-[40ch] text-lg" style={{ color: 'var(--text-secondary)' }}>
            The IPL prediction game for bragging rights. Rally your squad, lock in your picks, and
            own the leaderboard.
          </p>
        </div>

        {/* CTAs */}
        <div
          className="flex flex-col items-center gap-[var(--sp-3)] sm:flex-row animate-[fadeInUp_0.6s_ease-out_both]"
          style={{ animationDelay: '300ms' }}
        >
          <Link
            href="/login?redirectTo=/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-[var(--radius-ds-md)] bg-[var(--brand)] px-6 font-semibold text-[var(--brand-on)] transition-all hover:bg-[var(--brand-hover)] active:scale-[0.97]"
          >
            Start Your Gang
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-[var(--radius-ds-md)] border border-[var(--border-strong)] bg-transparent px-6 font-semibold text-[var(--text-primary)] transition-all hover:bg-[var(--bg-overlay)] active:scale-[0.97]"
          >
            Got an Invite?
          </Link>
        </div>
      </div>
    </section>
  )
}
