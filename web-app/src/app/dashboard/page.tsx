import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import * as groupsDal from "@/lib/dal/groups";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { GroupCard } from "@/components/group/group-card";
import { CreateGroupForm } from "@/components/group/create-group-form";
import { JoinGroupForm } from "@/components/group/join-group-form";
import { PendingInviteBanner } from "@/components/group/pending-invite-banner";
import { Users, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const groups = await groupsDal.getGroupsByUser(user.id);

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-[960px] px-4 py-8 space-y-8">
          {/* Pending invite from localStorage */}
          <PendingInviteBanner />

          {groups.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-8">
              {/* Groups header */}
              <div className="flex items-center justify-between">
                <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
                  Your Squads
                </h1>
                <div className="flex items-center gap-3">
                  <div className="relative w-full sm:w-48">
                    <JoinGroupForm />
                  </div>
                </div>
              </div>

              {/* Group list */}
              <div className="grid gap-4 sm:grid-cols-2">
                {groups.map((group) => (
                  <GroupCard key={group.id} group={group} />
                ))}
              </div>

              {/* Create new group */}
              <div className="rounded-[14px] border border-dashed border-[var(--border-medium)] bg-[var(--bg-card)]/50 p-6">
                <h3 className="mb-4 font-display text-sm font-semibold text-[var(--text-secondary)]">
                  Start a New Squad
                </h3>
                <CreateGroupForm />
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--cyan-soft)]">
        <Zap className="h-10 w-10 text-[var(--cyan)]" />
      </div>
      <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
        Welcome to Bragg!
      </h1>
      <p className="mt-3 max-w-md text-sm text-[var(--text-secondary)]">
        Get your crew together, make your calls, and fight for the top spot.
        Every correct prediction is ammunition. Every #1 is a screenshot for the group chat.
      </p>
      <div className="mt-8 w-full max-w-sm space-y-6">
        <CreateGroupForm />
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border-light)]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[var(--bg-deep)] px-3 text-xs text-[var(--text-muted)]">
              or jump into a squad
            </span>
          </div>
        </div>
        <div className="relative">
          <JoinGroupForm />
        </div>
      </div>
    </div>
  );
}
