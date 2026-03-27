import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/get-user-cached";
import * as groupsDal from "@/lib/dal/groups";
import * as membersDal from "@/lib/dal/members";
import * as matchesDal from "@/lib/dal/matches";
import { InviteLink } from "@/components/group/invite-link";
import { MemberList } from "@/components/group/member-list";
import { Users, Calendar } from "lucide-react";
import Link from "next/link";
import { LIMITS } from "@/lib/constants";
import { ROUTES } from "@/lib/constants";
import { formatMatchDate, formatMatchTime } from "@/lib/utils";

interface GroupPageProps {
  params: Promise<{ groupId: string }>;
}

export async function generateMetadata({ params }: GroupPageProps): Promise<Metadata> {
  const { groupId } = await params;
  const group = await groupsDal.getGroupById(groupId);
  return { title: group?.name || "Group" };
}

export default async function GroupHomePage({ params }: GroupPageProps) {
  const { groupId } = await params;

  // Auth + membership already verified by layout.tsx
  // getAuthUser() is React.cache()-wrapped — no duplicate Supabase call
  const user = (await getAuthUser())!;

  const [group, members, membership, nextMatch] = await Promise.all([
    groupsDal.getGroupById(groupId),
    membersDal.getMembers(groupId),
    membersDal.getMembershipStatus(groupId, user.id),
    matchesDal.getNextMatch(),
  ]);

  if (!group) notFound();

  const isAdmin = membership?.role === "owner" || membership?.role === "admin";
  const currentMember = members.find((m: any) => m.user_id === user.id);
  const currentUserDisplayName = currentMember?.profile?.display_name ?? "Someone";

  const [pendingRequests, settings] = await Promise.all([
    isAdmin ? membersDal.getPendingRequests(groupId) : Promise.resolve([]),
    nextMatch ? matchesDal.getMatchGroupSettings(groupId, nextMatch.id) : Promise.resolve(null),
  ]);
  const pendingCount = pendingRequests.length;
  const scenariosPublished = settings?.scenarios_published ?? false;

  return (
    <div className="space-y-8">
      {/* Group header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            {group.name}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Users className="h-4 w-4" />
            {members.length}/{LIMITS.MAX_MEMBERS_PER_GROUP} in the squad
          </div>
        </div>
        <div className="flex items-center gap-3">
          <InviteLink
            inviteCode={group.invite_code}
            groupName={group.name}
            inviterName={currentUserDisplayName}
          />
          {isAdmin && (
            <Link
              href={ROUTES.ADMIN(groupId)}
              className="relative inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--border-medium)] px-3 py-2 text-sm font-display font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              Admin
              {pendingCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[9px] font-stats font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>

      {/* Next match card or empty state */}
      {nextMatch ? (
        <div className="rounded-[20px] border border-[var(--border-light)] bg-card-gradient p-6">
          <div className="flex items-center gap-2 text-xs font-display font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            <Calendar className="h-3.5 w-3.5" />
            Next Match
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="font-display text-lg font-bold text-[var(--text-primary)]">
                {nextMatch.team_a} vs {nextMatch.team_b}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Match {nextMatch.match_number} · {formatMatchDate(nextMatch.date)} · {formatMatchTime(nextMatch.time_ist)} · {nextMatch.venue}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link
                  href={ROUTES.SCENARIOS(groupId, nextMatch.id)}
                  className={`rounded-[10px] border px-4 py-2.5 font-display text-sm font-semibold transition-opacity ${
                    scenariosPublished
                      ? "border-[var(--border-medium)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                      : "border-[var(--gold)] bg-gradient-to-br from-[var(--gold)] to-[color-mix(in_srgb,var(--gold),#000_20%)] text-[var(--bg-deep)] hover:opacity-90"
                  }`}
                >
                  {scenariosPublished ? "Edit Scenarios" : "Set Up Scenarios"}
                </Link>
              )}
              {scenariosPublished ? (
                <Link
                  href={ROUTES.PREDICT(groupId, nextMatch.id)}
                  className="rounded-[10px] bg-gradient-to-br from-[var(--cyan)] to-[color-mix(in_srgb,var(--cyan),#000_20%)] px-5 py-2.5 font-display text-sm font-semibold text-[var(--bg-deep)] hover:opacity-90 btn-glow transition-opacity"
                >
                  Make Your Calls
                </Link>
              ) : !isAdmin ? (
                <span className="rounded-[10px] border border-[var(--border-medium)] px-5 py-2.5 font-display text-sm font-semibold text-[var(--text-muted)] cursor-not-allowed opacity-60">
                  Scenarios not published yet
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[20px] border border-[var(--border-light)] bg-[var(--bg-card)] p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">No matches on the horizon — sit tight</p>
        </div>
      )}

      {/* Member list */}
      <div>
        <h2 className="mb-4 font-display text-lg font-semibold text-[var(--text-primary)]">
          The Squad
        </h2>
        <MemberList members={members} />
      </div>
    </div>
  );
}
