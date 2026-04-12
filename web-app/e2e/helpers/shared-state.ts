/**
 * Shared runtime state that persists across sequential test suites.
 *
 * Since suites run in order (01 → 02 → ...) and depend on state from
 * previous suites (e.g., Gang A's ID created in Suite 02 is needed in
 * Suite 03), this module reads/writes a JSON file on disk.
 *
 * File: e2e/.shared-state.json (gitignored)
 */
import fs from 'fs'
import path from 'path'

const STATE_PATH = path.resolve(__dirname, '../.shared-state.json')

export interface GangState {
  id: string
  inviteCode: string
}

export interface FixtureState {
  id: string
}

export interface SharedState {
  gangs: {
    gangA?: GangState
    gangB?: GangState
    gangC?: GangState
  }
  fixtures: {
    fixtureX?: FixtureState
    fixtureY?: FixtureState
  }
  leagueSeason?: {
    leagueId: string
    seasonId: string
  }
  /** Track which teams are used for test fixtures */
  teams?: {
    teamA?: { id: string; code: string }
    teamB?: { id: string; code: string }
  }
}

export function getSharedState(): SharedState {
  if (!fs.existsSync(STATE_PATH)) {
    return { gangs: {}, fixtures: {} }
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'))
}

export function updateSharedState(partial: Partial<SharedState>): void {
  const current = getSharedState()
  const merged: SharedState = {
    ...current,
    ...partial,
    gangs: { ...current.gangs, ...partial.gangs },
    fixtures: { ...current.fixtures, ...partial.fixtures },
    teams: { ...current.teams, ...partial.teams },
  }
  fs.writeFileSync(STATE_PATH, JSON.stringify(merged, null, 2))
}

export function deleteSharedState(): void {
  if (fs.existsSync(STATE_PATH)) {
    fs.unlinkSync(STATE_PATH)
  }
}
