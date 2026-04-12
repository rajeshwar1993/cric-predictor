import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IntegrityCheckResult {
  name: string
  category: 'referential' | 'business_logic' | 'scenario'
  status: 'pass' | 'warn' | 'fail'
  message: string
  count: number
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Check for orphaned records — foreign key-like references that don't resolve.
 */
export async function runReferentialChecks(): Promise<IntegrityCheckResult[]> {
  const supabase = createServiceRoleClient()
  const checks: IntegrityCheckResult[] = []

  // Check 1: Gang members referencing non-existent gangs
  const { data: allMembers } = await supabase
    .from('v2_gang_members')
    .select('gang_id')

  const memberGangIds = [...new Set((allMembers ?? []).map((m) => m.gang_id))]

  if (memberGangIds.length > 0) {
    const { data: existingGangs } = await supabase
      .from('v2_gangs')
      .select('id')
      .in('id', memberGangIds)

    const existingGangIds = new Set((existingGangs ?? []).map((g) => g.id))
    const orphanedCount = memberGangIds.filter(
      (id) => !existingGangIds.has(id),
    ).length

    checks.push({
      name: 'Gang Members → Gangs',
      category: 'referential',
      status: orphanedCount > 0 ? 'fail' : 'pass',
      message:
        orphanedCount > 0
          ? `${orphanedCount} gang member(s) reference non-existent gangs`
          : 'All gang members reference valid gangs',
      count: orphanedCount,
    })
  }

  // Check 2: Predictions referencing non-existent scenarios
  const { data: allPredictions } = await supabase
    .from('v2_predictions')
    .select('scenario_id')
    .limit(5000)

  const predScenarioIds = [
    ...new Set((allPredictions ?? []).map((p) => p.scenario_id)),
  ]

  if (predScenarioIds.length > 0) {
    const { data: existingScenarios } = await supabase
      .from('v2_fixture_scenarios')
      .select('id')
      .in('id', predScenarioIds.slice(0, 500))

    const existingScenarioIds = new Set(
      (existingScenarios ?? []).map((s) => s.id),
    )
    const orphanedCount = predScenarioIds
      .slice(0, 500)
      .filter((id) => !existingScenarioIds.has(id)).length

    checks.push({
      name: 'Predictions → Scenarios',
      category: 'referential',
      status: orphanedCount > 0 ? 'fail' : 'pass',
      message:
        orphanedCount > 0
          ? `${orphanedCount} prediction(s) reference non-existent scenarios`
          : 'All sampled predictions reference valid scenarios',
      count: orphanedCount,
    })
  }

  // Check 3: Season standings referencing non-existent gangs
  const { data: standingsGangs } = await supabase
    .from('v2_gang_season_standings')
    .select('gang_id')

  const standingGangIds = [
    ...new Set((standingsGangs ?? []).map((s) => s.gang_id)),
  ]

  if (standingGangIds.length > 0) {
    const { data: existingGangs } = await supabase
      .from('v2_gangs')
      .select('id')
      .in('id', standingGangIds)

    const existingGangIds = new Set((existingGangs ?? []).map((g) => g.id))
    const orphanedCount = standingGangIds.filter(
      (id) => !existingGangIds.has(id),
    ).length

    checks.push({
      name: 'Season Standings → Gangs',
      category: 'referential',
      status: orphanedCount > 0 ? 'fail' : 'pass',
      message:
        orphanedCount > 0
          ? `${orphanedCount} standings row(s) reference non-existent gangs`
          : 'All standings reference valid gangs',
      count: orphanedCount,
    })
  }

  return checks
}

/**
 * Check for business logic constraint violations.
 */
export async function runBusinessLogicChecks(): Promise<IntegrityCheckResult[]> {
  const supabase = createServiceRoleClient()
  const checks: IntegrityCheckResult[] = []

  // Check 1: Predictions with points_earned > 0 but is_correct = false
  const { data: wrongPoints } = await supabase
    .from('v2_predictions')
    .select('id')
    .gt('points_earned', 0)
    .eq('is_correct', false)
    .limit(100)

  const wrongPointsCount = wrongPoints?.length ?? 0
  checks.push({
    name: 'Points on Incorrect Predictions',
    category: 'business_logic',
    status: wrongPointsCount > 0 ? 'warn' : 'pass',
    message:
      wrongPointsCount > 0
        ? `${wrongPointsCount} prediction(s) have points > 0 but marked incorrect`
        : 'No incorrect predictions have positive points',
    count: wrongPointsCount,
  })

  // Check 2: Accuracy > 100%
  const { data: overAccuracy } = await supabase
    .from('v2_gang_season_standings')
    .select('gang_id')
    .gt('accuracy_pct', 100)

  const overAccuracyCount = overAccuracy?.length ?? 0
  checks.push({
    name: 'Accuracy Over 100%',
    category: 'business_logic',
    status: overAccuracyCount > 0 ? 'fail' : 'pass',
    message:
      overAccuracyCount > 0
        ? `${overAccuracyCount} standings row(s) have accuracy > 100%`
        : 'No standings exceed 100% accuracy',
    count: overAccuracyCount,
  })

  // Check 3: Deleted profiles with active gang memberships
  const { data: deletedProfiles } = await supabase
    .from('v2_profiles')
    .select('id')
    .eq('is_deleted', true)

  if (deletedProfiles && deletedProfiles.length > 0) {
    const deletedIds = deletedProfiles.map((p) => p.id)
    const { data: activeMembers } = await supabase
      .from('v2_gang_members')
      .select('user_id')
      .in('user_id', deletedIds.slice(0, 200))
      .eq('status', 'approved')

    const count = activeMembers?.length ?? 0
    checks.push({
      name: 'Deleted Profiles with Active Memberships',
      category: 'business_logic',
      status: count > 0 ? 'warn' : 'pass',
      message:
        count > 0
          ? `${count} deleted profile(s) still have active gang memberships`
          : 'No deleted profiles have active gang memberships',
      count,
    })
  }

  return checks
}

/**
 * Check scenario consistency.
 */
export async function runScenarioChecks(): Promise<IntegrityCheckResult[]> {
  const supabase = createServiceRoleClient()
  const checks: IntegrityCheckResult[] = []

  // Check 1: Resolved scenarios without correct_answer
  const { data: resolvedNoAnswer } = await supabase
    .from('v2_fixture_scenarios')
    .select('id')
    .eq('is_resolved', true)
    .eq('is_voided', false)
    .is('correct_answer', null)
    .limit(100)

  const resolvedNoAnswerCount = resolvedNoAnswer?.length ?? 0
  checks.push({
    name: 'Resolved Without Correct Answer',
    category: 'scenario',
    status: resolvedNoAnswerCount > 0 ? 'warn' : 'pass',
    message:
      resolvedNoAnswerCount > 0
        ? `${resolvedNoAnswerCount} resolved scenario(s) have no correct_answer set`
        : 'All resolved scenarios have correct answers',
    count: resolvedNoAnswerCount,
  })

  // Check 2: Both resolved and voided
  const { data: bothFlags } = await supabase
    .from('v2_fixture_scenarios')
    .select('id')
    .eq('is_resolved', true)
    .eq('is_voided', true)
    .limit(100)

  const bothFlagsCount = bothFlags?.length ?? 0
  checks.push({
    name: 'Both Resolved and Voided',
    category: 'scenario',
    status: bothFlagsCount > 0 ? 'warn' : 'pass',
    message:
      bothFlagsCount > 0
        ? `${bothFlagsCount} scenario(s) are marked both resolved AND voided`
        : 'No scenarios are both resolved and voided',
    count: bothFlagsCount,
  })

  // Check 3: Voided scenarios with predictions that earned points
  const { data: voidedScenarios } = await supabase
    .from('v2_fixture_scenarios')
    .select('id')
    .eq('is_voided', true)
    .limit(200)

  if (voidedScenarios && voidedScenarios.length > 0) {
    const voidedIds = voidedScenarios.map((s) => s.id)
    const { data: pointedPredictions } = await supabase
      .from('v2_predictions')
      .select('id')
      .in('scenario_id', voidedIds)
      .gt('points_earned', 0)
      .limit(100)

    const count = pointedPredictions?.length ?? 0
    checks.push({
      name: 'Points on Voided Scenarios',
      category: 'scenario',
      status: count > 0 ? 'warn' : 'pass',
      message:
        count > 0
          ? `${count} prediction(s) on voided scenarios still have points > 0`
          : 'No predictions on voided scenarios have positive points',
      count,
    })
  }

  return checks
}
