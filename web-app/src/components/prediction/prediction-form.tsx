"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScenarioCard } from "./scenario-card";
import { submitPredictions } from "@/lib/actions/predictions";
import { Loader2, Check } from "lucide-react";
import { getPostHogClient } from "@/lib/posthog/client";
import { ANALYTICS_EVENTS } from "@/lib/posthog/events";
import type { Scenario, Prediction, Player } from "@/types";

interface PredictionFormProps {
  groupId: string;
  matchId: number;
  teamA: string;
  teamB: string;
  scenarios: Scenario[];
  existingPredictions: Prediction[];
  players: Player[];
  isLocked: boolean;
  lastUpdated: string | null;
}

// Group scenarios by resolution phase for display order
const PHASE_ORDER = [
  "toss",
  "first_wicket",
  "powerplay",
  "mid_match",
  "innings_break",
  "end",
  "post_match",
  null,
];

const PHASE_LABELS: Record<string, string> = {
  toss: "Toss",
  first_wicket: "First Strike",
  powerplay: "Powerplay",
  mid_match: "Mid-Innings",
  innings_break: "Innings Break",
  end: "Final Ball",
  post_match: "After Stumps",
};

function getPhase(scenario: Scenario): string | null {
  if (scenario.type === "custom") return null;
  // Map system_category to resolution phase via SYSTEM_SCENARIOS
  const phaseMap: Record<string, string> = {
    match_winner: "end",
    toss_winner: "toss",
    top_scorer: "end",
    top_wicket_taker: "end",
    player_of_match: "post_match",
    first_innings_score: "innings_break",
    total_match_runs: "end",
    powerplay_score: "powerplay",
    powerplay_wickets: "powerplay",
    total_sixes: "end",
    total_wickets: "end",
    batsman_fifty: "mid_match",
    bowler_three_wkt: "mid_match",
    had_super_over: "end",
    most_sixes: "end",
    first_wicket_over: "first_wicket",
  };
  return scenario.system_category ? phaseMap[scenario.system_category] || null : null;
}

export function PredictionForm({
  groupId,
  matchId,
  teamA,
  teamB,
  scenarios,
  existingPredictions,
  players,
  isLocked,
  lastUpdated,
}: PredictionFormProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Initialize picks from existing predictions
  const initialPicks: Record<string, string> = {};
  existingPredictions.forEach((p) => {
    initialPicks[p.scenario_id] = p.value;
  });

  const [picks, setPicks] = useState<Record<string, string>>(initialPicks);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const answeredCount = Object.keys(picks).filter((k) => picks[k]).length;
  const totalCount = scenarios.length;

  const handleChange = useCallback((scenarioId: string, value: string) => {
    setPicks((prev) => ({ ...prev, [scenarioId]: value }));
    setSuccess(false);
    setError("");
    getPostHogClient()?.capture(ANALYTICS_EVENTS.PREDICTION_PICK_CHANGED, {
      group_id: groupId,
      match_id: matchId,
      scenario_id: scenarioId,
    });
  }, [groupId, matchId]);

  async function handleSubmit() {
    setLoading(true);
    setError("");

    const predictions = Object.entries(picks)
      .filter(([, value]) => value)
      .map(([scenarioId, value]) => ({ scenarioId, value }));

    if (predictions.length === 0) {
      setError("Pick at least one scenario");
      setLoading(false);
      return;
    }

    const result = await submitPredictions(groupId, matchId, predictions);

    if (result.success) {
      setSuccess(true);
      startTransition(() => { router.refresh(); });
    } else {
      setError(result.error || "Couldn't lock those in — try again");
    }
    setLoading(false);
  }

  // Group scenarios by phase
  const grouped = new Map<string | null, Scenario[]>();
  scenarios.forEach((s) => {
    const phase = getPhase(s);
    if (!grouped.has(phase)) grouped.set(phase, []);
    grouped.get(phase)!.push(s);
  });

  const orderedPhases = PHASE_ORDER.filter((p) => grouped.has(p));
  // Add custom scenarios (null phase) at the end
  if (grouped.has(null) && !orderedPhases.includes(null)) {
    orderedPhases.push(null);
  }

  return (
    <div className="space-y-6 pb-24">
      {lastUpdated && (
        <p className="text-xs text-[var(--text-muted)]">
          Last updated: {new Date(lastUpdated).toLocaleString("en-IN")}
        </p>
      )}

      {isLocked && (
        <div className="rounded-[14px] border border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] p-4 text-center">
          <p className="font-display text-sm font-semibold text-[var(--danger)]">
            Predictions Locked
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Time&apos;s up! The deadline has passed or an admin locked predictions.
          </p>
        </div>
      )}

      {orderedPhases.map((phase) => {
        const phaseScenarios = grouped.get(phase) || [];
        return (
          <div key={phase || "custom"} className="space-y-3">
            <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {phase ? PHASE_LABELS[phase] || phase : "Custom Scenarios"}
            </h3>
            {phaseScenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                teamA={teamA}
                teamB={teamB}
                players={players}
                value={picks[scenario.id] || null}
                onChange={handleChange}
                disabled={isLocked}
              />
            ))}
          </div>
        );
      })}

      {/* Sticky submit bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border-light)] bg-[var(--bg-deep)]/95 backdrop-blur px-4 py-3">
        <div className="mx-auto flex max-w-[960px] items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-stats text-sm text-[var(--text-secondary)]">
              <span className="text-[var(--cyan)] font-semibold">{answeredCount}</span>
              /{totalCount} picked
            </span>
            {error && (
              <span className="text-xs text-[var(--danger)]" role="alert">{error}</span>
            )}
            {success && (
              <span className="flex items-center gap-1 text-xs text-[var(--success)]" role="status" aria-live="polite">
                <Check className="h-3 w-3" /> Locked in!
              </span>
            )}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={loading || isLocked || answeredCount === 0}
            className="font-display font-semibold text-sm bg-gradient-to-br from-[var(--cyan)] to-[color-mix(in_srgb,var(--cyan),#000_20%)] text-[var(--bg-deep)] hover:opacity-90 btn-glow"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Lock It In
          </Button>
        </div>
      </div>
    </div>
  );
}
