import Link from 'next/link'

import type { UserDetail } from '@/lib/dal/admin/users'
import { cn } from '@/lib/utils'

interface UserDetailViewProps {
  user: UserDetail
}

export function UserDetailView({ user }: UserDetailViewProps) {
  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <div className="rounded-lg border border-[#333333] bg-[#1a1a1a] p-4">
        <h3 className="mb-3 text-sm font-semibold text-text-primary">
          Profile
        </h3>
        <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
          <div>
            <dt className="text-text-muted">Display Name</dt>
            <dd className="text-text-primary">
              {user.displayName ?? 'Not set'}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Email</dt>
            <dd className="text-text-primary">{user.email}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Date of Birth</dt>
            <dd className="text-text-primary">
              {user.dateOfBirth ?? 'Not set'}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Joined</dt>
            <dd className="text-text-primary">
              {new Date(user.createdAt).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Onboarding</dt>
            <dd>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  user.onboardingCompleted
                    ? 'bg-green-400/10 text-green-400'
                    : 'bg-yellow-400/10 text-yellow-400',
                )}
              >
                {user.onboardingCompleted ? 'Complete' : 'Incomplete'}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Status</dt>
            <dd>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  user.isDeleted
                    ? 'bg-red-400/10 text-red-400'
                    : 'bg-green-400/10 text-green-400',
                )}
              >
                {user.isDeleted ? 'Deleted' : 'Active'}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">System Admin</dt>
            <dd>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  user.isSystemAdmin
                    ? 'bg-bragg-lime/10 text-bragg-lime'
                    : 'bg-[#333333] text-text-muted',
                )}
              >
                {user.isSystemAdmin ? 'Yes' : 'No'}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      {/* Gang Memberships */}
      <div className="rounded-lg border border-[#333333] bg-[#1a1a1a]">
        <div className="border-b border-[#333333] px-4 py-3">
          <h3 className="text-sm font-semibold text-text-primary">
            Gang Memberships ({user.gangMemberships.length})
          </h3>
        </div>
        {user.gangMemberships.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#333333] text-left text-xs uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-2">Gang</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {user.gangMemberships.map((m) => (
                  <tr
                    key={m.gangId}
                    className="border-b border-[#242424] last:border-b-0"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/gangs/${m.gangId}`}
                        className="text-bragg-lime hover:underline"
                      >
                        {m.gangName}
                      </Link>
                    </td>
                    <td className="px-4 py-2 capitalize text-text-secondary">
                      {m.role}
                    </td>
                    <td className="px-4 py-2 capitalize text-text-secondary">
                      {m.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-4 text-sm text-text-muted">No gang memberships.</p>
        )}
      </div>

      {/* Season Standings */}
      <div className="rounded-lg border border-[#333333] bg-[#1a1a1a]">
        <div className="border-b border-[#333333] px-4 py-3">
          <h3 className="text-sm font-semibold text-text-primary">
            Season Standings ({user.seasonStandings.length})
          </h3>
        </div>
        {user.seasonStandings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#333333] text-left text-xs uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-2">Gang</th>
                  <th className="px-4 py-2 text-right">Points</th>
                  <th className="px-4 py-2 text-right">Rank</th>
                  <th className="px-4 py-2 text-right">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {user.seasonStandings.map((s, i) => (
                  <tr
                    key={`${s.gangId}-${s.seasonId}-${i}`}
                    className="border-b border-[#242424] last:border-b-0"
                  >
                    <td className="px-4 py-2 text-text-primary">
                      {s.gangName}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-bragg-lime">
                      {s.totalPoints}
                    </td>
                    <td className="px-4 py-2 text-right text-text-secondary">
                      #{s.rank ?? '—'}
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

      {/* Recent Predictions */}
      <div className="rounded-lg border border-[#333333] bg-[#1a1a1a]">
        <div className="border-b border-[#333333] px-4 py-3">
          <h3 className="text-sm font-semibold text-text-primary">
            Recent Predictions ({user.recentPredictions.length})
          </h3>
        </div>
        {user.recentPredictions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#333333] text-left text-xs uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-2">Scenario</th>
                  <th className="px-4 py-2">Value</th>
                  <th className="px-4 py-2 text-right">Points</th>
                  <th className="px-4 py-2">Result</th>
                  <th className="px-4 py-2">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {user.recentPredictions.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[#242424] last:border-b-0"
                  >
                    <td className="max-w-[200px] truncate px-4 py-2 text-text-primary">
                      {p.scenarioTitle}
                    </td>
                    <td className="px-4 py-2 font-mono text-text-secondary">
                      {p.value}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-bragg-lime">
                      {p.pointsEarned}
                    </td>
                    <td className="px-4 py-2">
                      {p.isCorrect === null ? (
                        <span className="text-text-muted">Pending</span>
                      ) : p.isCorrect ? (
                        <span className="text-green-400">Correct</span>
                      ) : (
                        <span className="text-red-400">Wrong</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-text-muted">
                      {new Date(p.submittedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-4 text-sm text-text-muted">No predictions yet.</p>
        )}
      </div>
    </div>
  )
}
