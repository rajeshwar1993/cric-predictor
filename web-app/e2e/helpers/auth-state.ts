/**
 * Manages the shared auth state file written by global-setup
 * and read by individual test suites.
 *
 * File: e2e/.auth-state.json (gitignored)
 */
import fs from 'fs'
import path from 'path'

const AUTH_STATE_PATH = path.resolve(__dirname, '../.auth-state.json')

export interface AuthStateUser {
  index: number
  email: string
  password: string
  userId: string
  displayName: string
}

export interface AuthState {
  users: AuthStateUser[]
  createdAt: string
}

export function writeAuthState(state: AuthState): void {
  fs.writeFileSync(AUTH_STATE_PATH, JSON.stringify(state, null, 2))
}

export function readAuthState(): AuthState {
  if (!fs.existsSync(AUTH_STATE_PATH)) {
    throw new Error('Auth state file not found. Did global-setup.ts run successfully?')
  }
  return JSON.parse(fs.readFileSync(AUTH_STATE_PATH, 'utf-8'))
}

export function deleteAuthState(): void {
  if (fs.existsSync(AUTH_STATE_PATH)) {
    fs.unlinkSync(AUTH_STATE_PATH)
  }
}
