"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import type { Player } from "@/types";

interface PlayerPickProps {
  players: Player[];
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PlayerPick({ players, value, onChange, disabled }: PlayerPickProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return players;
    const lower = search.toLowerCase();
    return players.filter((p) => p.name.toLowerCase().includes(lower));
  }, [players, search]);

  const selectedPlayer = players.find((p) => p.name === value);

  if (disabled) {
    return (
      <div className="rounded-[10px] border border-[var(--border-medium)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--text-secondary)] opacity-50">
        {selectedPlayer?.name || "Locked"}
      </div>
    );
  }

  if (value && !isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center justify-between rounded-[10px] border-2 border-[var(--cyan)] bg-[var(--cyan-soft)] px-4 py-2.5 text-left transition-all"
      >
        <span className="font-body text-sm font-medium text-[var(--cyan)]">
          {value}
        </span>
        <X
          className="h-4 w-4 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          onClick={(e) => {
            e.stopPropagation();
            onChange("");
            setSearch("");
          }}
        />
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <Input
          type="text"
          placeholder="Search player..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="bg-[var(--bg-input)] border-[var(--border-medium)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] pl-9"
        />
      </div>
      {isOpen && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-[10px] border border-[var(--border-light)] bg-[var(--bg-elevated)] shadow-lg">
          {filtered.length === 0 ? (
            <p className="p-3 text-sm text-[var(--text-muted)]">No players found</p>
          ) : (
            filtered.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => {
                  onChange(player.name);
                  setSearch("");
                  setIsOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--bg-hover)] transition-colors"
              >
                <span className="text-[var(--text-primary)]">{player.name}</span>
                <span className="text-[10px] font-display text-[var(--text-muted)]">
                  {player.team_code}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
