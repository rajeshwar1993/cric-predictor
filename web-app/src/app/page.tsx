import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/components/layout/footer";
import { Users, Zap, Trophy, ArrowRight, ChevronDown } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: Users,
    title: "Rally Your Squad",
    desc: "Create a squad, share the invite code. Up to 10 friends, one crew.",
  },
  {
    num: "02",
    icon: Zap,
    title: "Lock In Your Picks",
    desc: "16 predictions per match — toss, top scorer, sixes, the lot. Back yourself.",
  },
  {
    num: "03",
    icon: Trophy,
    title: "Own the Leaderboard",
    desc: "Points stack match after match. Rankings update live. Screenshot your spot at the top.",
  },
];

const scenarios = [
  { label: "Match Winner", points: 10, options: ["RCB", "CSK"] },
  { label: "Toss Winner", points: 5, options: ["RCB", "CSK"] },
  { label: "Top Scorer", points: 15, options: ["Kohli", "Gaikwad", "Faf", "..."] },
  { label: "First Innings Score", points: 10, options: ["<150", "150-169", "170-189", "190+"] },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* ===== HERO ===== */}
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
            className="animate-fade-in mb-6 rounded-2xl"
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
            className="animate-fade-in-up mt-3 max-w-md text-sm leading-relaxed text-[var(--text-muted)]"
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

      {/* ===== HOW IT WORKS ===== */}
      <section className="relative mx-auto w-full max-w-5xl px-4 py-24 sm:px-6">
        <div className="mb-12 text-center">
          <p className="font-stats text-xs font-medium uppercase tracking-[0.2em] text-[var(--cta-from)]">
            How It Works
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
            Three steps to bragging rights
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
          {steps.map(({ num, icon: Icon, title, desc }) => (
            <div
              key={num}
              className="group relative overflow-hidden rounded-2xl bg-[var(--bg-card)]/50 p-6 backdrop-blur transition-all hover:bg-[var(--bg-card)]/80 sm:p-8"
            >
              {/* Large background number */}
              <span className="pointer-events-none absolute -right-2 -top-4 select-none font-display text-[120px] font-extrabold leading-none text-[var(--cyan-soft)]">
                {num}
              </span>

              <div className="relative z-10">
                <div className="mb-5 inline-flex rounded-xl bg-[var(--cyan-soft)] p-3">
                  <Icon className="h-5 w-5 text-[var(--cyan)]" />
                </div>
                <h3 className="font-display text-lg font-bold text-[var(--text-primary)]">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== PREDICTION PREVIEW ===== */}
      <section className="relative mx-auto w-full max-w-5xl px-4 py-24 sm:px-6">
        <div className="mb-12 text-center">
          <p className="font-stats text-xs font-medium uppercase tracking-[0.2em] text-[var(--cta-from)]">
            Preview
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
            Your match. Your calls.
          </h2>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            16 scenarios per match. Pick your answers before the deadline.
          </p>
        </div>

        {/* Mock prediction card */}
        <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-[var(--ghost-border)] bg-[var(--bg-card)]/60 backdrop-blur">
          {/* Match header */}
          <div className="flex items-center justify-between border-b border-[var(--ghost-border)] px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-[var(--color-team-rcb)]" />
              <span className="font-display text-sm font-bold text-[var(--text-primary)]">
                RCB
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-stats text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                Match 1
              </span>
              <span className="font-display text-xs font-semibold text-[var(--text-secondary)]">
                vs
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-display text-sm font-bold text-[var(--text-primary)]">
                CSK
              </span>
              <span className="h-3 w-3 rounded-full bg-[var(--color-team-csk)]" />
            </div>
          </div>

          {/* Scenarios */}
          <div className="divide-y divide-[var(--ghost-border)]">
            {scenarios.map(({ label, points, options }) => (
              <div key={label} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {label}
                  </span>
                  <span className="font-stats text-xs text-[var(--cta-from)]">
                    {points} pts
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {options.map((opt, j) => (
                    <span
                      key={opt}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        j === 0
                          ? "bg-[var(--cta-from)]/15 text-[var(--cta-from)] ring-1 ring-inset ring-[var(--cta-from)]/30"
                          : "bg-[var(--bg-elevated)]/60 text-[var(--text-secondary)]"
                      }`}
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Card footer */}
          <div className="border-t border-[var(--ghost-border)] px-6 py-3">
            <p className="text-center font-stats text-xs text-[var(--text-muted)]">
              + 12 more scenarios
            </p>
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="relative border-y border-[var(--ghost-border)] py-16">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-10 px-4 sm:flex-row sm:gap-16">
          {[
            { num: "16", label: "scenarios per match" },
            { num: "10", label: "friends per squad" },
            { num: "\u221E", label: "bragging rights" },
          ].map(({ num, label }) => (
            <div key={label} className="text-center">
              <span className="font-display text-5xl font-extrabold text-gradient sm:text-6xl">
                {num}
              </span>
              <p className="mt-1 font-stats text-xs uppercase tracking-widest text-[var(--text-muted)]">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
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
      </section>

      <Footer />
    </div>
  );
}
