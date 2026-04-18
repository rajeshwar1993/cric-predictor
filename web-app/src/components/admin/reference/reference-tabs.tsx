'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import type {
  Sport,
  League,
  Season,
  TeamWithPlayerCount,
  PlayerWithTeam,
  ScenarioTemplate,
} from '@/lib/dal/admin/reference'
import { SportsLeaguesTable } from './sports-leagues-table'
import { TeamsTable } from './teams-table'
import { PlayersTable } from './players-table'
import { ScenarioTemplatesTable } from './scenario-templates-table'

const TABS = [
  { id: 'sports-leagues', label: 'Sports & Leagues' },
  { id: 'teams', label: 'Teams' },
  { id: 'players', label: 'Players' },
  { id: 'templates', label: 'Scenario Templates' },
] as const

type TabId = (typeof TABS)[number]['id']

interface ReferenceTabsProps {
  sports: Sport[]
  leagues: League[]
  seasons: Season[]
  teams: TeamWithPlayerCount[]
  players: PlayerWithTeam[]
  templates: ScenarioTemplate[]
  seededCounts: Record<string, number>
}

export function ReferenceTabs({
  sports,
  leagues,
  seasons,
  teams,
  players,
  templates,
  seededCounts,
}: ReferenceTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('sports-leagues')

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-wire">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 font-body text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-b-2 border-bragg-lime text-bragg-lime'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'sports-leagues' && (
        <SportsLeaguesTable
          sports={sports}
          leagues={leagues}
          seasons={seasons}
        />
      )}
      {activeTab === 'teams' && <TeamsTable teams={teams} />}
      {activeTab === 'players' && (
        <PlayersTable
          players={players}
          teams={teams.map((t) => ({ id: t.id, name: t.name }))}
        />
      )}
      {activeTab === 'templates' && (
        <ScenarioTemplatesTable
          templates={templates}
          seededCounts={seededCounts}
          sports={sports}
        />
      )}
    </div>
  )
}
