import Link from 'next/link'

import type { BlockedUser } from '@/lib/dal/admin/moderation'

interface BlockedUsersTableProps {
  users: BlockedUser[]
}

export function BlockedUsersTable({ users }: BlockedUsersTableProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-wire bg-dark-concrete p-6">
        <p className="text-sm text-text-muted">No blocked users.</p>
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
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr
                key={`${user.userId}-${user.gangId}-${i}`}
                className="border-b border-mid-concrete last:border-b-0"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/${user.userId}`}
                    className="text-bragg-lime hover:underline"
                  >
                    {user.displayName ?? 'No name'}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/gangs/${user.gangId}`}
                    className="text-bragg-lime hover:underline"
                  >
                    {user.gangName}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
