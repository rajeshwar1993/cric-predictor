"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinGroup } from "@/lib/actions/groups";
import { Loader2, UserPlus } from "lucide-react";

export function JoinGroupForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (loading || !trimmed) return;

    setLoading(true);
    setError("");

    const result = await joinGroup(trimmed);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || "Failed to join group");
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="text-center space-y-2 py-2">
        <p className="text-sm font-medium text-[var(--success)]">
          You&apos;re in the queue!
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Admin will let you in shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          placeholder="Paste invite code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (error) setError("");
          }}
          className="flex-1 bg-[var(--bg-input)] border-[var(--border-medium)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
        <Button
          type="submit"
          disabled={loading || !code.trim()}
          variant="outline"
          className="border-[var(--cyan)] text-[var(--cyan)] hover:bg-[var(--cyan-soft)] font-display font-semibold text-sm shrink-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
        </Button>
      </form>
      {error && (
        <p className="text-xs text-[var(--danger)]" role="alert">{error}</p>
      )}
    </div>
  );
}
