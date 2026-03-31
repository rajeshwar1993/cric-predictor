"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithMagicLink } from "@/lib/actions/auth";
import { Mail, Loader2, ArrowLeft } from "lucide-react";

type FormState = "input" | "sent" | "error";

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || undefined;
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>(authError ? "error" : "input");
  const [errorMessage, setErrorMessage] = useState(
    authError === "auth_callback_failed"
      ? "That link's expired. Let's get you a fresh one."
      : ""
  );
  const [loading, setLoading] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<number>(0);

  const canResend = Date.now() - lastSentAt > 60_000;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (!email.includes("@")) {
      setErrorMessage("Please enter a valid email address");
      setState("error");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const result = await signInWithMagicLink(email, redirectTo);

    setLoading(false);

    if (result.success) {
      setState("sent");
      setLastSentAt(Date.now());
    } else {
      setErrorMessage(result.error || "Couldn't send that — try again");
      setState("error");
    }
  }

  async function handleResend() {
    if (!canResend || loading) return;
    setLoading(true);

    const result = await signInWithMagicLink(email, redirectTo);

    setLoading(false);

    if (result.success) {
      setLastSentAt(Date.now());
    } else {
      setErrorMessage(result.error || "Couldn't resend — try again");
    }
  }

  if (state === "sent") {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--cta-from)]/10">
          <Mail className="h-7 w-7 text-[var(--cta-from)]" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
            Magic link sent!
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            We just fired a link to{" "}
            <span className="font-medium text-[var(--text-primary)]">
              {email}
            </span>
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Tap the link in your inbox to get in. Expires in 1 hour.
          </p>
        </div>
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend || loading}
            className={`inline-flex w-full items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
              !canResend || loading
                ? "cursor-not-allowed border-transparent bg-[var(--bg-elevated)]/50 text-[var(--text-muted)] opacity-50"
                : "border-[var(--ghost-border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            }`}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {canResend ? "Send another" : "Hold on — resend in 1 min"}
          </button>
          <button
            className="mx-auto flex items-center justify-center gap-1 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
            onClick={() => setState("input")}
          >
            <ArrowLeft className="h-3 w-3" />
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label
          htmlFor="email"
          className="text-sm font-medium text-[var(--text-secondary)]"
        >
          Email Address
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") setState("input");
          }}
          className="h-10 border-[var(--ghost-border)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)]"
          required
          autoComplete="email"
          autoFocus
        />
      </div>

      {state === "error" && errorMessage && (
        <p
          className="text-sm text-[var(--danger)]"
          role="alert"
          aria-live="polite"
        >
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !email}
        className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 font-display text-sm font-semibold transition-all ${
          loading || !email
            ? "cursor-not-allowed bg-[var(--bg-elevated)] text-[var(--text-muted)] opacity-50"
            : "cta-gradient btn-glow text-[var(--bg-deep)] hover:scale-[1.01] active:scale-[0.99]"
        }`}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Mail className="mr-2 h-4 w-4" />
        )}
        Send Magic Link
      </button>

      <p className="text-center text-xs text-[var(--text-muted)]">
        No passwords. Just a quick magic link to your inbox.
      </p>
    </form>
  );
}
