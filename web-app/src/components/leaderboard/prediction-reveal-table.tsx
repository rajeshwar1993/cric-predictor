import { Check, X } from "lucide-react";
import { REVEAL_TABLE_COPY, SCENARIO_SHORT_LABELS } from "@/lib/constants";
import { RevealColorLegend } from "./reveal-color-legend";
import type { RevealMember, RevealScenario, RevealCellData } from "@/types";
import type { MatchStatus } from "@/types/database";

interface PredictionRevealTableProps {
  members: RevealMember[];
  scenarios: RevealScenario[];
  predictions: Record<string, Record<string, RevealCellData>>;
  currentUserId: string;
  matchStatus: MatchStatus;
  teamA: string;
  teamB: string;
  matchNumber: number;
}

/** Cell background and text color styles keyed by resolution state. */
const CELL_STYLES = {
  correct: {
    background: "color-mix(in srgb, var(--success) 12%, transparent)",
    color: "var(--success)",
  },
  incorrect: {
    background: "color-mix(in srgb, var(--danger) 12%, transparent)",
    color: "var(--danger)",
  },
  pending: {
    background: "color-mix(in srgb, var(--pending) 8%, transparent)",
    color: "var(--text-secondary)",
  },
  noPick: {
    background: "transparent",
    color: "var(--text-muted)",
  },
} as const;

/**
 * Get the short column header label for a scenario.
 * Uses the abbreviation map for system scenarios; truncates custom titles.
 */
function getColumnLabel(scenario: RevealScenario): string {
  if (scenario.systemCategory && SCENARIO_SHORT_LABELS[scenario.systemCategory]) {
    return SCENARIO_SHORT_LABELS[scenario.systemCategory];
  }
  // Custom scenario: truncate to ~8 chars
  if (scenario.title.length > 8) {
    return scenario.title.slice(0, 7) + "\u2026";
  }
  return scenario.title;
}

/**
 * Determine the cell style key based on prediction data.
 */
function getCellState(
  cell: RevealCellData | undefined
): keyof typeof CELL_STYLES {
  if (!cell) return "noPick";
  if (cell.isCorrect === true) return "correct";
  if (cell.isCorrect === false) return "incorrect";
  return "pending";
}

/**
 * Build the aria-label for a prediction cell.
 */
function getCellAriaLabel(
  displayName: string,
  scenarioTitle: string,
  cell: RevealCellData | undefined
): string {
  if (!cell) {
    return `${displayName} did not predict ${scenarioTitle}`;
  }
  const statusLabel =
    cell.isCorrect === true
      ? REVEAL_TABLE_COPY.LEGEND_CORRECT
      : cell.isCorrect === false
        ? REVEAL_TABLE_COPY.LEGEND_INCORRECT
        : REVEAL_TABLE_COPY.LEGEND_PENDING;
  return `${displayName} predicted ${cell.value} for ${scenarioTitle} \u2014 ${statusLabel}`;
}

/**
 * Core presentational table component for the Prediction Reveal Table.
 * Renders all members' predictions across all scenarios in a color-coded matrix.
 *
 * Pure render component -- no state, hooks, or data fetching.
 * Receives all data via props from the polling wrapper or server component.
 */
export function PredictionRevealTable({
  members,
  scenarios,
  predictions,
  currentUserId,
  matchStatus,
  teamA,
  teamB,
  matchNumber,
}: PredictionRevealTableProps) {
  const showAbandonedNotice =
    matchStatus === "abandoned" || matchStatus === "no_result";

  return (
    <div className="rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-card)] overflow-hidden">
      {/* Abandoned/no-result notice — inside the card for visual cohesion */}
      {showAbandonedNotice && (
        <p className="px-4 pt-3 pb-0 text-xs text-[var(--text-muted)] italic">
          {REVEAL_TABLE_COPY.MATCH_ABANDONED}
        </p>
      )}
      <div
        role="region"
        aria-label="Scroll to see more scenario columns"
        tabIndex={0}
        className="overflow-x-auto"
      >
        <table
          className="w-full border-collapse"
          style={{ minWidth: `${140 + scenarios.length * 72}px` }}
        >
          <caption className="sr-only">
            Squad predictions for {teamA} vs {teamB}, Match {matchNumber}
          </caption>
          <thead>
            <tr className="bg-[var(--bg-elevated)]">
              {/* Sticky player column header */}
              <th
                scope="col"
                className="sticky left-0 z-10 bg-[var(--bg-elevated)] px-4 py-2.5 text-left text-[10px] font-display font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-light)]"
                style={{
                  minWidth: "120px",
                  maxWidth: "160px",
                  boxShadow: "2px 0 4px -1px rgba(0,0,0,0.15)",
                }}
              >
                Player
              </th>
              {/* Scenario column headers */}
              {scenarios.map((scenario) => (
                <th
                  key={scenario.id}
                  scope="col"
                  title={scenario.title}
                  aria-label={scenario.title}
                  className="px-2 py-2.5 text-center border-b border-[var(--border-light)]"
                  style={{ minWidth: "64px", maxWidth: "120px" }}
                >
                  <div className="text-[10px] font-display font-semibold uppercase tracking-wider text-[var(--text-muted)] truncate">
                    {getColumnLabel(scenario)}
                  </div>
                  <div className="font-stats text-[9px] text-[var(--text-muted)] mt-0.5">
                    {scenario.points} pts
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isCurrentUser = member.userId === currentUserId;
              const userPredictions = predictions[member.userId] || {};

              return (
                <tr
                  key={member.userId}
                  aria-current={isCurrentUser ? "true" : undefined}
                  className={
                    isCurrentUser
                      ? "bg-[var(--cyan-soft)] border-l-2 border-l-[var(--cyan)]"
                      : "group border-l-2 border-l-transparent hover:bg-[var(--bg-hover)]"
                  }
                >
                  {/* Sticky member name column */}
                  <th
                    scope="row"
                    className={`sticky left-0 z-10 px-4 py-2.5 text-left text-sm font-medium text-[var(--text-primary)] truncate ${
                      isCurrentUser
                        ? ""
                        : "bg-[var(--bg-card)] group-hover:bg-[var(--bg-hover)]"
                    }`}
                    style={{
                      minWidth: "120px",
                      maxWidth: "160px",
                      boxShadow: "2px 0 4px -1px rgba(0,0,0,0.15)",
                      ...(isCurrentUser
                        ? { backgroundColor: "color-mix(in srgb, var(--cyan) 6%, var(--bg-card))" }
                        : {}),
                    }}
                  >
                    <span className="block truncate">
                      {member.displayName}
                      {isCurrentUser && (
                        <span className="ml-1 text-xs text-[var(--text-muted)]">
                          (you)
                        </span>
                      )}
                    </span>
                  </th>
                  {/* Prediction cells */}
                  {scenarios.map((scenario) => {
                    const cell = userPredictions[scenario.id];
                    const state = getCellState(cell);
                    const style = CELL_STYLES[state];

                    return (
                      <td
                        key={scenario.id}
                        title={cell?.value || undefined}
                        aria-label={getCellAriaLabel(
                          member.displayName,
                          scenario.title,
                          cell
                        )}
                        className="px-2 py-2.5 text-center transition-colors duration-500"
                        style={{
                          background: style.background,
                          color: style.color,
                        }}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {/* Accessibility icons for resolved cells */}
                          {state === "correct" && (
                            <Check
                              aria-hidden="true"
                              className="h-3 w-3 shrink-0"
                              style={{ color: "var(--success)" }}
                            />
                          )}
                          {state === "incorrect" && (
                            <X
                              aria-hidden="true"
                              className="h-3 w-3 shrink-0"
                              style={{ color: "var(--danger)" }}
                            />
                          )}
                          <span className="font-stats text-[11px] truncate max-w-[48px]">
                            {cell ? cell.value : REVEAL_TABLE_COPY.NO_PICK_CELL}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <RevealColorLegend />
    </div>
  );
}
