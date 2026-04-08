import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Users, Target, TrendingUp, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getUserOverallStats, getUserProfile } from '@/lib/actions/dal-leaderboards'
import { ProfileNameEdit } from '@/components/leaderboards/profile-name-edit'
import { DeleteAccountSection } from '@/components/leaderboards/delete-account-section'

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Profile | Bragg',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateOfBirth(dob: string | null): string {
  if (dob === null || dob === '') return 'Not set'
  try {
    const date = new Date(dob)
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  } catch {
    return dob
  }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    redirect('/login')
  }

  // Fetch profile and stats in parallel
  const [profile, stats] = await Promise.all([
    getUserProfile(user.id),
    getUserOverallStats(user.id),
  ])

  const displayName = profile?.displayName ?? 'Unknown'
  const dateOfBirth = profile?.dateOfBirth ?? null
  const email = user.email ?? ''

  return (
    <div className="flex flex-col gap-[var(--sp-8)]">
      {/* Header */}
      <header>
        <h1 className="font-heading text-3xl font-bold text-[var(--text-primary)]">Profile</h1>
      </header>

      {/* Profile info section */}
      <section className="flex flex-col gap-[var(--sp-4)]" aria-label="Profile information">
        {/* Display name (editable) */}
        <ProfileNameEdit currentName={displayName} />

        {/* Email (read-only) */}
        <div className="flex flex-col gap-[var(--sp-1)]">
          <label className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">
            Email
          </label>
          <span className="text-base text-[var(--text-primary)]">{email}</span>
        </div>

        {/* Date of birth (read-only) */}
        <div className="flex flex-col gap-[var(--sp-1)]">
          <label className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">
            Date of birth
          </label>
          <span className="text-base text-[var(--text-primary)]">
            {formatDateOfBirth(dateOfBirth)}
          </span>
        </div>
      </section>

      {/* Stats overview */}
      <section aria-label="Stats overview">
        <h2 className="mb-[var(--sp-3)] font-heading text-lg font-semibold text-[var(--text-primary)]">
          Stats
        </h2>
        <div className="grid grid-cols-2 gap-[var(--sp-3)]">
          <StatCard
            icon={<Users size={20} strokeWidth={1.5} />}
            label="Gangs"
            value={String(stats.totalGangs)}
          />
          <StatCard
            icon={<Target size={20} strokeWidth={1.5} />}
            label="Matches"
            value={String(stats.totalMatchesPredicted)}
          />
          <StatCard
            icon={<TrendingUp size={20} strokeWidth={1.5} />}
            label="Accuracy"
            value={`${String(stats.overallAccuracyPct)}%`}
          />
          <StatCard
            icon={<Trophy size={20} strokeWidth={1.5} />}
            label="Points"
            value={String(stats.totalPoints)}
          />
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-[var(--border-default)]" role="separator" />

      {/* Delete account */}
      <section aria-label="Account actions">
        <DeleteAccountSection userEmail={email} />
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat Card sub-component
// ---------------------------------------------------------------------------

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="flex flex-col gap-[var(--sp-2)] rounded-[var(--radius-ds-lg)] border border-[var(--border-default)] bg-[var(--bg-raised)] p-[var(--sp-4)]">
      <div className="text-[var(--text-tertiary)]">{icon}</div>
      <span
        className="tabular-nums"
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          fontSize: '2rem',
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
      <span className="text-sm font-medium uppercase tracking-[0.05em] text-[var(--text-secondary)]">
        {label}
      </span>
    </div>
  )
}
