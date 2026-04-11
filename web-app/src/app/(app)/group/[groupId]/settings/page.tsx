import { cache } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import {
  getGangDetails,
  getGangPredictionDeadline,
} from '@/lib/dal/gangs'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { GangSettingsForm } from '@/components/gangs/gang-settings-form'
import { DeleteGangSection } from '@/components/gangs/delete-gang-section'
import { MemberManagement } from '@/components/gangs/member-management'

interface GangSettingsPageProps {
  params: Promise<{ groupId: string }>
}

// Dedupe the gang fetch between generateMetadata and the render path.
const getCachedGangDetails = cache(getGangDetails)

export async function generateMetadata({
  params,
}: GangSettingsPageProps): Promise<Metadata> {
  const { groupId } = await params
  const gang = await getCachedGangDetails(groupId)

  return {
    title: gang ? `Settings — ${gang.name}` : 'Settings',
    description: gang
      ? `Manage ${gang.name} settings on Bragg`
      : 'Manage your gang settings on Bragg',
  }
}

/**
 * Gang settings page — admin-only.
 *
 * Auth gate: unauthenticated users redirect to /login.
 * Admin gate: non-admin members are redirected back to the gang page.
 * 404: gang not found or soft-deleted.
 *
 * Sections (in order):
 *   1. Gang Info — name, auto-accept
 *   2. Prediction Settings — deadline minutes
 *   3. Member Management — remove/block/unblock members (SET-002)
 *   4. Danger Zone — delete gang
 *
 * @see docs/stories/SET-001-gang-settings.md
 */
export default async function GangSettingsPage({
  params,
}: GangSettingsPageProps) {
  const { groupId } = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Auth gate
  if (!user) {
    redirect('/login')
  }

  // Fetch gang details (shared with generateMetadata via `cache()`)
  const gang = await getCachedGangDetails(groupId)

  // 404 if not found or deleted
  if (!gang) {
    notFound()
  }

  // Admin gate — must be an approved admin
  const membership = gang.members.find((m) => m.userId === user.id)
  if (
    !membership ||
    membership.status !== 'approved' ||
    membership.role !== 'admin'
  ) {
    redirect(`/group/${groupId}`)
  }

  // Prediction deadline lives in v2_gang_league_seasons for the active season.
  // `getGangPredictionDeadline` returns the default when no active row
  // exists yet, so we let real DB errors propagate to the Next.js error
  // boundary instead of masking them as a default value.
  const predictionDeadlineMins = await getGangPredictionDeadline(groupId)

  return (
    <PageWrapper className="py-8">
      {/* Back link */}
      <Link
        href={`/group/${groupId}`}
        className="inline-flex items-center gap-1 text-body-sm text-text-secondary transition-colors duration-[180ms] hover:text-text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-bragg-lime/50 rounded"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to {gang.name}
      </Link>

      {/* Page title */}
      <h1 className="mt-4 text-h1 text-text-primary break-words">
        GANG SETTINGS
      </h1>

      {/* 1. Gang Info + 2. Prediction Settings */}
      <GangSettingsForm
        gangId={gang.id}
        initialName={gang.name}
        initialAutoAccept={gang.autoAccept}
        initialPredictionDeadlineMins={predictionDeadlineMins}
      />

      {/* 3. Member Management */}
      <MemberManagement
        gangId={gang.id}
        members={gang.members}
        currentUserId={user.id}
      />

      {/* 4. Danger Zone */}
      <DeleteGangSection gangId={gang.id} gangName={gang.name} />
    </PageWrapper>
  )
}
