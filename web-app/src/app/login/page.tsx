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
    <main className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-[400px] space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-block">
            <Image src="/logo.png" alt="Bragg" width={64} height={64} className="mx-auto mb-3 rounded-lg" placeholder="empty" />
            <h1 className="font-display text-4xl font-bold text-gradient">
              Bragg
            </h1>
          </Link>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Call it. Prove it. Bragg.
          </p>
        </div>

        {/* Glass card */}
        <div className="rounded-[20px] border border-[var(--border-light)] bg-[var(--bg-card)] p-8 shadow-lg">
          <h2 className="mb-6 text-center font-display text-lg font-semibold text-[var(--text-primary)]">
            Get in the game
          </h2>
          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>
        </div>

        {/* Footer */}
        <p className="text-center text-xs leading-relaxed text-[var(--text-muted)]">
          Not affiliated with BCCI, IPL, or any franchise.
          Bragg is a free prediction game for entertainment only &mdash; no real
          money, no gambling, no betting. We do not encourage or support
          gambling in any form.
        </p>
      </div>
    </main>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-24 rounded bg-[var(--bg-elevated)]" />
        <div className="h-10 rounded-[10px] bg-[var(--bg-input)]" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-28 rounded bg-[var(--bg-elevated)]" />
        <div className="h-10 rounded-[10px] bg-[var(--bg-input)]" />
      </div>
      <div className="h-10 rounded-[10px] bg-[var(--bg-elevated)]" />
    </div>
  );
}
