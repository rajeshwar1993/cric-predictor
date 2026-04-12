'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronDown, ChevronRight, Users } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { TeamWithPlayerCount } from '@/lib/dal/admin/reference'

interface TeamsTableProps {
  teams: TeamWithPlayerCount[]
}

export function TeamsTable({ teams }: TeamsTableProps) {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)

  if (teams.length === 0) {
    return (
      <div className="rounded-md border border-wire bg-concrete-black px-4 py-12 text-center">
        <Users size={32} className="mx-auto mb-3 text-text-muted" />
        <p className="text-sm text-text-muted">
          No active season found. Teams will appear here when a season is
          active.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-secondary">
        {teams.length} teams &middot;{' '}
        {teams.reduce((sum, t) => sum + t.playerCount, 0)} total players
      </p>
      <div className="overflow-x-auto rounded-md border border-wire">
        <table className="w-full">
          <thead>
            <tr className="bg-dark-concrete">
              <th className="w-8 px-2 py-2.5" />
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Logo
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Name
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Code
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Color
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Status
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Players
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                API ID
              </th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => {
              const isExpanded = expandedTeamId === team.id

              return (
                <TeamRow
                  key={team.id}
                  team={team}
                  isExpanded={isExpanded}
                  onToggle={() =>
                    setExpandedTeamId(isExpanded ? null : team.id)
                  }
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Team row with expandable player roster
// ---------------------------------------------------------------------------

interface TeamRowProps {
  team: TeamWithPlayerCount
  isExpanded: boolean
  onToggle: () => void
}

function TeamRow({ team, isExpanded, onToggle }: TeamRowProps) {
  return (
    <>
      <tr
        className={cn(
          'cursor-pointer border-t border-wire bg-concrete-black transition-colors hover:bg-dark-concrete',
          !team.is_active && 'opacity-50',
        )}
        onClick={onToggle}
      >
        <td className="px-2 py-2.5 text-text-muted">
          {isExpanded ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
        </td>
        <td className="px-4 py-2.5">
          {team.logo_url ? (
            <Image
              src={team.logo_url}
              alt={`${team.name} logo`}
              width={32}
              height={32}
              className="rounded"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded bg-mid-concrete">
              <Users size={14} className="text-text-muted" />
            </div>
          )}
        </td>
        <td className="px-4 py-2.5 text-sm font-medium text-text-primary">
          {team.name}
        </td>
        <td className="px-4 py-2.5 font-mono text-sm text-text-secondary">
          {team.code}
        </td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div
              className="h-4 w-4 rounded-full border border-wire"
              style={{ backgroundColor: team.color }}
              title={team.color}
            />
            <span className="font-mono text-xs text-text-muted">
              {team.color}
            </span>
          </div>
        </td>
        <td className="px-4 py-2.5">
          {team.is_active ? (
            <Badge variant="lime">Active</Badge>
          ) : (
            <Badge variant="default">Inactive</Badge>
          )}
        </td>
        <td className="px-4 py-2.5 text-sm text-text-secondary">
          {team.playerCount}
        </td>
        <td className="px-4 py-2.5 font-mono text-sm text-text-muted">
          {team.api_id}
        </td>
      </tr>

      {/* Expanded player roster */}
      {isExpanded && (
        <tr>
          <td colSpan={8} className="bg-dark-concrete p-0">
            <div className="px-8 py-4">
              {team.players.length === 0 ? (
                <p className="text-sm text-text-muted">
                  No players assigned to this team
                </p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="px-3 py-1.5 text-left text-xs font-medium uppercase tracking-widest text-text-muted">
                        Name
                      </th>
                      <th className="px-3 py-1.5 text-left text-xs font-medium uppercase tracking-widest text-text-muted">
                        Role
                      </th>
                      <th className="px-3 py-1.5 text-left text-xs font-medium uppercase tracking-widest text-text-muted">
                        Batting
                      </th>
                      <th className="px-3 py-1.5 text-left text-xs font-medium uppercase tracking-widest text-text-muted">
                        Bowling
                      </th>
                      <th className="px-3 py-1.5 text-left text-xs font-medium uppercase tracking-widest text-text-muted">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.players.map((player) => (
                      <tr
                        key={player.id}
                        className="border-t border-wire/50"
                      >
                        <td className="px-3 py-1.5 text-sm text-text-primary">
                          {player.name}
                        </td>
                        <td className="px-3 py-1.5 text-sm capitalize text-text-secondary">
                          {player.role ?? '\u2014'}
                        </td>
                        <td className="px-3 py-1.5 text-sm text-text-secondary">
                          {player.batting_style ?? '\u2014'}
                        </td>
                        <td className="px-3 py-1.5 text-sm text-text-secondary">
                          {player.bowling_style ?? '\u2014'}
                        </td>
                        <td className="px-3 py-1.5">
                          {player.is_active ? (
                            <span className="text-xs text-bragg-lime">
                              Active
                            </span>
                          ) : (
                            <span className="text-xs text-text-muted">
                              Inactive
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
