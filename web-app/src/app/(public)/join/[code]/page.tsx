import { cache } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import {
  getGangByInviteCode,
  getMembershipStatus,
} from '@/lib/dal/gangs'
import { NavBar } from '@/components/layout/nav-bar'
import { JoinPageUnauth } from '@/components/gangs/join-page-unauth'
import { JoinPageAuth } from '@/components/gangs/join-page-auth'
import { BraggWordmark } from '@/components/ui/bragg-wordmark'

interface JoinPageProps {
  params: Promise<{ code: string }>
}

// Deduplicate RPC call between generateMetadata and page render
const getCachedGang = cache(getGangByInviteCode)

/**
 * Dynamic metadata for the join page — shows the gang name in the title
 * if the invite code resolves to a valid gang and layers Open Graph
 * tags for shareable previews in WhatsApp / iMessage / Twitter.
 */
export async function generateMetadata({
  params,
}: JoinPageProps): Promise<Metadata> {
  const { code } = await params
  const gang = await getCachedGang(code)

  const title = gang ? `Join ${gang.name} on Bragg` : 'Join a Gang'
  const description = gang
    ? `You've been invited to join ${gang.name}. Make predictions, compete on leaderboards.`
    : 'Join a prediction gang on Bragg'

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      url: `/join/${code}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

/**
 * Join page — public route at `/join/[code]`.
 *
 * Handles three states:
 * 1. Invalid code → error message
 * 2. Unauthenticated user → login form with pending invite storage
 * 3. Authenticated user → join confirmation with state handling
 *
 * @see docs/stories/JOIN-001-join-page.md
 */
export default async function JoinPage({ params }: JoinPageProps) {
  const { code } = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch gang info by invite code (public RPC, no auth needed)
  const gang = await getCachedGang(code)

  // Invalid or deleted gang
  if (!gang || gang.isDeleted) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px] text-center">
          <BraggWordmark as="h1" tone="primary" className="mb-4" />
          <div className="rounded-2xl border border-wire bg-dark-concrete p-6">
            <p className="text-body text-text-secondary">
              This invite link is invalid or the gang no longer exists.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Unauthenticated user
  if (!user) {
    return <JoinPageUnauth gangName={gang.name} inviteCode={code} />
  }

  // Authenticated user — check existing membership
  const membership = await getMembershipStatus(gang.id, user.id)

  // Already approved → redirect to gang page
  if (membership?.status === 'approved') {
    redirect(`/group/${gang.id}`)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <NavBar />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <JoinPageAuth
          gang={{
            id: gang.id,
            name: gang.name,
            autoAccept: gang.autoAccept,
          }}
          existingMembership={
            membership
              ? { status: membership.status, isBlocked: membership.isBlocked }
              : null
          }
          inviteCode={code}
        />
      </main>
    </div>
  )
}
