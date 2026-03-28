"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search, X, ChevronDown } from "lucide-react";
import type { Player } from "@/types";

interface PlayerPickProps {
  players: Player[];
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  title?: string;
}

export function PlayerPick({ players, value, onChange, disabled, title }: PlayerPickProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return players;
    const lower = search.toLowerCase();
    return players.filter((p) => p.name.toLowerCase().includes(lower));
  }, [players, search]);

  // Group players by team
  const grouped = useMemo(() => {
    const map = new Map<string, Player[]>();
    filtered.forEach((p) => {
      if (!map.has(p.team_code)) map.set(p.team_code, []);
      map.get(p.team_code)!.push(p);
    });
    return map;
  }, [filtered]);

  if (disabled) {
    return (
      <div className="rounded-xl bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--text-secondary)] opacity-50">
        {value || "Locked"}
      </div>
    );
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`w-full flex items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm transition-all ${
          value
            ? "bg-[var(--cyan-soft)] text-[var(--cyan)]"
            : "bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border-medium)]"
        }`}
      >
        <span className={value ? "font-medium" : ""}>{value || "Choose player..."}</span>
        <ChevronDown className="h-4 w-4 shrink-0" />
      </button>

      {/* Fullscreen overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-deep)]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-card)]">
            <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
              {title || "Choose Player"}
            </h3>
            <button
              type="button"
              onClick={() => { setIsOpen(false); setSearch(""); }}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-3 bg-[var(--bg-card)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input
                type="text"
                placeholder="Search player..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[var(--bg-input)] border-[var(--border-medium)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] pl-9"
                autoFocus
              />
            </div>
          </div>

          {/* Player list */}
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">No players found</p>
            ) : (
              [...grouped.entries()].map(([teamCode, teamPlayers]) => (
                <div key={teamCode} className="mb-4">
                  <p className="mb-2 text-[10px] font-display font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {teamCode}
                  </p>
                  <div className="space-y-1">
                    {teamPlayers.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => {
                          onChange(player.name);
                          setIsOpen(false);
                          setSearch("");
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors ${
                          value === player.name
                            ? "bg-[var(--cyan-soft)] text-[var(--cyan)]"
                            : "hover:bg-[var(--bg-card)]"
                        }`}
                      >
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {player.name}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">{teamCode}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Clear selection */}
          {value && (
            <div className="px-4 py-3 bg-[var(--bg-card)]">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                  setSearch("");
                }}
                className="w-full rounded-xl bg-[var(--bg-elevated)] py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
