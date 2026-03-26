"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { PredictionStatusPill } from "./prediction-status-pill";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import type { Scenario, Prediction } from "@/types";
import type { TrackStatus } from "@/lib/on-track-logic";

interface ExpandablePicksProps {
  userId: string;
  groupId: string;
  matchId: number;
}

interface ScenarioWithPrediction {
  scenario: Scenario;
  prediction: Prediction | null;
}

export function ExpandablePicks({ userId, groupId, matchId }: ExpandablePicksProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<ScenarioWithPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchPicks() {
      setLoading(true);
      try {
        // Fetch scenarios for this group+match only
        const { data: scenarios } = await supabase
          .from("scenarios")
          .select("*")
          .eq("group_id", groupId)
          .eq("match_id", matchId)
          .eq("is_removed", false)
          .in("approval_status", ["auto_approved", "approved"])
          .order("points", { ascending: false });

        if (scenarios && scenarios.length > 0) {
          // Fetch predictions scoped to these specific scenarios only
          const scenarioIds = scenarios.map((s: any) => s.id);
          const { data: predictions } = await supabase
            .from("predictions")
            .select("*")
            .eq("user_id", userId)
            .in("scenario_id", scenarioIds);

          const predMap = new Map(
            (predictions || []).map((p: any) => [p.scenario_id, p])
          );
          setData(
            (scenarios as unknown as Scenario[]).map((s) => ({
              scenario: s,
              prediction: (predMap.get(s.id) as Prediction) || null,
            }))
          );
        }
      } finally {
        setLoading(false);
      }
    }

    fetchPicks();
  }, [isOpen, supabase, userId, groupId, matchId]);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      >
        {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {isOpen ? "Hide picks" : "View picks"}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : (
            data.map(({ scenario, prediction }) => {
              let status: TrackStatus = "pending";
              if (prediction) {
                if (prediction.is_correct === true) status = "correct";
                else if (prediction.is_correct === false) status = "wrong";
              }

              return (
                <div
                  key={scenario.id}
                  className="flex items-center justify-between rounded-[8px] bg-[var(--bg-elevated)] px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[var(--text-secondary)] truncate">
                      {scenario.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-xs text-[var(--text-primary)]">
                        {prediction?.value || "—"}
                      </span>
                      {scenario.correct_answer && (
                        <span className="text-[10px] text-[var(--text-muted)]">
                          Actual: {scenario.correct_answer}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {prediction ? (
                      <PredictionStatusPill status={status} compact />
                    ) : (
                      <span className="text-[10px] text-[var(--text-muted)]">Not predicted</span>
                    )}
                    {prediction && prediction.points_earned > 0 && (
                      <span className="font-stats text-xs font-semibold text-[var(--success)]">
                        +{prediction.points_earned}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
