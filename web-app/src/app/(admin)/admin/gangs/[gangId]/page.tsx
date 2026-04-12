import { ArrowLeft, Shield } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { GangDetailView } from '@/components/admin/gangs/gang-detail'
import { getGangDetail } from '@/lib/dal/admin/gangs'

interface GangDetailPageProps {
  params: Promise<{ gangId: string }>
}

/**
 * ADM-007: Gang Detail page.
 *
 * Shows full gang info, members, and season standings.
 */
export default async function GangDetailPage({ params }: GangDetailPageProps) {
  const { gangId } = await params
  const gang = await getGangDetail(gangId)

  if (!gang) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/gangs"
          className="flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft size={16} />
          Back to Gangs
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Shield size={24} className="text-bragg-lime" />
        <h1 className="text-2xl font-bold text-text-primary">{gang.name}</h1>
      </div>

      <GangDetailView gang={gang} />
    </div>
  )
}
