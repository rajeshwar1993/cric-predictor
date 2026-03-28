"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { joinGroup } from "@/lib/actions/groups";
import { UserPlus, X, Loader2 } from "lucide-react";

const STORAGE_KEY = "bragg_pending_invite";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface PendingInvite {
  code: string;
  groupName: string;
  storedAt: number;
}

/**
 * Shows a banner on the dashboard when the user has a pending invite
 * stored in localStorage (from visiting /join/[code] while logged out).
 */
export function PendingInviteBanner() {
  const router = useRouter();
  const [invite, setInvite] = useState<PendingInvite | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed: PendingInvite = JSON.parse(raw);

      // Expired — clear silently
      if (Date.now() - parsed.storedAt > MAX_AGE_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      setInvite(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  function handleDismiss() {
    localStorage.removeItem(STORAGE_KEY);
    setInvite(null);
  }

  async function handleJoin() {
    if (!invite || loading) return;

    setLoading(true);
    setError("");

    const result = await joinGroup(invite.code);

    if (result.success) {
      localStorage.removeItem(STORAGE_KEY);
      setSuccess(true);
      setTimeout(() => router.refresh(), 1000);
    } else {
      setError(result.error || "Couldn't join — try again");
      // If already a member or invalid code, clear the stored invite
      if (
        result.error?.includes("already a member") ||
        result.error?.includes("Invalid invite")
      ) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }

  if (!invite) return null;

  if (success) {
    return (
      <div className="rounded-xl bg-[var(--bg-card)] p-5 text-center">
        <p className="text-sm font-medium text-[var(--success)]">
          Request sent! Waiting for admin approval.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[var(--bg-card)] p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-display">
            You were invited to join
          </p>
          <p className="mt-1 font-display text-lg font-semibold text-[var(--text-primary)]">
            {invite.groupName}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <p className="text-xs text-[var(--danger)]" role="alert">{error}</p>
      )}

      <button
        onClick={handleJoin}
        disabled={loading}
        className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-display text-sm font-semibold transition-all ${
          loading
            ? "opacity-50 cursor-not-allowed bg-[var(--bg-elevated)] text-[var(--text-muted)]"
            : "cta-gradient text-[var(--text-inverse)] hover:opacity-90"
        }`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        Join Squad
      </button>
    </div>
  );
}
