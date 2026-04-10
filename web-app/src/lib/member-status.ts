/**
 * Shared member-status helpers.
 *
 * Centralizes the set of departed member statuses so every leaderboard /
 * prediction surface uses the same definition. Avoids duplicating the
 * `['left', 'removed']` literal across the DAL, hooks and components.
 */

import type { MemberStatus } from '@/types'

/**
 * Member statuses that indicate the user has left or been removed from
 * the gang. These rows are visually dimmed and sorted to the bottom of
 * every leaderboard.
 */
export const DEPARTED_STATUSES: ReadonlySet<MemberStatus> = new Set<MemberStatus>([
  'left',
  'removed',
])

/**
 * Returns true when the given member status should be treated as "departed".
 */
export function isDeparted(status: MemberStatus): boolean {
  return DEPARTED_STATUSES.has(status)
}
