import type { Metadata } from "next";
import { redirect } from "next/navigation";
import * as groupsDal from "@/lib/dal/groups";
import * as standingsDal from "@/lib/dal/standings";
import { SeasonStandings } from "@/components/leaderboard/season-standings";
import { ROUTES } from "@/lib/constants";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Season Standings",
};

interface StandingsPageProps {
  params: Promise<{ groupId: string }>;
}

export default async function StandingsPage({ params }: StandingsPageProps) {
  const { groupId } = await params;

  // Auth + membership already verified by layout.tsx
  const [group, standings] = await Promise.all([
    groupsDal.getGroupById(groupId),
    standingsDal.getSeasonStandings(groupId),
  ]);

  if (!group) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <Link
        href={ROUTES.GROUP(groupId)}
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to squad
      </Link>

      <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
        Season Standings
      </h1>

      <SeasonStandings entries={standings} currentUserId={user.id} />
    </div>
  );
}
