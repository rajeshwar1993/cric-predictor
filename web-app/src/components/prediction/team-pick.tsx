"use client";

import { TeamBadge } from "@/components/shared/team-badge";
import { getTeamColor } from "@/lib/utils";

interface TeamPickProps {
  teamA: string;
  teamB: string;
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TeamPick({ teamA, teamB, value, onChange, disabled }: TeamPickProps) {
  return (
    <div className="flex gap-3">
      {[teamA, teamB].map((team) => {
        const isSelected = value === team;
        const color = getTeamColor(team);
        return (
          <button
            key={team}
            type="button"
            onClick={() => !disabled && onChange(team)}
            disabled={disabled}
            className={`flex flex-1 items-center justify-center gap-2 rounded-[10px] border-2 px-4 py-3 transition-all ${
              isSelected
                ? "border-current"
                : "border-[var(--border-medium)] hover:border-[var(--border-light)]"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            style={
              isSelected
                ? {
                    color,
                    backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
                    borderColor: color,
                  }
                : undefined
            }
          >
            <TeamBadge teamCode={team} size="sm" />
            <span className={`font-display text-sm font-semibold ${isSelected ? "" : "text-[var(--text-secondary)]"}`}>
              {team}
            </span>
          </button>
        );
      })}
    </div>
  );
}
