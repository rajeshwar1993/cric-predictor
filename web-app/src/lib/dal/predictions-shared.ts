/**
 * Client-safe shared types and constants for the predictions DAL.
 *
 * Kept in a separate module so client components and hooks can import them
 * without pulling in `createServerClient` (which depends on `next/headers`).
 */

import type { MemberStatus, ResolutionPhase, ScenarioInputType } from '@/types'

// ---------------------------------------------------------------------------
// Phase ordering and labels
// ---------------------------------------------------------------------------

/**
 * Canonical order of resolution phases for display.
 */
export const PHASE_ORDER: ResolutionPhase[] = [
  'toss',
  'first_wicket',
  'team_powerplay_end',
  'mid_match',
  'team_innings_end',
  'end',
  'post_match',
]

/**
 * Human-readable labels for each resolution phase.
 */
export const PHASE_LABELS: Record<ResolutionPhase, string> = {
  toss: 'TOSS',
  first_wicket: 'FIRST WICKET',
  team_powerplay_end: 'POWERPLAY',
  mid_match: 'DURING MATCH',
  team_innings_end: 'INNINGS END',
  end: 'MATCH END',
  post_match: 'POST MATCH',
}

// ---------------------------------------------------------------------------
// Match Predictions Matrix (LDB-002)
// ---------------------------------------------------------------------------

/**
 * Member row in the prediction reveal matrix — ordered by match leaderboard rank.
 */
export interface MatchPredictionMember {
  userId: string
  displayName: string | null
  avatarUrl: string | null
  memberStatus: MemberStatus
  rank: number | null
}

/**
 * Lightweight scenario shape for the prediction reveal matrix.
 * Uses `points` (not `points_weight`) per story requirements.
 */
export interface MatchPredictionScenario {
  id: string
  title: string
  points: number
  inputType: ScenarioInputType
  correctAnswer: string | null
  isResolved: boolean
  isVoided: boolean
}

/** A single prediction cell: one user's answer for one scenario. */
export interface MatchPredictionCell {
  value: string
  isCorrect: boolean | null
  pointsEarned: number
}

/** A phase group in the reveal matrix (e.g., TOSS, FIRST WICKET). */
export interface MatchPredictionPhaseGroup {
  phase: ResolutionPhase
  label: string
  scenarios: MatchPredictionScenario[]
}

/** Team lookup entry (for resolving team UUIDs in `team_select` values). */
export interface MatchPredictionTeam {
  code: string
  name: string
  color: string
}

/** Player lookup entry (for resolving player UUIDs in `player_select` values). */
export interface MatchPredictionPlayer {
  name: string
}

/**
 * Full dataset returned by `getMatchPredictions`, shaped for matrix rendering.
 *
 * - `members`: leaderboard-ordered rows (active first, departed last).
 * - `phases`: scenarios grouped by resolution phase, in canonical order.
 * - `predictionsByScenarioByUser`: O(1) cell lookup map.
 * - `teamsById` / `playersById`: UUID → display lookup for cell rendering.
 */
export interface MatchPredictionsDataset {
  members: MatchPredictionMember[]
  phases: MatchPredictionPhaseGroup[]
  predictionsByScenarioByUser: Map<string, Map<string, MatchPredictionCell>>
  teamsById: Record<string, MatchPredictionTeam>
  playersById: Record<string, MatchPredictionPlayer>
}
