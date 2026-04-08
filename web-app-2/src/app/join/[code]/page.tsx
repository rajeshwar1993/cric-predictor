import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGangByInviteCode, getMembershipStatus } from '@/lib/actions/dal-gangs'
import { GlobalFooter } from '@/components/layout/global-footer'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { Logo } from '@/components/ui/logo'
import {
  UnauthJoinView,
  AuthJoinView,
  PendingRequestView,
} from '@/components/gangs/join-page-client'

interface JoinPageProps {
  params: Promise<{ code: string }>
}

export async function generateMetadata({ params }: JoinPageProps): Promise<Metadata> {
  const { code } = await params
  const gang = await getGangByInviteCode(code)

  if (gang === null) {
    return { title: 'Join | Bragg' }
  }

  return {
    title: `Join ${gang.name} on Bragg`,
    description: `You've been invited to join ${gang.name} on Bragg — the IPL prediction game built for bragging rights.`,
    openGraph: {
      title: `Join ${gang.name} on Bragg`,
      description: `You've been invited to join ${gang.name} on Bragg — the IPL prediction game built for bragging rights.`,
    },
  }
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { code } = await params
  const gang = await getGangByInviteCode(code)

  // Gang not found or deleted
  if (gang === null) {
    return (
      <>
        <PageWrapper className="flex min-h-screen flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-[var(--sp-6)] text-center">
            <Logo size="sm" />
            <h1 className="font-heading text-2xl font-bold text-[var(--text-primary)]">
              Gang not found
            </h1>
            <p className="max-w-[45ch] text-base text-[var(--text-secondary)]">
              This gang no longer exists or the invite link is invalid.
            </p>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-[var(--radius-ds-md)] bg-[var(--brand)] px-6 font-semibold text-[var(--brand-on)] transition-colors hover:bg-[var(--brand-hover)]"
            >
              Go to Bragg
            </Link>
          </div>
        </PageWrapper>
        <GlobalFooter />
      </>
    )
  }

  // Check auth status
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Unauthenticated visitor
  if (user === null) {
    return (
      <>
        <PageWrapper className="flex min-h-screen flex-col items-center justify-center">
          <div className="w-full max-w-[360px] space-y-8">
            <div className="flex justify-center">
              <Logo size="sm" />
            </div>
            <UnauthJoinView code={gang.inviteCode} gangName={gang.name} />
          </div>
        </PageWrapper>
        <GlobalFooter />
      </>
    )
  }

  // Authenticated visitor — check existing membership
  const membershipStatus = await getMembershipStatus(gang.id, user.id)

  if (membershipStatus !== null) {
    if (membershipStatus === 'approved') {
      redirect(`/group/${gang.id}`)
    }

    if (membershipStatus === 'pending') {
      return (
        <>
          <PageWrapper className="flex min-h-screen flex-col items-center justify-center">
            <div className="w-full max-w-[360px] space-y-8">
              <div className="flex justify-center">
                <Logo size="sm" />
              </div>
              <PendingRequestView gangName={gang.name} />
            </div>
          </PageWrapper>
          <GlobalFooter />
        </>
      )
    }
  }

  // Not a member — show join view
  return (
    <>
      <PageWrapper className="flex min-h-screen flex-col items-center justify-center">
        <div className="w-full max-w-[360px] space-y-8">
          <div className="flex justify-center">
            <Logo size="sm" />
          </div>
          <AuthJoinView code={gang.inviteCode} gangName={gang.name} gangId={gang.id} />
        </div>
      </PageWrapper>
      <GlobalFooter />
    </>
  )
}
