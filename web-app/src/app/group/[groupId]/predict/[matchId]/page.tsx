import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/get-user-cached";
import * as matchesDal from "@/lib/dal/matches";
import * as scenariosDal from "@/lib/dal/scenarios";
import * as predictionsDal from "@/lib/dal/predictions";
import * as playersDal from "@/lib/dal/players";
import { TeamBadge } from "@/components/shared/team-badge";
import { PredictionForm } from "@/components/prediction/prediction-form";
import { PredictPageWindowBadge } from "@/components/prediction/predict-page-window-badge";
import { PreWindowBanner } from "@/components/prediction/pre-window-banner";
import {
  formatMatchDate,
  formatMatchTime,
  computeWindowOpen,
  computeDeadline,
  getWindowState,
} from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PredictPageProps {
  params: Promise<{ groupId: string; matchId: string }>;
}

export async function generateMetadata({ params }: PredictPageProps): Promise<Metadata> {
  const { matchId } = await params;
  const match = await matchesDal.getMatchById(Number(matchId));
  if (!match) return { title: "Predict" };
  return { title: `Predict — ${match.team_a} vs ${match.team_b}` };
}

export default async function PredictPage({ params }: PredictPageProps) {
  const { groupId, matchId: matchIdStr } = await params;
  const matchId = Number(matchIdStr);

  if (!matchIdStr || isNaN(matchId) || matchId <= 0) notFound();

  // Auth + membership already verified by layout.tsx
  const user = (await getAuthUser())!;

  const [match, settings] = await Promise.all([
    matchesDal.getMatchById(matchId),
    matchesDal.getMatchGroupSettings(groupId, matchId),
  ]);
  if (!match) notFound();

  // Auto-seed system scenarios for upcoming matches
  if (match.status === "upcoming") {
    await scenariosDal.seedSystemScenarios(groupId, matchId);
  }

  // Fetch scenarios, existing predictions, and players in parallel
  const [scenarios, players] = await Promise.all([
    scenariosDal.getScenariosForMatch(groupId, matchId),
    playersDal.getPlayersForMatch(matchId),
  ]);

  // Fetch user's existing predictions
  const scenarioIds = scenarios.map((s) => s.id);
  const existingPredictions = await predictionsDal.getPredictionsForUser(
    user.id,
    scenarioIds
  );

  // Compute window state
  const windowState = getWindowState(match, settings?.prediction_deadline);
  const windowOpen = computeWindowOpen(match.date);
  const windowClose = computeDeadline(
    match.date,
    match.time_ist,
    settings?.prediction_deadline
  );
  const isPreWindow =
    windowState === "PRE_WINDOW_FUTURE" ||
    windowState === "PRE_WINDOW_MATCH_DAY";

  // Determine lock state (window closed or admin-locked)
  const locked =
    match.status !== "upcoming" ||
    settings?.is_locked === true ||
    windowState === "WINDOW_CLOSED";

  // Last updated timestamp from most recent prediction
  const lastUpdated = existingPredictions.length > 0
    ? existingPredictions.reduce((latest, p) =>
        p.submitted_at > latest ? p.submitted_at : latest,
      existingPredictions[0].submitted_at)
    : null;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={ROUTES.GROUP(groupId)}
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to squad
      </Link>

      {/* Match header */}
      <div className="rounded-[20px] border border-[var(--border-light)] bg-card-gradient p-6">
        <div className="flex items-center justify-between">
          <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Match {match.match_number}
          </span>
          <PredictPageWindowBadge
            windowState={windowState}
            windowOpen={windowOpen.toISOString()}
            windowClose={windowClose.toISOString()}
            matchDate={match.date}
          />
        </div>
        <div className="mt-4 flex items-center justify-center gap-6">
          <TeamBadge teamCode={match.team_a} size="lg" />
          <span className="font-display text-lg font-bold text-[var(--text-muted)]">VS</span>
          <TeamBadge teamCode={match.team_b} size="lg" />
        </div>
        <p className="mt-3 text-center text-sm text-[var(--text-secondary)]">
          {formatMatchDate(match.date)} · {formatMatchTime(match.time_ist)} · {match.venue}
        </p>
      </div>

      {/* Prediction form or pre-window banner */}
      {isPreWindow ? (
        <PreWindowBanner
          windowOpen={windowOpen.toISOString()}
          matchDate={match.date}
          squadsAvailable={players.length > 0}
          isMatchDay={windowState === "PRE_WINDOW_MATCH_DAY"}
        />
      ) : (
        <PredictionForm
          groupId={groupId}
          matchId={matchId}
          teamA={match.team_a}
          teamB={match.team_b}
          scenarios={scenarios}
          existingPredictions={existingPredictions}
          players={players}
          isLocked={locked}
          lastUpdated={lastUpdated}
          deadline={
            windowState === "WINDOW_OPEN"
              ? windowClose.toISOString()
              : null
          }
        />
      )}
    </div>
  );
}
