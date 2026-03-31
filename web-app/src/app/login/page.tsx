import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to Bragg with a magic link — no password needed.",
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4">
      {/* Stadium floodlight glows */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-[20%] -top-[30%] h-[50vh] w-[40vw] rounded-full bg-[var(--cta-from)]/[0.05] blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[15%] h-[40vh] w-[35vw] rounded-full bg-[var(--cta-from)]/[0.03] blur-[140px]" />
      </div>

      {/* Grain overlay */}
      <div
        className="grain pointer-events-none absolute inset-0"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-[400px] space-y-8">
        {/* Logo */}
        <div className="animate-fade-in-up text-center">
          <Link href="/" className="inline-block">
            <Image
              src="/logo.png"
              alt="Bragg"
              width={64}
              height={64}
              className="mx-auto mb-3 rounded-xl"
              placeholder="empty"
            />
            <h1 className="font-display text-4xl font-bold text-gradient">
              Bragg
            </h1>
          </Link>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Call it. Prove it. Bragg.
          </p>
        </div>

        {/* Card */}
        <div
          className="animate-fade-in-up rounded-2xl border border-[var(--ghost-border)] bg-[var(--bg-card)] p-8"
          style={{ animationDelay: "150ms" }}
        >
          <h2 className="mb-6 text-center font-display text-lg font-semibold text-[var(--text-primary)]">
            Get in the game
          </h2>
          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>
        </div>

        {/* Disclaimer */}
        <p
          className="animate-fade-in-up text-center text-xs leading-relaxed text-[var(--text-muted)]"
          style={{ animationDelay: "300ms" }}
        >
          Not affiliated with BCCI, IPL, or any franchise. Bragg is a free
          prediction game for entertainment only &mdash; no real money, no
          gambling, no betting. We do not encourage or support gambling in any
          form.
        </p>
      </div>
    </main>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="space-y-2">
        <div className="h-4 w-24 rounded-md bg-[var(--bg-elevated)]" />
        <div className="h-10 rounded-xl bg-[var(--bg-input)]" />
      </div>
      <div className="h-10 rounded-xl bg-[var(--bg-elevated)]" />
    </div>
  );
}
