import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getGangDetails, getGangMembers } from '@/lib/actions/dal-gangs'
import { Separator } from '@/components/ui/separator'
import {
  GangNameEditor,
  AutoAcceptToggle,
  PredictionDeadlineEditor,
} from '@/components/gangs/gang-settings-form'
import { MemberManagement } from '@/components/gangs/member-management'
import { DeleteGangSection } from '@/components/gangs/delete-gang-section'

interface SettingsPageProps {
  params: Promise<{ groupId: string }>
}

export async function generateMetadata({ params }: SettingsPageProps): Promise<Metadata> {
  const { groupId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    return { title: 'Settings | Bragg' }
  }

  const gang = await getGangDetails(groupId, user.id)
  if (gang === null) {
    return { title: 'Settings | Bragg' }
  }

  return { title: `Settings \u2014 ${gang.name} | Bragg` }
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { groupId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    redirect('/login')
  }

  const gang = await getGangDetails(groupId, user.id)

  if (gang === null) {
    redirect('/dashboard')
  }

  // Admin check
  if (gang.currentUserRole !== 'admin') {
    redirect(`/group/${groupId}`)
  }

  // Fetch all members (all statuses) for member management
  const allMembers = await getGangMembers(groupId, user.id)

  return (
    <div className="flex flex-col gap-[var(--sp-8)]">
      {/* Back link */}
      <Link
        href={`/group/${groupId}`}
        className="inline-flex items-center gap-[var(--sp-1)] text-sm transition-colors hover:opacity-80 focus-visible:rounded-[var(--radius-sm)] focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:outline-none"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ChevronLeft size={16} strokeWidth={1.5} aria-hidden="true" />
        Back to gang
      </Link>

      {/* Page title */}
      <header>
        <h1 className="font-heading text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Gang Settings
        </h1>
        <p className="mt-[var(--sp-1)] text-sm" style={{ color: 'var(--text-secondary)' }}>
          {gang.name}
        </p>
      </header>

      {/* Gang name editor */}
      <section aria-label="Edit gang name">
        <h2
          className="mb-[var(--sp-3)] font-heading text-lg font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Name
        </h2>
        <GangNameEditor gangId={groupId} currentName={gang.name} />
      </section>

      <Separator className="bg-[var(--border-default)]" />

      {/* Auto-accept toggle */}
      <section aria-label="Auto-accept setting">
        <AutoAcceptToggle gangId={groupId} currentValue={gang.autoAccept} />
      </section>

      <Separator className="bg-[var(--border-default)]" />

      {/* Prediction deadline */}
      <section aria-label="Prediction deadline setting">
        <h2
          className="mb-[var(--sp-3)] font-heading text-lg font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Prediction Deadline
        </h2>
        <PredictionDeadlineEditor gangId={groupId} currentMins={gang.predictionDeadlineMins} />
      </section>

      <Separator className="bg-[var(--border-default)]" />

      {/* Member management */}
      <MemberManagement gangId={groupId} members={allMembers} />

      <Separator className="bg-[var(--border-default)]" />

      {/* Danger zone — delete gang */}
      <DeleteGangSection gangId={groupId} gangName={gang.name} />
    </div>
  )
}
