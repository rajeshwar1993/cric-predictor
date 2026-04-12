/**
 * Test user constants for the E2E suite.
 *
 * 8 users with NATO phonetic alphabet display names.
 * All share a single strong password (these are throwaway staging accounts).
 */

export const TEST_USER_COUNT = 8
export const TEST_USER_EMAIL_DOMAIN = 'bragg-test.local'
export const TEST_USER_PASSWORD = 'E2eTestP@ssw0rd!2026'

export const TEST_USERS = [
  { index: 0, email: 'e2e-user-0@bragg-test.local', displayName: 'TestUser Alpha' },
  { index: 1, email: 'e2e-user-1@bragg-test.local', displayName: 'TestUser Bravo' },
  { index: 2, email: 'e2e-user-2@bragg-test.local', displayName: 'TestUser Charlie' },
  { index: 3, email: 'e2e-user-3@bragg-test.local', displayName: 'TestUser Delta' },
  { index: 4, email: 'e2e-user-4@bragg-test.local', displayName: 'TestUser Echo' },
  { index: 5, email: 'e2e-user-5@bragg-test.local', displayName: 'TestUser Foxtrot' },
  { index: 6, email: 'e2e-user-6@bragg-test.local', displayName: 'TestUser Golf' },
  { index: 7, email: 'e2e-user-7@bragg-test.local', displayName: 'TestUser Hotel' },
] as const

export type TestUser = (typeof TEST_USERS)[number]
