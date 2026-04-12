'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { PlayerWithTeam } from '@/lib/dal/admin/reference'

const ROLE_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'batter', label: 'Batter' },
  { value: 'bowler', label: 'Bowler' },
  { value: 'allrounder', label: 'Allrounder' },
  { value: 'wicketkeeper', label: 'Wicketkeeper' },
] as const

interface PlayersTableProps {
  players: PlayerWithTeam[]
  teams: { id: string; name: string }[]
}

export function PlayersTable({ players, teams }: PlayersTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTeam, setSelectedTeam] = useState('all')
  const [selectedRole, setSelectedRole] = useState('all')

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      // Search by name
      if (
        searchQuery &&
        !player.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false
      }

      // Filter by team
      if (selectedTeam === 'unassigned') {
        if (!player.isUnassigned) return false
      } else if (selectedTeam !== 'all') {
        if (player.team?.id !== selectedTeam) return false
      }

      // Filter by role
      if (selectedRole !== 'all') {
        if (
          !player.role ||
          player.role.toLowerCase() !== selectedRole.toLowerCase()
        ) {
          return false
        }
      }

      return true
    })
  }, [players, searchQuery, selectedTeam, selectedRole])

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[240px] flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <Input
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 text-sm"
          />
        </div>

        {/* Team filter */}
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="h-9 rounded-md border-2 border-wire bg-dark-concrete px-3 text-sm text-text-primary outline-none transition-colors focus:border-bragg-lime"
        >
          <option value="all">All Teams</option>
          <option value="unassigned">Unassigned</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>

        {/* Role filter */}
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="h-9 rounded-md border-2 border-wire bg-dark-concrete px-3 text-sm text-text-primary outline-none transition-colors focus:border-bragg-lime"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Count */}
        <span className="text-sm text-text-muted">
          {filteredPlayers.length} of {players.length} players
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-wire">
        <table className="w-full">
          <thead>
            <tr className="bg-dark-concrete">
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Name
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Team
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Role
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Batting
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Bowling
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Status
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                API ID
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player) => (
              <tr
                key={player.id}
                className={cn(
                  'border-t border-wire bg-concrete-black transition-colors hover:bg-dark-concrete',
                  !player.is_active && 'opacity-50',
                )}
              >
                <td className="px-4 py-2.5 text-sm font-medium text-text-primary">
                  {player.name}
                </td>
                <td className="px-4 py-2.5 text-sm text-text-secondary">
                  {player.team ? (
                    <span title={player.team.name}>{player.team.code}</span>
                  ) : (
                    <span className="text-text-muted">{'\u2014'}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-sm capitalize text-text-secondary">
                  {player.role ?? '\u2014'}
                </td>
                <td className="px-4 py-2.5 text-sm text-text-secondary">
                  {player.batting_style ?? '\u2014'}
                </td>
                <td className="px-4 py-2.5 text-sm text-text-secondary">
                  {player.bowling_style ?? '\u2014'}
                </td>
                <td className="px-4 py-2.5">
                  {player.is_active ? (
                    <Badge variant="lime">Active</Badge>
                  ) : (
                    <Badge variant="default">Inactive</Badge>
                  )}
                </td>
                <td className="px-4 py-2.5 font-mono text-sm text-text-muted">
                  {player.api_id}
                </td>
              </tr>
            ))}
            {filteredPlayers.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  {searchQuery || selectedTeam !== 'all' || selectedRole !== 'all'
                    ? 'No players match the current filters'
                    : 'No players found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
