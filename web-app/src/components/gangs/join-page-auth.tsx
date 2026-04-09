'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle2, Clock, ShieldX, Ban, Users } from 'lucide-react'
import { joinGangByCode } from '@/lib/actions/gangs'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import type { ActionResult, MemberStatus } from '@/types'

/** Gang info needed for the auth join flow. */
interface JoinGang {
  id: string
  name: string
  autoAccept: boolean
}

/** Pre-existing membership info passed from the server. */
interface ExistingMembership {
  status: MemberStatus
  isBlocked: boolean
}

type PostJoinState = 'idle' | 'loading' | 'approved' | 'pending'

export interface JoinPageAuthProps {
  gang: JoinGang
  existingMembership: ExistingMembership | null
  inviteCode: string
  /** Override the server action for testing/Storybook. */
  action?: (
    inviteCode: string,
  ) => Promise<ActionResult<{ gangId: string; status: 'approved' | 'pending' }>>
}

/**
 * Join page for authenticated users.
 *
 * Shows the gang name and a join button. Handles all pre-existing membership
 * states (pending, rejected, blocked) and post-action states (approved, pending).
 *
 * The NavBar and outer layout are rendered by the Server Component page.
 *
 * @see docs/stories/JOIN-001-join-page.md
 */
export function JoinPageAuth({
  gang,
  existingMembership,
  inviteCode,
  action = joinGangByCode,
}: JoinPageAuthProps) {
  const [postJoinState, setPostJoinState] = useState<PostJoinState>('idle')
  const [resultGangId, setResultGangId] = useState<string | null>(null)

  async function handleJoin() {
    setPostJoinState('loading')

    try {
      const result = await action(inviteCode)

      if (result.success) {
        if (result.data?.status === 'approved') {
          setResultGangId(result.data.gangId)
          setPostJoinState('approved')
          toast.success("You're in!")
        } else {
          setPostJoinState('pending')
          toast.success('Request sent! Waiting for admin approval.')
        }
      } else {
        // Handle "already a member" case
        if (result.error.startsWith('already_a_member:')) {
          const gangId = result.error.split(':')[1]
          setResultGangId(gangId ?? gang.id)
          setPostJoinState('approved')
          toast.info("You're already a member of this gang.")
          return
        }
        toast.error(result.error)
        setPostJoinState('idle')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
      setPostJoinState('idle')
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      <h1 className="text-h1 mb-8 text-center text-text-primary">BRAGG</h1>

      <div className="rounded-2xl border border-wire bg-dark-concrete p-6">
        {renderContent()}
      </div>
    </div>
  )

  function renderContent() {
    // Post-action states take priority
    if (postJoinState === 'approved') {
      return (
        <div className="flex flex-col items-center gap-4 text-center">
          <CheckCircle2
            className="size-10 text-bragg-lime"
            aria-hidden="true"
          />
          <h2 className="text-h3 text-text-primary">You&apos;re in!</h2>
          <p className="text-body text-text-secondary">
            You&apos;ve joined{' '}
            <strong className="text-bragg-lime">{gang.name}</strong>
          </p>
          <Button asChild className="w-full">
            <Link href={`/group/${resultGangId ?? gang.id}`}>
              Go to gang
            </Link>
          </Button>
        </div>
      )
    }

    if (postJoinState === 'pending') {
      return (
        <div className="flex flex-col items-center gap-4 text-center">
          <Clock className="size-10 text-vivid-blue" aria-hidden="true" />
          <h2 className="text-h3 text-text-primary">Request sent</h2>
          <p className="text-body text-text-secondary">
            Waiting for admin approval to join{' '}
            <strong className="text-bragg-lime">{gang.name}</strong>
          </p>
          <Button asChild variant="secondary" className="w-full">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      )
    }

    // Pre-existing membership states
    if (existingMembership) {
      // Blocked — always show blocked state, regardless of status
      if (existingMembership.isBlocked) {
        return (
          <div className="flex flex-col items-center gap-4 text-center">
            <Ban className="size-10 text-electric-coral" aria-hidden="true" />
            <h2 className="text-h3 text-text-primary">Access denied</h2>
            <p className="text-body text-text-secondary">
              You are not able to join this gang.
            </p>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        )
      }

      switch (existingMembership.status) {
        case 'pending':
          return (
            <div className="flex flex-col items-center gap-4 text-center">
              <Clock
                className="size-10 text-vivid-blue"
                aria-hidden="true"
              />
              <h2 className="text-h3 text-text-primary">Request pending</h2>
              <p className="text-body text-text-secondary">
                Your request to join{' '}
                <strong className="text-bragg-lime">{gang.name}</strong> is
                pending approval.
              </p>
              <Button asChild variant="secondary" className="w-full">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          )

        case 'rejected':
          return (
            <div className="flex flex-col items-center gap-4 text-center">
              <ShieldX
                className="size-10 text-electric-coral"
                aria-hidden="true"
              />
              <h2 className="text-h3 text-text-primary">
                Previously declined
              </h2>
              <p className="text-body text-text-secondary">
                Your previous request to join{' '}
                <strong className="text-bragg-lime">{gang.name}</strong> was
                declined. Want to try again?
              </p>
              <Button
                onClick={handleJoin}
                disabled={postJoinState === 'loading'}
                className="w-full"
              >
                {postJoinState === 'loading' ? (
                  <>
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                    Requesting...
                  </>
                ) : (
                  'Request again'
                )}
              </Button>
            </div>
          )

        // left/removed — allow rejoin, same as default flow
        case 'left':
        case 'removed':
          break
      }
    }

    // Default: join confirmation
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <Users className="size-10 text-bragg-lime" aria-hidden="true" />
        <h2 className="text-h3 text-text-primary">Join gang</h2>
        <p className="text-body text-text-secondary">
          You&apos;ve been invited to join{' '}
          <strong className="text-bragg-lime">{gang.name}</strong>
        </p>
        <Button
          onClick={handleJoin}
          disabled={postJoinState === 'loading'}
          className="w-full"
        >
          {postJoinState === 'loading' ? (
            <>
              <Loader2
                className="size-4 animate-spin"
                aria-hidden="true"
              />
              Joining...
            </>
          ) : (
            'Join Gang'
          )}
        </Button>
      </div>
    )
  }
}
