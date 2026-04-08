import Link from 'next/link'

export function CtaSection() {
  return (
    <section className="relative px-[var(--sp-5)] py-[var(--sp-16)]" aria-label="Get started">
      {/* Subtle glow behind the CTA */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <div
          className="h-[200px] w-[300px] rounded-full opacity-[0.05] blur-[80px]"
          style={{ background: 'var(--brand)' }}
        />
      </div>

      <div className="relative z-10 mx-auto flex max-w-[480px] flex-col items-center gap-[var(--sp-6)] text-center">
        <h2 className="font-heading text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Ready to prove you know cricket?
        </h2>
        <p className="max-w-[35ch] text-base" style={{ color: 'var(--text-secondary)' }}>
          IPL 2026 is here. Get your gang together and start calling the shots.
        </p>
        <div className="flex flex-col items-center gap-[var(--sp-3)] sm:flex-row">
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
