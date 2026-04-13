import type { DeletedAccount } from '@/lib/dal/admin/moderation'

interface DeletedAccountsTableProps {
  accounts: DeletedAccount[]
}

export function DeletedAccountsTable({ accounts }: DeletedAccountsTableProps) {
  if (accounts.length === 0) {
    return (
      <div className="rounded-lg border border-wire bg-dark-concrete p-6">
        <p className="text-sm text-text-muted">No deleted accounts.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-wire bg-dark-concrete">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-wire text-left text-xs uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Deleted</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr
                key={account.id}
                className="border-b border-mid-concrete last:border-b-0"
              >
                <td className="px-4 py-3 text-text-primary">
                  {account.displayName ?? 'No name'}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {account.email}
                </td>
                <td className="px-4 py-3 text-text-muted">
                  {new Date(account.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-text-muted">
                  {account.deletedAt
                    ? new Date(account.deletedAt).toLocaleDateString()
                    : 'Unknown'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
