import { ArrowLeft, Users } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { UserDetailView } from '@/components/admin/users/user-detail'
import { getUserDetail } from '@/lib/dal/admin/users'

interface UserDetailPageProps {
  params: Promise<{ userId: string }>
}

/**
 * ADM-006: User Detail page.
 *
 * Shows full profile, gang memberships, standings, and predictions for a user.
 */
export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { userId } = await params
  const user = await getUserDetail(userId)

  if (!user) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/users"
          className="flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft size={16} />
          Back to Users
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Users size={24} className="text-bragg-lime" />
        <h1 className="text-2xl font-bold text-text-primary">
          {user.displayName ?? user.email}
        </h1>
      </div>

      <UserDetailView user={user} />
    </div>
  )
}
