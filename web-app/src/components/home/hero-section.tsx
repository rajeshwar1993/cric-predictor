import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronDown } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4">
      {/* Stadium floodlight glows */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-[15%] -top-[20%] h-[60vh] w-[50vw] rounded-full bg-[var(--cta-from)]/[0.06] blur-[120px]" />
        <div className="absolute -bottom-[15%] -right-[10%] h-[50vh] w-[45vw] rounded-full bg-[var(--cta-from)]/[0.04] blur-[140px]" />
        <div className="absolute right-[10%] top-[20%] h-[30vh] w-[20vw] rounded-full bg-[var(--tertiary)]/[0.03] blur-[100px]" />

        {/* Diagonal energy lines */}
        <div className="absolute left-0 top-[38%] h-px w-full -rotate-[4deg] bg-gradient-to-r from-transparent via-[var(--cta-from)]/15 to-transparent" />
        <div className="absolute left-0 top-[62%] h-px w-full rotate-[3deg] bg-gradient-to-r from-transparent via-[var(--cta-from)]/8 to-transparent" />
      </div>

      {/* Grain overlay */}
      <div className="grain pointer-events-none absolute inset-0" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <Image
          src="/logo.png"
          alt="Bragg"
          width={80}
          height={80}
          className="animate-fade-in mb-6 rounded-xl"
          priority
          placeholder="empty"
        />

        <h1 className="animate-fade-in-up font-display text-7xl font-extrabold tracking-tighter text-gradient sm:text-8xl lg:text-9xl">
          Bragg
        </h1>

        <p
          className="animate-fade-in-up mt-5 max-w-lg text-xl leading-relaxed text-[var(--text-secondary)] sm:text-2xl"
          style={{ animationDelay: "150ms" }}
        >
          Think you know cricket?{" "}
          <span className="font-semibold text-[var(--text-primary)]">
            Prove it.
          </span>
        </p>

        <p
          className="animate-fade-in-up mt-3 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]"
          style={{ animationDelay: "300ms" }}
        >
          The IPL prediction game for bragging rights. Form your squad, make
          your calls, own the leaderboard.
        </p>

        {/* CTAs */}
        <div
          className="animate-fade-in-up mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4"
          style={{ animationDelay: "450ms" }}
        >
          <Link
            href="/login?redirectTo=/dashboard"
            className="btn-glow group inline-flex items-center gap-2 rounded-xl cta-gradient px-8 py-3.5 font-display text-sm font-bold text-[var(--bg-deep)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Start Your Squad
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--ghost-border)] bg-[var(--bg-card)]/40 px-8 py-3.5 font-display text-sm font-semibold text-[var(--text-secondary)] backdrop-blur transition-all hover:border-[var(--border-focus)] hover:bg-[var(--bg-card)]/70 hover:text-[var(--text-primary)]"
          >
            Got an Invite?
          </Link>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 animate-bounce text-[var(--text-muted)]">
        <ChevronDown className="h-5 w-5" />
      </div>
    </section>
  );
}
