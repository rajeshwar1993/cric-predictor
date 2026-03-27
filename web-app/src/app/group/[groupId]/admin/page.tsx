import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import * as groupsDal from "@/lib/dal/groups";
import * as membersDal from "@/lib/dal/members";
import * as matchesDal from "@/lib/dal/matches";
import { PendingApprovals } from "@/components/admin/pending-approvals";
import { AdminMemberList } from "@/components/admin/admin-member-list";
import { ResultEntryForm } from "@/components/admin/result-entry-form";
import { ROUTES, LIMITS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Admin HQ",
};

interface AdminPageProps {
  params: Promise<{ groupId: string }>;
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { groupId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const membership = await membersDal.getMembershipStatus(groupId, user.id);
  if (!membership || membership.status !== "approved" || !["owner", "admin"].includes(membership.role)) {
    redirect(ROUTES.GROUP(groupId));
  }

  const [group, pending, members, recentMatches] = await Promise.all([
    groupsDal.getGroupById(groupId),
    membersDal.getPendingRequests(groupId),
    membersDal.getMembers(groupId),
    matchesDal.getUpcomingMatches(3),
  ]);

  // Find matches that need manual result entry (completed/live without resolved_at)
  // For now show the last completed match or any live match
  const lastCompleted = await matchesDal.getLastCompletedMatch();

  if (!group) redirect("/dashboard");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          Admin HQ
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{group.name}</p>
      </div>

      {/* Pending Approvals */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
          Gate Requests
          {pending.length > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--danger)] px-1.5 text-[10px] font-stats font-bold text-white">
              {pending.length}
            </span>
          )}
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">All clear — no one at the gate.</p>
        ) : (
          <PendingApprovals groupId={groupId} requests={pending} />
        )}
      </section>

      {/* Result Entry */}
      {recentMatches.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
            Scorecard
          </h2>
          <div className="rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-card)] p-5">
            {recentMatches.map((match) => (
              <div key={match.id} className="mb-4 last:mb-0">
                <p className="text-sm text-[var(--text-secondary)] mb-3">
                  Match {match.match_number}: {match.team_a} vs {match.team_b}
                </p>
                <ResultEntryForm
                  groupId={groupId}
                  matchId={match.id}
                  teamA={match.team_a}
                  teamB={match.team_b}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Member Management */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
          Squad ({members.length}/{LIMITS.MAX_MEMBERS_PER_GROUP})
        </h2>
        <AdminMemberList
          groupId={groupId}
          members={members}
          callerRole={membership.role}
          callerId={user.id}
        />
      </section>
    </div>
  );
}
