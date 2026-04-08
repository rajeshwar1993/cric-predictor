import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getUserGangs } from '@/lib/actions/dal-gangs'
import { EmptyState } from '@/components/ui/empty-state'
import { GangCard } from '@/components/gangs/gang-card'
import { PendingInviteBanner } from '@/components/gangs/pending-invite-banner'
import { CreateGangForm } from '@/components/gangs/create-gang-form'
import { JoinGangForm } from '@/components/gangs/join-gang-form'

export const metadata: Metadata = {
  title: 'Dashboard | Bragg',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    redirect('/login')
  }

  const gangs = await getUserGangs(user.id)

  const hasGangs = gangs.length > 0

  return hasGangs ? (
    <div className="flex flex-col gap-[var(--sp-6)]">
      {/* Pending invite banner */}
      <PendingInviteBanner />

      {/* Gang list */}
      <section aria-label="Your gangs">
        <h1 className="mb-[var(--sp-4)] font-heading text-2xl font-bold text-[var(--text-primary)]">
          Your Gangs
        </h1>
        <div className="flex flex-col gap-[var(--sp-3)]">
          {gangs.map((gang) => (
            <GangCard key={gang.id} gang={gang} />
          ))}
        </div>
      </section>

      {/* Create / Join forms */}
      <section
        className="flex flex-col gap-[var(--sp-6)] rounded-[var(--radius-ds-lg)] border border-[var(--border-default)] bg-[var(--bg-raised)] p-[var(--sp-4)]"
        aria-label="Create or join a gang"
      >
        <div>
          <h2 className="mb-[var(--sp-3)] font-heading text-lg font-semibold text-[var(--text-primary)]">
            Create a gang
          </h2>
          <CreateGangForm />
        </div>
        <div className="border-t border-[var(--border-default)]" role="separator" />
        <div>
          <h2 className="mb-[var(--sp-3)] font-heading text-lg font-semibold text-[var(--text-primary)]">
            Join a gang
          </h2>
          <JoinGangForm />
        </div>
      </section>
    </div>
  ) : (
    <div className="flex flex-col gap-[var(--sp-8)]">
      {/* Pending invite banner */}
      <PendingInviteBanner />

      {/* Empty state */}
      <EmptyState
        icon={<Users size={32} strokeWidth={2} aria-hidden="true" />}
        title="No gangs yet"
        description="Create a gang or join one with an invite code to start predicting."
      />

      {/* Create / Join forms */}
      <div className="flex flex-col gap-[var(--sp-6)] rounded-[var(--radius-ds-lg)] border border-[var(--border-default)] bg-[var(--bg-raised)] p-[var(--sp-4)]">
        <div>
          <h2 className="mb-[var(--sp-3)] font-heading text-lg font-semibold text-[var(--text-primary)]">
            Create a gang
          </h2>
          <CreateGangForm />
        </div>
        <div className="border-t border-[var(--border-default)]" role="separator" />
        <div>
          <h2 className="mb-[var(--sp-3)] font-heading text-lg font-semibold text-[var(--text-primary)]">
            Join a gang
          </h2>
          <JoinGangForm />
        </div>
      </div>
    </div>
  )
}
