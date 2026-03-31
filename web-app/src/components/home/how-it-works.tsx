import { Users, Zap, Trophy } from "lucide-react";

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

export function HowItWorks() {
  return (
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
  );
}
