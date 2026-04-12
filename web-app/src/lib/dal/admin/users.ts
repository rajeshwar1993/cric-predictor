import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserMetrics {
  total: number
  active: number
  notOnboarded: number
  deleted: number
  neverPredicted: number
}

export interface DailySignup {
  date: string
  count: number
}

export interface UserSearchResult {
  id: string
  displayName: string | null
  email: string
  onboardingCompleted: boolean
  isDeleted: boolean
  createdAt: string
}

export interface UserGangMembership {
  gangId: string
  gangName: string
  role: string
  status: string
}

export interface UserSeasonStanding {
  gangId: string
  gangName: string
  seasonId: string
  totalPoints: number
  rank: number | null
  accuracyPct: number
}

export interface UserRecentPrediction {
  id: string
  fixtureId: string
  scenarioTitle: string
  value: string
  isCorrect: boolean | null
  pointsEarned: number
  submittedAt: string
}

export interface UserDetail {
  id: string
  displayName: string | null
  email: string
  dateOfBirth: string | null
  onboardingCompleted: boolean
  isDeleted: boolean
  isSystemAdmin: boolean
  createdAt: string
  gangMemberships: UserGangMembership[]
  seasonStandings: UserSeasonStanding[]
  recentPredictions: UserRecentPrediction[]
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get aggregate user metrics.
 */
export async function getUserMetrics(): Promise<UserMetrics> {
  const supabase = createServiceRoleClient()

  const { data: profiles, error } = await supabase
    .from('v2_profiles')
    .select('id, onboarding_completed, is_deleted')

  if (error) throw new Error(`getUserMetrics failed: ${error.message}`)

  const rows = profiles ?? []
  const total = rows.length
  const deleted = rows.filter((r) => r.is_deleted).length
  const active = rows.filter((r) => !r.is_deleted && r.onboarding_completed).length
  const notOnboarded = rows.filter(
    (r) => !r.is_deleted && !r.onboarding_completed,
  ).length

  // Users who never made a prediction
  const { count: predictionUserCount } = await supabase
    .from('v2_predictions')
    .select('user_id', { count: 'exact', head: true })

  // Get distinct user IDs who have predicted
  const { data: predictors } = await supabase
    .from('v2_predictions')
    .select('user_id')

  const uniquePredictors = new Set((predictors ?? []).map((p) => p.user_id))
  const activeUserIds = rows
    .filter((r) => !r.is_deleted)
    .map((r) => r.id)
  const neverPredicted = activeUserIds.filter(
    (id) => !uniquePredictors.has(id),
  ).length

  return {
    total,
    active,
    notOnboarded,
    deleted,
    neverPredicted: predictionUserCount === 0 ? activeUserIds.length : neverPredicted,
  }
}

/**
 * Get daily signup counts for the last N days.
 */
export async function getUserGrowth(days: number): Promise<DailySignup[]> {
  const supabase = createServiceRoleClient()

  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceISO = since.toISOString()

  const { data, error } = await supabase
    .from('v2_profiles')
    .select('created_at')
    .gte('created_at', sinceISO)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`getUserGrowth failed: ${error.message}`)

  const rows = data ?? []
  const dailyMap = new Map<string, number>()

  for (const row of rows) {
    const date = row.created_at.substring(0, 10) // YYYY-MM-DD
    dailyMap.set(date, (dailyMap.get(date) ?? 0) + 1)
  }

  // Fill in missing days with 0
  const result: DailySignup[] = []
  const current = new Date(since)
  const today = new Date()
  while (current <= today) {
    const dateStr = current.toISOString().substring(0, 10)
    result.push({ date: dateStr, count: dailyMap.get(dateStr) ?? 0 })
    current.setDate(current.getDate() + 1)
  }

  return result
}

/**
 * Search users by email or display_name.
 */
export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const supabase = createServiceRoleClient()
  const pattern = `%${query}%`

  const { data, error } = await supabase
    .from('v2_profiles')
    .select('id, display_name, email, onboarding_completed, is_deleted, created_at')
    .or(`email.ilike.${pattern},display_name.ilike.${pattern}`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(`searchUsers failed: ${error.message}`)

  return (data ?? []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    onboardingCompleted: row.onboarding_completed,
    isDeleted: row.is_deleted,
    createdAt: row.created_at,
  }))
}

/**
 * Get detailed user info including gang memberships, standings, and predictions.
 */
export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  const supabase = createServiceRoleClient()

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('v2_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (profileError)
    throw new Error(`getUserDetail profile failed: ${profileError.message}`)
  if (!profile) return null

  // Fetch gang memberships
  const { data: memberships } = await supabase
    .from('v2_gang_members')
    .select('gang_id, role, status')
    .eq('user_id', userId)

  // Get gang names for memberships
  const gangIds = (memberships ?? []).map((m) => m.gang_id)
  const { data: gangs } = await supabase
    .from('v2_gangs')
    .select('id, name')
    .in('id', gangIds.length > 0 ? gangIds : ['__none__'])

  const gangNameMap = new Map((gangs ?? []).map((g) => [g.id, g.name]))

  const gangMemberships: UserGangMembership[] = (memberships ?? []).map((m) => ({
    gangId: m.gang_id,
    gangName: gangNameMap.get(m.gang_id) ?? 'Unknown',
    role: m.role,
    status: m.status,
  }))

  // Fetch season standings
  const { data: standings } = await supabase
    .from('v2_gang_season_standings')
    .select('gang_id, season_id, total_points, rank, accuracy_pct')
    .eq('user_id', userId)

  const standingGangIds = (standings ?? []).map((s) => s.gang_id)
  const { data: standingGangs } = await supabase
    .from('v2_gangs')
    .select('id, name')
    .in('id', standingGangIds.length > 0 ? standingGangIds : ['__none__'])

  const standingGangNameMap = new Map(
    (standingGangs ?? []).map((g) => [g.id, g.name]),
  )

  const seasonStandings: UserSeasonStanding[] = (standings ?? []).map((s) => ({
    gangId: s.gang_id,
    gangName: standingGangNameMap.get(s.gang_id) ?? 'Unknown',
    seasonId: s.season_id,
    totalPoints: s.total_points,
    rank: s.rank,
    accuracyPct: s.accuracy_pct,
  }))

  // Fetch recent predictions (last 20)
  const { data: predictions } = await supabase
    .from('v2_predictions')
    .select('id, fixture_id, scenario_id, value, is_correct, points_earned, submitted_at')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(20)

  // Get scenario titles
  const scenarioIds = (predictions ?? []).map((p) => p.scenario_id)
  const { data: scenarios } = await supabase
    .from('v2_fixture_scenarios')
    .select('id, title')
    .in('id', scenarioIds.length > 0 ? scenarioIds : ['__none__'])

  const scenarioTitleMap = new Map(
    (scenarios ?? []).map((s) => [s.id, s.title]),
  )

  const recentPredictions: UserRecentPrediction[] = (predictions ?? []).map(
    (p) => ({
      id: p.id,
      fixtureId: p.fixture_id,
      scenarioTitle: scenarioTitleMap.get(p.scenario_id) ?? 'Unknown',
      value: p.value,
      isCorrect: p.is_correct,
      pointsEarned: p.points_earned,
      submittedAt: p.submitted_at,
    }),
  )

  return {
    id: profile.id,
    displayName: profile.display_name,
    email: profile.email,
    dateOfBirth: profile.date_of_birth,
    onboardingCompleted: profile.onboarding_completed,
    isDeleted: profile.is_deleted,
    isSystemAdmin: profile.is_system_admin,
    createdAt: profile.created_at,
    gangMemberships,
    seasonStandings,
    recentPredictions,
  }
}
