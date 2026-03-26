import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import * as groupsDal from "@/lib/dal/groups";
import * as membersDal from "@/lib/dal/members";
import { PendingApprovals } from "@/components/admin/pending-approvals";
import { AdminMemberList } from "@/components/admin/admin-member-list";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Admin Panel",
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

  const [group, pending, members] = await Promise.all([
    groupsDal.getGroupById(groupId),
    membersDal.getPendingRequests(groupId),
    membersDal.getMembers(groupId),
  ]);

  if (!group) redirect("/dashboard");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          Admin Panel
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{group.name}</p>
      </div>

      {/* Pending Approvals */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
          Pending Requests
          {pending.length > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--danger)] px-1.5 text-[10px] font-stats font-bold text-white">
              {pending.length}
            </span>
          )}
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No pending requests.</p>
        ) : (
          <PendingApprovals groupId={groupId} requests={pending} />
        )}
      </section>

      {/* Member Management */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
          Members ({members.length})
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
