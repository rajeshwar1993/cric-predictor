import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/get-user-cached";
import * as groupsDal from "@/lib/dal/groups";
import * as membersDal from "@/lib/dal/members";
import * as matchesDal from "@/lib/dal/matches";
import * as predictionsDal from "@/lib/dal/predictions";
import { InviteLink } from "@/components/group/invite-link";
import { MemberList } from "@/components/group/member-list";
import { Users, Calendar } from "lucide-react";
import Link from "next/link";
import { LIMITS } from "@/lib/constants";
import { ROUTES } from "@/lib/constants";
import { formatMatchDate, formatMatchTime, computeDeadline } from "@/lib/utils";
import { MatchScorecard } from "@/components/match/match-scorecard";

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

  const [group, members, membership, upcomingMatches] = await Promise.all([
    groupsDal.getGroupById(groupId),
    membersDal.getMembers(groupId),
    membersDal.getMembershipStatus(groupId, user.id),
    matchesDal.getUpcomingMatches(3),
  ]);

  if (!group) notFound();

  const isAdmin = membership?.role === "owner" || membership?.role === "admin";
  const currentMember = members.find((m: any) => m.user_id === user.id);
  const currentUserDisplayName = currentMember?.profile?.display_name ?? "Someone";

  const pendingRequests = isAdmin ? await membersDal.getPendingRequests(groupId) : [];
  const pendingCount = pendingRequests.length;

  // Get prediction status for first match
  const predictedUserIds = upcomingMatches.length > 0
    ? await predictionsDal.getMembersWhoPredicted(groupId, upcomingMatches[0].id)
    : [];

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

      {/* Matches (upcoming + live) */}
      {upcomingMatches.length > 0 ? (
        <div className="space-y-4">
          {upcomingMatches.map((match, index) => {
            const isLive = match.status === "live";
            const deadline = computeDeadline(match.date, match.time_ist);
            const deadlineStr = deadline.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }) + " IST";
            const isPrimary = index === 0;

            return (
              <div key={match.id} className={`rounded-xl ${isLive ? "bg-card-gradient ring-1 ring-[var(--success)]/30" : "bg-card-gradient"} p-5 ${isPrimary ? "" : "opacity-80"}`}>
                <div className="flex items-center gap-2 text-xs font-display font-semibold uppercase tracking-wider">
                  {isLive ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
                      </span>
                      <span className="text-[var(--success)]">Live</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      <span className="text-[var(--text-muted)]">{isPrimary ? "Next Match" : `Match ${match.match_number}`}</span>
                    </>
                  )}
                </div>
                <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    {isLive ? (
                      <MatchScorecard
                        compact
                        teamA={match.team_a}
                        teamB={match.team_b}
                        scoreA={match.current_score_a}
                        scoreB={match.current_score_b}
                        oversA={match.current_overs_a}
                        oversB={match.current_overs_b}
                        battingTeam={match.current_batting_team}
                        tossWinner={match.toss_winner}
                        matchWinner={match.match_winner}
                        statusInfo={null}
                        status={match.status}
                      />
                    ) : (
                      <>
                        <p className="font-display text-lg font-bold text-[var(--text-primary)]">
                          {match.team_a} vs {match.team_b}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          Match {match.match_number} · {formatMatchDate(match.date)} · {formatMatchTime(match.time_ist)} · {match.venue}
                        </p>
                      </>
                    )}
                  </div>
                  {isLive ? (
                    <Link
                      href={ROUTES.MATCH_LEADERBOARD(groupId, match.id)}
                      className="w-full sm:w-auto text-center rounded-xl px-5 py-2.5 font-display text-sm font-semibold bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20 transition-colors"
                    >
                      View Leaderboard
                    </Link>
                  ) : (
                    <Link
                      href={ROUTES.PREDICT(groupId, match.id)}
                      className={`w-full sm:w-auto text-center rounded-xl px-5 py-2.5 font-display text-sm font-semibold transition-opacity ${
                        isPrimary
                          ? "cta-gradient text-[var(--text-inverse)] hover:opacity-90"
                          : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                      }`}
                    >
                      {isPrimary ? "Make Your Calls" : "Predict Early"}
                    </Link>
                  )}
                </div>

                {/* Deadline or live status */}
                {isLive ? (
                  <p className="mt-3 text-xs text-[var(--success)]">
                    Match is live — predictions are locked
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-[var(--danger)]">
                    Predictions close at {deadlineStr}
                  </p>
                )}

                {/* Prediction status — only for primary match */}
                {isPrimary && predictedUserIds.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {members.map((m) => {
                      const hasPredicted = predictedUserIds.includes(m.user_id);
                      return (
                        <div
                          key={m.user_id}
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-display ${
                            hasPredicted
                              ? "bg-[var(--cyan-soft)] text-[var(--cyan)]"
                              : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                          }`}
                        >
                          {hasPredicted ? "\u2713" : "\u00b7"} {m.profile?.display_name?.split(" ")[0] || "?"}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl bg-[var(--bg-card)] p-8 text-center">
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
