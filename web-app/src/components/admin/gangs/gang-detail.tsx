import Link from 'next/link'

import type { GangDetail } from '@/lib/dal/admin/gangs'
import { cn } from '@/lib/utils'

interface GangDetailViewProps {
  gang: GangDetail
}

export function GangDetailView({ gang }: GangDetailViewProps) {
  return (
    <div className="space-y-6">
      {/* Gang Info */}
      <div className="rounded-lg border border-wire bg-dark-concrete p-4">
        <h3 className="mb-3 text-sm font-semibold text-text-primary">
          Gang Info
        </h3>
        <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
          <div>
            <dt className="text-text-muted">Name</dt>
            <dd className="text-text-primary">{gang.name}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Invite Code</dt>
            <dd className="font-mono text-text-primary">{gang.inviteCode}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Created By</dt>
            <dd className="text-text-primary">
              {gang.creatorName ?? gang.createdBy.substring(0, 8)}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Created</dt>
            <dd className="text-text-primary">
              {new Date(gang.createdAt).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Auto-Accept</dt>
            <dd>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  gang.autoAccept
                    ? 'bg-bragg-lime/10 text-bragg-lime'
                    : 'bg-wire text-text-muted',
                )}
              >
                {gang.autoAccept ? 'On' : 'Off'}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Status</dt>
            <dd>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  gang.isDeleted
                    ? 'bg-red-400/10 text-red-400'
                    : 'bg-green-400/10 text-green-400',
                )}
              >
                {gang.isDeleted ? 'Deleted' : 'Active'}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      {/* Members */}
      <div className="rounded-lg border border-wire bg-dark-concrete">
        <div className="border-b border-wire px-4 py-3">
          <h3 className="text-sm font-semibold text-text-primary">
            Members ({gang.members.length})
          </h3>
        </div>
        {gang.members.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-wire text-left text-xs uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {gang.members.map((m) => (
                  <tr
                    key={m.userId}
                    className="border-b border-mid-concrete last:border-b-0"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/users/${m.userId}`}
                        className="text-bragg-lime hover:underline"
                      >
                        {m.displayName ?? 'No name'}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-text-secondary">{m.email}</td>
                    <td className="px-4 py-2 capitalize text-text-secondary">
                      {m.role}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                          m.status === 'approved'
                            ? 'bg-green-400/10 text-green-400'
                            : m.status === 'pending'
                              ? 'bg-yellow-400/10 text-yellow-400'
                              : 'bg-wire text-text-muted',
                        )}
                      >
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-4 text-sm text-text-muted">No members.</p>
        )}
      </div>

      {/* Season Standings */}
      <div className="rounded-lg border border-wire bg-dark-concrete">
        <div className="border-b border-wire px-4 py-3">
          <h3 className="text-sm font-semibold text-text-primary">
            Season Standings ({gang.seasonStandings.length})
          </h3>
        </div>
        {gang.seasonStandings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-wire text-left text-xs uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-2">Rank</th>
                  <th className="px-4 py-2">Member</th>
                  <th className="px-4 py-2 text-right">Points</th>
                  <th className="px-4 py-2 text-right">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {gang.seasonStandings.map((s, i) => (
                  <tr
                    key={`${s.userId}-${i}`}
                    className="border-b border-mid-concrete last:border-b-0"
                  >
                    <td className="px-4 py-2 text-text-secondary">
                      #{s.rank ?? '—'}
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/users/${s.userId}`}
                        className="text-bragg-lime hover:underline"
                      >
                        {s.displayName ?? 'Unknown'}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-bragg-lime">
                      {s.totalPoints}
                    </td>
                    <td className="px-4 py-2 text-right text-text-secondary">
                      {s.accuracyPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-4 text-sm text-text-muted">No standings data.</p>
        )}
      </div>
    </div>
  )
}
