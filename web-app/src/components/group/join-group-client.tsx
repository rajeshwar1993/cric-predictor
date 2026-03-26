"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { joinGroup } from "@/lib/actions/groups";
import { ROUTES } from "@/lib/constants";
import { Loader2, UserPlus, Clock, XCircle } from "lucide-react";
import type { MemberStatus } from "@/types";

interface JoinGroupClientProps {
  groupId: string;
  groupName: string;
  inviteCode: string;
  currentStatus: MemberStatus | null;
}

export function JoinGroupClient({
  groupId,
  groupName,
  inviteCode,
  currentStatus,
}: JoinGroupClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<MemberStatus | null>(currentStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin() {
    setLoading(true);
    setError("");

    const result = await joinGroup(inviteCode);

    if (result.success) {
      setStatus("pending");
    } else {
      setError(result.error || "Failed to submit request");
    }
    setLoading(false);
  }

  if (status === "pending") {
    return (
      <div className="rounded-[20px] border border-[var(--border-light)] bg-[var(--bg-card)] p-8 space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--gold-soft)]">
          <Clock className="h-7 w-7 text-[var(--gold)]" />
        </div>
        <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
          Waiting for approval
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Your request to join <span className="font-medium">{groupName}</span> has been sent.
          An admin will review it shortly.
        </p>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="rounded-[20px] border border-[var(--border-light)] bg-[var(--bg-card)] p-8 space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]">
          <XCircle className="h-7 w-7 text-[var(--danger)]" />
        </div>
        <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
          Request not approved
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Your request to join was not approved.
        </p>
        <Button
          onClick={handleJoin}
          disabled={loading}
          variant="outline"
          className="border-[var(--border-medium)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Request Again
        </Button>
      </div>
    );
  }

  // No membership — show join button
  return (
    <div className="rounded-[20px] border border-[var(--border-light)] bg-[var(--bg-card)] p-8 space-y-4">
      <p className="text-sm text-[var(--text-secondary)]">
        Join to predict IPL match outcomes with this group and earn bragging rights.
      </p>
      {error && (
        <p className="text-sm text-[var(--danger)]" role="alert">{error}</p>
      )}
      <Button
        onClick={handleJoin}
        disabled={loading}
        className="w-full font-display font-semibold text-sm bg-gradient-to-br from-[var(--cyan)] to-[color-mix(in_srgb,var(--cyan),#000_20%)] text-[var(--bg-deep)] hover:opacity-90 btn-glow"
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" />
        )}
        Request to Join
      </Button>
    </div>
  );
}
