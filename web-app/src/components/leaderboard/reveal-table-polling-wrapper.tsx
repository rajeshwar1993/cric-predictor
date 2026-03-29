"use client";

import { useMemo } from "react";
import { usePredictionPolling } from "@/hooks/use-prediction-polling";
import { PredictionRevealTable } from "./prediction-reveal-table";
import type { RevealMember, RevealScenario, RevealCellData } from "@/types";
import type { MatchStatus } from "@/types/database";

interface RevealTablePollingWrapperProps {
  initialPredictions: Record<string, Record<string, RevealCellData>>;
  members: RevealMember[];
  scenarios: RevealScenario[];
  currentUserId: string;
  matchStatus: MatchStatus;
  teamA: string;
  teamB: string;
  matchNumber: number;
}

/**
 * Client wrapper for the Prediction Reveal Table.
 * Manages the polling lifecycle for live prediction resolution updates.
 * Passes fresh data to the presentational PredictionRevealTable component.
 *
 * Follows the LiveMatchScorecard + useMatchPolling pattern:
 * server component provides SSR initial data -> client wrapper polls for updates.
 */
export function RevealTablePollingWrapper({
  initialPredictions,
  members,
  scenarios,
  currentUserId,
  matchStatus,
  teamA,
  teamB,
  matchNumber,
}: RevealTablePollingWrapperProps) {
  const scenarioIds = useMemo(() => scenarios.map((s) => s.id), [scenarios]);

  const { predictions } = usePredictionPolling({
    scenarioIds,
    matchStatus,
    initialData: initialPredictions,
  });

  return (
    <PredictionRevealTable
      members={members}
      scenarios={scenarios}
      predictions={predictions}
      currentUserId={currentUserId}
      matchStatus={matchStatus}
      teamA={teamA}
      teamB={teamB}
      matchNumber={matchNumber}
    />
  );
}
