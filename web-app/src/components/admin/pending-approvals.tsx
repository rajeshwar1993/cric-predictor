"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { manageMember } from "@/lib/actions/groups";
import { Check, X, Loader2 } from "lucide-react";
import type { GroupMember } from "@/types";

interface PendingApprovalsProps {
  groupId: string;
  requests: GroupMember[];
}

export function PendingApprovals({ groupId, requests }: PendingApprovalsProps) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <PendingCard
          key={req.user_id}
          groupId={groupId}
          request={req}
          onAction={() => router.refresh()}
        />
      ))}
    </div>
  );
}

function PendingCard({
  groupId,
  request,
  onAction,
}: {
  groupId: string;
  request: GroupMember;
  onAction: () => void;
}) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  async function handleAction(action: "approve" | "reject") {
    setLoading(action);
    await manageMember(groupId, request.user_id, action);
    onAction();
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-card)] px-4 py-3">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {request.profile?.display_name || "Unknown"}
        </p>
        <p className="text-xs text-[var(--text-muted)] truncate">
          {request.profile?.email}
        </p>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <Button
          size="sm"
          onClick={() => handleAction("approve")}
          disabled={loading !== null}
          className="bg-[var(--success)] text-[var(--bg-deep)] hover:opacity-90 h-10 sm:h-8 px-3 text-xs font-display font-semibold"
        >
          {loading === "approve" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction("reject")}
          disabled={loading !== null}
          className="border-[var(--danger)] text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] h-10 sm:h-8 px-3 text-xs font-display font-semibold"
        >
          {loading === "reject" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <X className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
}
