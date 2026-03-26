"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  const [displayName, setDisplayName] = useState("");
  const [state, setState] = useState<FormState>(authError ? "error" : "input");
  const [errorMessage, setErrorMessage] = useState(
    authError === "auth_callback_failed"
      ? "Magic link expired or invalid. Please try again."
      : ""
  );
  const [loading, setLoading] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<number>(0);

  const canResend = Date.now() - lastSentAt > 60_000;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    // Basic validation
    if (!email.includes("@")) {
      setErrorMessage("Please enter a valid email address");
      setState("error");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const result = await signInWithMagicLink(
      email,
      displayName || email.split("@")[0],
      redirectTo
    );

    setLoading(false);

    if (result.success) {
      setState("sent");
      setLastSentAt(Date.now());
    } else {
      setErrorMessage(result.error || "Something went wrong");
      setState("error");
    }
  }

  async function handleResend() {
    if (!canResend || loading) return;
    setLoading(true);

    const result = await signInWithMagicLink(
      email,
      displayName || email.split("@")[0],
      redirectTo
    );

    setLoading(false);

    if (result.success) {
      setLastSentAt(Date.now());
    } else {
      setErrorMessage(result.error || "Failed to resend");
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
            Check your email
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            We sent a magic link to{" "}
            <span className="font-medium text-[var(--text-primary)]">{email}</span>
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Click the link in the email to sign in. The link expires in 1 hour.
          </p>
        </div>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full border-[var(--border-medium)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            onClick={handleResend}
            disabled={!canResend || loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {canResend ? "Resend magic link" : "Resend available in 1 min"}
          </Button>
          <button
            className="flex items-center justify-center gap-1 mx-auto text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            onClick={() => setState("input")}
          >
            <ArrowLeft className="h-3 w-3" />
            Try a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label
          htmlFor="displayName"
          className="text-sm font-medium text-[var(--text-secondary)]"
        >
          Display Name
        </Label>
        <Input
          id="displayName"
          type="text"
          placeholder="What should we call you?"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="bg-[var(--bg-input)] border-[var(--border-medium)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:ring-[var(--border-focus)]"
          minLength={2}
          maxLength={50}
          autoComplete="name"
        />
        <p className="text-xs text-[var(--text-muted)]">
          Shown on leaderboards. You can skip this for returning users.
        </p>
      </div>

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
        <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
      )}

      <Button
        type="submit"
        disabled={loading || !email}
        className="w-full font-display font-semibold text-sm bg-gradient-to-r from-[var(--cyan)] to-[#00B8D4] text-[var(--bg-deep)] hover:opacity-90 shadow-[var(--cyan-glow)]"
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Mail className="mr-2 h-4 w-4" />
        )}
        Send Magic Link
      </Button>

      <p className="text-center text-xs text-[var(--text-muted)]">
        No password needed. We&apos;ll email you a sign-in link.
      </p>
    </form>
  );
}
