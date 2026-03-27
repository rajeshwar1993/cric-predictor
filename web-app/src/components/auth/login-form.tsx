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
      <div className="text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--cyan-soft)]">
          <Mail className="h-8 w-8 text-[var(--cyan)]" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
            Magic link sent!
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            We just fired a link to{" "}
            <span className="font-medium text-[var(--text-primary)]">{email}</span>
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
            className={`w-full inline-flex items-center justify-center rounded-[10px] border px-4 py-2.5 text-sm font-medium transition-all ${
              !canResend || loading
                ? "opacity-50 cursor-not-allowed border-[var(--border-subtle)] text-[var(--text-muted)]"
                : "border-[var(--border-medium)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            }`}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {canResend ? "Send another" : "Hold on — resend in 1 min"}
          </button>
          <button
            className="flex items-center justify-center gap-1 mx-auto text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
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
          className="bg-[var(--bg-input)] border-[var(--border-medium)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:ring-[var(--border-focus)]"
          required
          autoComplete="email"
          autoFocus
        />
      </div>

      {(state === "error" && errorMessage) && (
        <p className="text-sm text-[var(--danger)]" role="alert" aria-live="polite">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !email}
        className={`w-full inline-flex items-center justify-center rounded-[10px] px-4 py-2.5 font-display font-semibold text-sm transition-all ${
          loading || !email
            ? "opacity-50 cursor-not-allowed bg-[var(--bg-elevated)] text-[var(--text-muted)]"
            : "bg-gradient-to-br from-[var(--cyan)] to-[color-mix(in_srgb,var(--cyan),#000_20%)] text-[var(--bg-deep)] hover:opacity-90 btn-glow"
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
