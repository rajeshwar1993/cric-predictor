import { Database } from 'lucide-react'

import { ReferenceTabs } from '@/components/admin/reference/reference-tabs'
import {
  getSports,
  getLeagues,
  getSeasons,
  getTeamsWithPlayerCount,
  getPlayers,
  getScenarioTemplates,
} from '@/lib/dal/admin/reference'

export default async function ReferencePage() {
  const [sports, leagues, seasons, teams, players, templates] =
    await Promise.all([
      getSports(),
      getLeagues(),
      getSeasons(),
      getTeamsWithPlayerCount(),
      getPlayers(),
      getScenarioTemplates(),
    ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Database size={24} className="text-bragg-lime" />
        <h1 className="text-h2 text-text-primary">Reference Data</h1>
      </div>
      <ReferenceTabs
        sports={sports}
        leagues={leagues}
        seasons={seasons}
        teams={teams}
        players={players}
        templates={templates}
      />
    </div>
  )
}
