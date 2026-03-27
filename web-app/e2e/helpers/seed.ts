import {
  createTestUser,
  completeOnboardingForUser,
  createGroup,
  addMemberToGroup,
  createTestMatch,
  seedSystemScenarios,
  publishScenarios,
} from "./supabase-admin";
import { TEST_USERS } from "../fixtures/test-users";

export interface TestEnvironment {
  users: {
    owner: { id: string; email: string };
    admin: { id: string; email: string };
    member: { id: string; email: string };
    pending: { id: string; email: string };
    outsider: { id: string; email: string };
  };
  group: { id: string; name: string; invite_code: string };
  matches: { match1: { id: number }; match2: { id: number } };
}

/**
 * Create a complete test environment:
 * - 5 users (owner, admin, member, pending, outsider) — all onboarded
 * - 1 group with owner, admin (approved), member (approved), pending (pending)
 * - 2 upcoming matches with system scenarios seeded & published
 */
export async function seedFullTestEnvironment(): Promise<TestEnvironment> {
  // Create all users
  const owner = await createTestUser(
    TEST_USERS.owner.email,
    TEST_USERS.owner.displayName
  );
  const admin = await createTestUser(
    TEST_USERS.admin.email,
    TEST_USERS.admin.displayName
  );
  const member = await createTestUser(
    TEST_USERS.member.email,
    TEST_USERS.member.displayName
  );
  const pending = await createTestUser(
    TEST_USERS.pending.email,
    TEST_USERS.pending.displayName
  );
  const outsider = await createTestUser(
    TEST_USERS.outsider.email,
    TEST_USERS.outsider.displayName
  );

  // Complete onboarding for all
  for (const [user, cfg] of [
    [owner, TEST_USERS.owner],
    [admin, TEST_USERS.admin],
    [member, TEST_USERS.member],
    [pending, TEST_USERS.pending],
    [outsider, TEST_USERS.outsider],
  ] as const) {
    await completeOnboardingForUser(user.id, cfg.displayName, cfg.dob);
  }

  // Create group + memberships
  const group = await createGroup("E2E Test Squad", owner.id);
  await addMemberToGroup(group.id, admin.id, "admin", "approved");
  await addMemberToGroup(group.id, member.id, "member", "approved");
  await addMemberToGroup(group.id, pending.id, "member", "pending");

  // Create 2 upcoming test matches (match numbers 9001, 9002 — reserved for tests)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split("T")[0];

  const match1 = await createTestMatch(9001, "RCB", "SRH", dateStr, "19:30:00");
  const match2 = await createTestMatch(9002, "CSK", "MI", dateStr, "15:30:00");

  // Seed system scenarios for both matches in the group
  await seedSystemScenarios(group.id, match1.id);
  await seedSystemScenarios(group.id, match2.id);

  // Publish scenarios so members can predict
  await publishScenarios(group.id, match1.id);
  await publishScenarios(group.id, match2.id);

  return {
    users: {
      owner: { id: owner.id, email: TEST_USERS.owner.email },
      admin: { id: admin.id, email: TEST_USERS.admin.email },
      member: { id: member.id, email: TEST_USERS.member.email },
      pending: { id: pending.id, email: TEST_USERS.pending.email },
      outsider: { id: outsider.id, email: TEST_USERS.outsider.email },
    },
    group: {
      id: group.id,
      name: group.name,
      invite_code: group.invite_code,
    },
    matches: {
      match1: { id: match1.id },
      match2: { id: match2.id },
    },
  };
}
