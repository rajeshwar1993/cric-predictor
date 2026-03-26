import Link from "next/link";
import { Footer } from "@/components/layout/footer";
import { Zap, Users, Trophy, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center bg-gradient-to-b from-[var(--bg-primary)] to-[var(--bg-deep)]">
        <h1 className="font-display text-6xl font-bold tracking-tight text-gradient sm:text-7xl">
          Bragg
        </h1>
        <p className="mt-4 max-w-md font-body text-lg text-[var(--text-secondary)]">
          The social cricket prediction game. Predict IPL match outcomes with
          friends and earn bragging rights.
        </p>
        <p className="mt-2 font-display text-sm font-medium tracking-wide text-[var(--text-muted)]">
          Predict. Compete. Bragg.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/login?redirectTo=/dashboard"
            className="inline-flex items-center gap-2 rounded-[10px] bg-gradient-to-br from-[var(--cyan)] to-[color-mix(in_srgb,var(--cyan),#000_20%)] px-7 py-3 font-display text-sm font-semibold text-[var(--bg-deep)] btn-glow hover:opacity-90 transition-opacity"
          >
            Create a Group
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border-medium)] bg-[var(--bg-card)]/50 px-7 py-3 font-display text-sm font-semibold text-[var(--text-secondary)] backdrop-blur hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
          >
            Join with Code
          </Link>
        </div>

        {/* How it works */}
        <div className="mt-20 grid w-full max-w-[720px] gap-4 sm:grid-cols-3">
          {[
            {
              icon: Users,
              step: "1",
              title: "Create a Group",
              desc: "Start a prediction group and invite your cricket crew via link or code.",
            },
            {
              icon: Zap,
              step: "2",
              title: "Predict Matches",
              desc: "16 scenarios per match — from toss winner to total sixes. Pick your calls.",
            },
            {
              icon: Trophy,
              step: "3",
              title: "Climb the Board",
              desc: "Points are awarded as scenarios resolve live. Top the leaderboard and bragg.",
            },
          ].map(({ icon: Icon, step, title, desc }) => (
            <div
              key={step}
              className="rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-card)]/60 p-6 backdrop-blur text-left"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--cyan-soft)] font-stats text-sm font-bold text-[var(--cyan)]">
                  {step}
                </span>
                <Icon className="h-5 w-5 text-[var(--cyan)]" />
              </div>
              <h3 className="mt-4 font-display text-sm font-semibold text-[var(--text-primary)]">
                {title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
