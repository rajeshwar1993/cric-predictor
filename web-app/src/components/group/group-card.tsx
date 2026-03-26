import Link from "next/link";
import { Users, Crown, Shield, User } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import type { GroupWithMeta, MemberRole } from "@/types";

const ROLE_CONFIG: Record<MemberRole, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: "Owner", icon: Crown, color: "var(--gold)" },
  admin: { label: "Admin", icon: Shield, color: "var(--cyan)" },
  member: { label: "Member", icon: User, color: "var(--text-muted)" },
};

interface GroupCardProps {
  group: GroupWithMeta;
}

export function GroupCard({ group }: GroupCardProps) {
  const role = ROLE_CONFIG[group.user_role];
  const RoleIcon = role.icon;

  return (
    <Link
      href={ROUTES.GROUP(group.id)}
      className="group block rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-card)] p-5 transition-all hover:border-[var(--border-medium)] hover:bg-[var(--bg-hover)]"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--cyan)] transition-colors">
            {group.name}
          </h3>
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {group.member_count} {group.member_count === 1 ? "member" : "members"}
            </span>
          </div>
        </div>
        <span
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-display font-semibold uppercase tracking-wider"
          style={{
            color: role.color,
            backgroundColor: `color-mix(in srgb, ${role.color} 10%, transparent)`,
          }}
        >
          <RoleIcon className="h-3 w-3" />
          {role.label}
        </span>
      </div>
    </Link>
  );
}
