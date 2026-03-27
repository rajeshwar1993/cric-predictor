import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="text-center space-y-4">
        <h1 className="font-display text-6xl font-bold text-gradient">404</h1>
        <p className="text-lg text-[var(--text-secondary)]">
          This page doesn&apos;t exist — or you don&apos;t have access.
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded-[10px] bg-gradient-to-br from-[var(--cyan)] to-[color-mix(in_srgb,var(--cyan),#000_20%)] px-5 py-2.5 font-display text-sm font-semibold text-[var(--bg-deep)] hover:opacity-90 transition-opacity"
        >
          Back to Dashboard
        </Link>
      </div>
    </main>
  );
}
