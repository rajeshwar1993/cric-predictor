import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="relative flex flex-col items-center px-4 py-24 text-center">
      <h2 className="font-display text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
        Ready to back yourself?
      </h2>
      <p className="mt-3 font-display text-sm tracking-wide text-[var(--text-muted)]">
        Call it. Prove it. Bragg.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
        <Link
          href="/login?redirectTo=/dashboard"
          className="btn-glow group inline-flex items-center gap-2 rounded-lg cta-gradient px-8 py-3.5 font-display text-sm font-bold text-[var(--bg-deep)] transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Start Your Squad
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--ghost-border)] bg-[var(--bg-card)]/40 px-8 py-3.5 font-display text-sm font-semibold text-[var(--text-secondary)] backdrop-blur transition-all hover:border-[var(--border-focus)] hover:bg-[var(--bg-card)]/70 hover:text-[var(--text-primary)]"
        >
          Got an Invite?
        </Link>
      </div>
    </section>
  );
}
