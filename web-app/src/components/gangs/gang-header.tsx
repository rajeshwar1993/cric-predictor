import Link from 'next/link'
import { Settings, ChevronRight } from 'lucide-react'
import { MAX_GANG_MEMBERS } from '@/lib/constants'
import { InviteShare } from '@/components/gangs/invite-share'
import type { GangDetails } from '@/lib/dal/gangs'

export interface GangHeaderProps {
  /** Full gang details from the DAL */
  gang: GangDetails
  /** Whether the current user is the admin */
  isAdmin: boolean
  /** Full invite URL (constructed on the server) */
  inviteUrl: string
  /** Current user's display name for the share text */
  inviterName: string
}

/**
 * GangHeader — displays the gang name, member count, invite actions,
 * and links to Season Standings and (admin-only) Settings.
 *
 * Server Component that composes the InviteShare client island.
 *
 * @see docs/stories/GANG-001-gang-page-header.md
 * @see docs/design-systems/electric-street.md — H1, Body Small, Buttons
 */
export function GangHeader({
  gang,
  isAdmin,
  inviteUrl,
  inviterName,
}: GangHeaderProps) {
  const approvedCount = gang.members.filter(
    (m) => m.status === 'approved',
  ).length

  return (
    <header className="flex flex-col gap-4">
      {/* Gang name + admin settings link */}
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-h1 text-text-primary break-words">
          {gang.name}
        </h1>
        {isAdmin && (
          <Link
            href={`/group/${gang.id}/settings`}
            className="flex shrink-0 items-center justify-center rounded-md p-2 text-text-secondary transition-colors duration-[var(--duration-state)] hover:bg-dark-concrete hover:text-text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-bragg-lime/50"
            aria-label="Gang settings"
          >
            <Settings className="size-5" aria-hidden="true" />
          </Link>
        )}
      </div>

      {/* Member count */}
      <p className="text-body-sm text-text-secondary">
        {approvedCount}/{MAX_GANG_MEMBERS} members
      </p>

      {/* Invite actions */}
      <InviteShare
        inviteUrl={inviteUrl}
        inviteCode={gang.inviteCode}
        gangName={gang.name}
        inviterName={inviterName}
      />

      {/* Season Standings link */}
      <Link
        href={`/group/${gang.id}/standings`}
        className="inline-flex items-center gap-1 text-body-sm font-semibold text-vivid-blue transition-colors duration-[var(--duration-state)] hover:text-bragg-lime focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-bragg-lime/50 rounded"
      >
        Season Standings
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </header>
  )
}
