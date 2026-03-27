import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/get-user-cached";
import * as matchesDal from "@/lib/dal/matches";
import * as scenariosDal from "@/lib/dal/scenarios";
import * as membersDal from "@/lib/dal/members";
import { ScenarioEditor } from "@/components/admin/scenario-editor";
import { ROUTES } from "@/lib/constants";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ScenarioEditorPageProps {
  params: Promise<{ groupId: string; matchId: string }>;
}

export const metadata: Metadata = { title: "Edit Scenarios" };

export default async function ScenarioEditorPage({ params }: ScenarioEditorPageProps) {
  const { groupId, matchId: matchIdStr } = await params;
  const matchId = Number(matchIdStr);
  if (!matchIdStr || isNaN(matchId) || matchId <= 0) notFound();

  // Auth already verified by layout — just need role check
  const user = (await getAuthUser())!;

  // Parallelize role check + match fetch
  const [membership, match] = await Promise.all([
    membersDal.getMembershipStatus(groupId, user.id),
    matchesDal.getMatchById(matchId),
  ]);

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    redirect(ROUTES.GROUP(groupId));
  }
  if (!match) notFound();

  // Auto-seed system scenarios for this group+match
  await scenariosDal.seedSystemScenarios(groupId, matchId);

  const [scenarios, settings, hasPredictions] = await Promise.all([
    scenariosDal.getScenariosForMatch(groupId, matchId),
    matchesDal.getMatchGroupSettings(groupId, matchId),
    scenariosDal.hasAnyPredictionsForMatch(groupId, matchId),
  ]);

  const isPublished = settings?.scenarios_published ?? false;

  return (
    <div className="space-y-6">
      <Link href={ROUTES.GROUP(groupId)} className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to group
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          Edit Scenarios
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Match {match.match_number}: {match.team_a} vs {match.team_b}
        </p>
      </div>

      <ScenarioEditor
        groupId={groupId}
        matchId={matchId}
        initialScenarios={scenarios}
        isPublished={isPublished}
        isLocked={hasPredictions}
      />
    </div>
  );
}
