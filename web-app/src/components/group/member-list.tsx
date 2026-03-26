import { Crown, Shield, User } from "lucide-react";
import type { GroupMember, MemberRole } from "@/types";

const ROLE_ICONS: Record<MemberRole, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  member: User,
};

const ROLE_COLORS: Record<MemberRole, string> = {
  owner: "var(--gold)",
  admin: "var(--cyan)",
  member: "var(--text-muted)",
};

interface MemberListProps {
  members: GroupMember[];
}

export function MemberList({ members }: MemberListProps) {
  return (
    <div className="divide-y divide-[var(--border-subtle)] rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-card)]">
      {members.map((member) => {
        const Icon = ROLE_ICONS[member.role] || User;
        const color = ROLE_COLORS[member.role] || "var(--text-muted)";

        return (
          <div
            key={member.user_id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-display font-semibold"
                style={{
                  backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
                  color,
                }}
              >
                {member.profile?.display_name?.charAt(0).toUpperCase() || "?"}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {member.profile?.display_name || "Unknown"}
                </p>
                <p className="text-xs text-[var(--text-muted)] capitalize">
                  {member.role}
                </p>
              </div>
            </div>
            <span
              className="flex items-center gap-1 text-[10px] font-display font-semibold uppercase tracking-wider"
              style={{ color }}
            >
              <Icon className="h-3 w-3" />
              {member.role}
            </span>
          </div>
        );
      })}
    </div>
  );
}
