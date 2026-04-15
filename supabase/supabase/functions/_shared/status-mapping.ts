// =============================================================================
// Shared Sportmonks status → internal status mapping
//
// Single source of truth for all edge functions (sync-fixtures, live-poll,
// cleanup-stale-fixtures). Prevents mapping inconsistencies across functions.
// =============================================================================

import { isMatchFinished } from './sportmonks-extractors.ts';

export type InternalStatus =
  | 'upcoming'
  | 'live'
  | 'completed'
  | 'abandoned'
  | 'no_result';

/**
 * Map a raw Sportmonks fixture status string to our internal status enum.
 *
 * Uses `startsWith('aban')` instead of exact match to handle Sportmonks
 * variants like "Aban", "Aban.", "Abandoned" (the API is inconsistent).
 */
export function mapSmStatusToInternal(smStatus: string): InternalStatus {
  const lower = smStatus.toLowerCase();

  // Not started
  if (lower === 'ns' || lower === 'not started') {
    return 'upcoming';
  }

  // Live / in-progress
  if (
    lower === '1st innings' ||
    lower === '2nd innings' ||
    lower === 'innings break' ||
    lower === 'stump' ||
    lower === 'live'
  ) {
    return 'live';
  }

  // Finished (Finished, Won, Draw)
  if (isMatchFinished(lower)) {
    return 'completed';
  }

  // Abandoned — startsWith catches "aban", "aban.", "abandoned"
  if (lower.startsWith('aban') || lower === 'cancl' || lower === 'cancelled' || lower === 'aborted') {
    return 'abandoned';
  }

  // No result
  if (lower === 'no result' || lower === 'n/r') {
    return 'no_result';
  }

  // Postponed/suspended — map to upcoming (IPL matches get rescheduled)
  if (lower === 'postp' || lower === 'postponed' || lower === 'suspended' || lower === 'delayed') {
    return 'upcoming';
  }

  // Default: treat unknown as upcoming
  return 'upcoming';
}
