"use client";

import { TeamPick } from "./team-pick";
import { PlayerPick } from "./player-pick";
import { RangePick } from "./range-pick";
import { YesNoPick } from "./yes-no-pick";
import { RANGE_OPTIONS } from "@/lib/constants";
import type { Scenario, Player } from "@/types";

// Scenario categories mapped to input types
const TEAM_PICK_CATEGORIES = ["match_winner", "toss_winner"];
const PLAYER_PICK_CATEGORIES = ["top_scorer", "top_wicket_taker", "player_of_match", "most_sixes"];
const YES_NO_CATEGORIES = ["batsman_fifty", "bowler_three_wkt", "had_super_over"];

interface ScenarioCardProps {
  scenario: Scenario;
  teamA: string;
  teamB: string;
  players: Player[];
  value: string | null;
  onChange: (scenarioId: string, value: string) => void;
  disabled: boolean;
}

export function ScenarioCard({
  scenario,
  teamA,
  teamB,
  players,
  value,
  onChange,
  disabled,
}: ScenarioCardProps) {
  const category = scenario.system_category;

  function renderInput() {
    if (category && TEAM_PICK_CATEGORIES.includes(category)) {
      return (
        <TeamPick
          teamA={teamA}
          teamB={teamB}
          value={value}
          onChange={(v) => onChange(scenario.id, v)}
          disabled={disabled}
        />
      );
    }

    if (category && PLAYER_PICK_CATEGORIES.includes(category)) {
      return (
        <PlayerPick
          players={players}
          value={value}
          onChange={(v) => onChange(scenario.id, v)}
          disabled={disabled}
        />
      );
    }

    if (category && YES_NO_CATEGORIES.includes(category)) {
      return (
        <YesNoPick
          value={value}
          onChange={(v) => onChange(scenario.id, v)}
          disabled={disabled}
        />
      );
    }

    if (category && RANGE_OPTIONS[category]) {
      return (
        <RangePick
          options={RANGE_OPTIONS[category]}
          value={value}
          onChange={(v) => onChange(scenario.id, v)}
          disabled={disabled}
        />
      );
    }

    // Custom scenario or unknown — use options from the scenario itself
    const options = (scenario.options || []) as string[];
    if (options.length > 0) {
      return (
        <RangePick
          options={options}
          value={value}
          onChange={(v) => onChange(scenario.id, v)}
          disabled={disabled}
        />
      );
    }

    return (
      <p className="text-xs text-[var(--text-muted)]">No options available</p>
    );
  }

  return (
    <div className="rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-[13px] font-semibold text-[var(--text-primary)]">
          {scenario.title}
        </h4>
        <span className="font-stats text-[11px] text-[var(--text-muted)]">
          {scenario.points} pts
        </span>
      </div>
      {renderInput()}
      {value && (
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-[var(--cyan)]" />
          <span className="text-xs text-[var(--cyan)]">Predicted</span>
        </div>
      )}
    </div>
  );
}
