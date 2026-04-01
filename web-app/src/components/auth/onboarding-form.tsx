"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeOnboarding } from "@/lib/actions/onboarding";
import { Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

export function OnboardingForm() {
  const [displayName, setDisplayName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Client-side age check for instant feedback
  function getAgeError(): string | null {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return "Please enter a valid date";
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    if (age < 18) return "You must be 18 or older to use Bragg";
    if (age > 120) return "Please enter a valid date of birth";
    return null;
  }

  const ageError = getAgeError();
  const canSubmit =
    displayName.trim().length >= 2 &&
    dateOfBirth &&
    !ageError &&
    acceptedTerms &&
    !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");

    const result = await completeOnboarding(
      displayName.trim(),
      dateOfBirth,
      acceptedTerms
    );

    // If successful, the action redirects — we only reach here on error
    if (!result.success) {
      setError(result.error || "Something went wrong");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Display Name */}
      <div className="space-y-2">
        <Label htmlFor="displayName" className="text-sm font-medium text-[var(--text-secondary)]">
          Display Name
        </Label>
        <Input
          id="displayName"
          type="text"
          placeholder="How should we call you?"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="bg-[var(--bg-input)] border-[var(--ghost-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          minLength={2}
          maxLength={30}
          required
          autoFocus
        />
        <p className="text-xs text-[var(--text-muted)]">
          2-30 characters. This is how you show up on the leaderboard.
        </p>
      </div>

      {/* Date of Birth */}
      <div className="space-y-2">
        <Label htmlFor="dob" className="text-sm font-medium text-[var(--text-secondary)]">
          Date of Birth
        </Label>
        <Input
          id="dob"
          type="date"
          value={dateOfBirth}
          onChange={(e) => {
            setDateOfBirth(e.target.value);
            setError("");
          }}
          className="bg-[var(--bg-input)] border-[var(--ghost-border)] text-[var(--text-primary)]"
          required
          max={new Date().toISOString().split("T")[0]}
        />
        {ageError && (
          <p className="text-xs text-[var(--danger)]" role="alert">
            {ageError}
          </p>
        )}
        <p className="text-xs text-[var(--text-muted)]">
          You must be 18 or older to use Bragg.
        </p>
      </div>

      {/* Terms & Conditions */}
      <div className="space-y-2">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => {
              setAcceptedTerms(e.target.checked);
              setError("");
            }}
            className="mt-0.5 h-4 w-4 rounded border-[var(--ghost-border)] bg-[var(--bg-input)] accent-[var(--cyan)]"
          />
          <span className="text-sm text-[var(--text-secondary)]">
            I agree to the{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="text-[var(--cyan)] underline hover:opacity-80"
            >
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link
              href="/terms"
              target="_blank"
              className="text-[var(--cyan)] underline hover:opacity-80"
            >
              Terms of Service
            </Link>
          </span>
        </label>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-[var(--danger)]" role="alert" aria-live="polite">
          {error}
        </p>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={!canSubmit}
        className="w-full font-display font-semibold text-sm cta-gradient btn-glow text-[var(--bg-deep)] hover:opacity-90"
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight className="mr-2 h-4 w-4" />
        )}
        Continue to Bragg
      </Button>
    </form>
  );
}
