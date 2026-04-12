import { Badge } from '@/components/ui/badge'
import { truncate } from '@/lib/utils'
import type { Sport, League, Season } from '@/lib/dal/admin/reference'

interface SportsLeaguesTableProps {
  sports: Sport[]
  leagues: League[]
  seasons: Season[]
}

function daysRemaining(endDate: string | null): number | null {
  if (!endDate) return null
  const end = new Date(endDate)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function SportsLeaguesTable({
  sports,
  leagues,
  seasons,
}: SportsLeaguesTableProps) {
  return (
    <div className="space-y-8">
      {/* Sports */}
      <section>
        <h2 className="mb-3 font-display text-lg font-bold uppercase tracking-tight text-text-primary">
          Sports
          <span className="ml-2 text-sm font-normal text-text-muted">
            ({sports.length})
          </span>
        </h2>
        <div className="overflow-x-auto rounded-md border border-wire">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-concrete">
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                  Name
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                  Code
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                  API ID
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {sports.map((sport) => (
                <tr
                  key={sport.id}
                  className="border-t border-wire bg-concrete-black transition-colors hover:bg-dark-concrete"
                >
                  <td className="px-4 py-2.5 text-sm text-text-primary">
                    {sport.name}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-sm text-text-secondary">
                    {sport.code}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-sm text-text-muted">
                    {sport.api_id}
                  </td>
                  <td className="px-4 py-2.5">
                    {sport.is_active ? (
                      <Badge variant="lime">Active</Badge>
                    ) : (
                      <Badge variant="default">Inactive</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {sports.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-text-muted"
                  >
                    No sports found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Leagues */}
      <section>
        <h2 className="mb-3 font-display text-lg font-bold uppercase tracking-tight text-text-primary">
          Leagues
          <span className="ml-2 text-sm font-normal text-text-muted">
            ({leagues.length})
          </span>
        </h2>
        <div className="overflow-x-auto rounded-md border border-wire">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-concrete">
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                  Name
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                  Code
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                  Sport
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                  API ID
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {leagues.map((league) => (
                <tr
                  key={league.id}
                  className="border-t border-wire bg-concrete-black transition-colors hover:bg-dark-concrete"
                >
                  <td className="px-4 py-2.5 text-sm text-text-primary">
                    {league.name}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-sm text-text-secondary">
                    {league.code}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-text-secondary">
                    {league.sport_name}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-sm text-text-muted">
                    {league.api_id}
                  </td>
                  <td className="px-4 py-2.5">
                    {league.is_active ? (
                      <Badge variant="lime">Active</Badge>
                    ) : (
                      <Badge variant="default">Inactive</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {leagues.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-text-muted"
                  >
                    No leagues found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Seasons */}
      <section>
        <h2 className="mb-3 font-display text-lg font-bold uppercase tracking-tight text-text-primary">
          Seasons
          <span className="ml-2 text-sm font-normal text-text-muted">
            ({seasons.length})
          </span>
        </h2>
        <div className="overflow-x-auto rounded-md border border-wire">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-concrete">
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                  Name
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                  Year
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                  Start
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                  End
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
              {seasons.map((season) => {
                const remaining = season.is_active
                  ? daysRemaining(season.end_date)
                  : null

                return (
                  <tr
                    key={season.id}
                    className="border-t border-wire bg-concrete-black transition-colors hover:bg-dark-concrete"
                  >
                    <td className="px-4 py-2.5 text-sm text-text-primary">
                      {truncate(season.name, 40)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-sm text-text-secondary">
                      {season.year}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-text-secondary">
                      {season.start_date ?? '\u2014'}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-text-secondary">
                      {season.end_date ?? '\u2014'}
                    </td>
                    <td className="px-4 py-2.5">
                      {season.is_active ? (
                        <span className="flex items-center gap-2">
                          <Badge variant="lime">Active</Badge>
                          {remaining !== null && remaining > 0 && (
                            <span className="text-xs text-text-muted">
                              {remaining}d left
                            </span>
                          )}
                        </span>
                      ) : (
                        <Badge variant="default">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-sm text-text-muted">
                      {season.api_id}
                    </td>
                  </tr>
                )
              })}
              {seasons.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-text-muted"
                  >
                    No seasons found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
