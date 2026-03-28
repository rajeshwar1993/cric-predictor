"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { manageMember } from "@/lib/actions/groups";
import { Crown, Shield, User, Loader2 } from "lucide-react";
import type { GroupMember, MemberRole } from "@/types";

interface AdminMemberListProps {
  groupId: string;
  members: GroupMember[];
  callerRole: MemberRole;
  callerId: string;
}

export function AdminMemberList({
  groupId,
  members,
  callerRole,
  callerId,
}: AdminMemberListProps) {
  const router = useRouter();

  return (
    <div className="divide-y divide-[var(--border-subtle)] rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-card)]">
      {members.map((member) => (
        <AdminMemberRow
          key={member.user_id}
          groupId={groupId}
          member={member}
          callerRole={callerRole}
          isSelf={member.user_id === callerId}
          onAction={() => router.refresh()}
        />
      ))}
    </div>
  );
}

const ROLE_ICONS: Record<MemberRole, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  member: User,
};

function AdminMemberRow({
  groupId,
  member,
  callerRole,
  isSelf,
  onAction,
}: {
  groupId: string;
  member: GroupMember;
  callerRole: MemberRole;
  isSelf: boolean;
  onAction: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const Icon = ROLE_ICONS[member.role] || User;

  const isOwnerCaller = callerRole === "owner";
  const canPromote = isOwnerCaller && member.role === "member" && !isSelf;
  const canDemote = isOwnerCaller && member.role === "admin" && !isSelf;
  const canRemove = !isSelf && member.role !== "owner";

  async function handleAction(action: "promote" | "demote" | "remove") {
    setLoading(true);
    await manageMember(groupId, member.user_id, action);
    onAction();
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon
          className="h-4 w-4"
          style={{
            color:
              member.role === "owner"
                ? "var(--gold)"
                : member.role === "admin"
                ? "var(--cyan)"
                : "var(--text-muted)",
          }}
        />
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {member.profile?.display_name || "Unknown"}
            {isSelf && (
              <span className="ml-1.5 text-xs text-[var(--text-muted)]">(you)</span>
            )}
          </p>
          <p className="text-xs text-[var(--text-muted)]">{member.role}</p>
        </div>
      </div>

      {!isSelf && member.role !== "owner" && (
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {canPromote && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction("promote")}
              disabled={loading}
              className="h-9 sm:h-7 px-2 text-[10px] font-display border-[var(--cyan)] text-[var(--cyan)] hover:bg-[var(--cyan-soft)]"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Promote"}
            </Button>
          )}
          {canDemote && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction("demote")}
              disabled={loading}
              className="h-9 sm:h-7 px-2 text-[10px] font-display border-[var(--border-medium)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Demote"}
            </Button>
          )}
          {canRemove && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction("remove")}
              disabled={loading}
              className="h-9 sm:h-7 px-2 text-[10px] font-display border-[var(--danger)] text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
