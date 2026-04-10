import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import {
  getGangDetails,
  getGangPredictionDeadline,
  DEFAULT_PREDICTION_DEADLINE_MINS,
} from '@/lib/dal/gangs'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { GangSettingsForm } from '@/components/gangs/gang-settings-form'
import { DeleteGangSection } from '@/components/gangs/delete-gang-section'

export const metadata: Metadata = {
  title: 'Gang Settings',
  description: 'Manage your gang settings on Bragg',
}

interface GangSettingsPageProps {
  params: Promise<{ groupId: string }>
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
 *   3. Member Management — placeholder (SET-002)
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

  // Fetch gang details
  const gang = await getGangDetails(groupId)

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
  // Falls back to the default when no active row exists yet.
  let predictionDeadlineMins: number
  try {
    predictionDeadlineMins = await getGangPredictionDeadline(groupId)
  } catch {
    predictionDeadlineMins = DEFAULT_PREDICTION_DEADLINE_MINS
  }

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

      {/* 3. Member Management — placeholder (SET-002 fills this in) */}
      <section
        className="mt-8 rounded-lg border border-wire bg-dark-concrete p-6"
        aria-label="Member management"
      >
        <h2 className="text-h3 font-bold uppercase tracking-[0.02em] text-text-primary">
          Member Management
        </h2>
        <p className="mt-2 text-body-sm text-text-secondary">
          Member management coming soon.
        </p>
      </section>

      {/* 4. Danger Zone */}
      <DeleteGangSection gangId={gang.id} gangName={gang.name} />
    </PageWrapper>
  )
}
