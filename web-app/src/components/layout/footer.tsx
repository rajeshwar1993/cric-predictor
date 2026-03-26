import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[var(--border-subtle)] py-6">
      <div className="mx-auto max-w-[960px] px-4 text-center">
        <p className="text-xs text-[var(--text-muted)]">
          Not affiliated with BCCI, IPL, or any franchise.{" "}
          <Link href="/privacy" className="underline hover:text-[var(--text-secondary)]">
            Privacy
          </Link>
          {" · "}
          <Link href="/terms" className="underline hover:text-[var(--text-secondary)]">
            Terms
          </Link>
        </p>
      </div>
    </footer>
  );
}
