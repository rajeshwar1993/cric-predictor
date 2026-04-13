import Link from 'next/link'

import type { PendingRequest } from '@/lib/dal/admin/moderation'

interface PendingRequestsTableProps {
  requests: PendingRequest[]
}

export function PendingRequestsTable({ requests }: PendingRequestsTableProps) {
  if (requests.length === 0) {
    return (
      <div className="rounded-lg border border-wire bg-dark-concrete p-6">
        <p className="text-sm text-text-muted">No pending join requests.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-wire bg-dark-concrete">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-wire text-left text-xs uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Gang</th>
              <th className="px-4 py-3">Requested</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req, i) => (
              <tr
                key={`${req.userId}-${req.gangId}-${i}`}
                className="border-b border-mid-concrete last:border-b-0"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/${req.userId}`}
                    className="text-bragg-lime hover:underline"
                  >
                    {req.displayName ?? 'No name'}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary">{req.email}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/gangs/${req.gangId}`}
                    className="text-bragg-lime hover:underline"
                  >
                    {req.gangName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-muted">
                  {new Date(req.requestedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
