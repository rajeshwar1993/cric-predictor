import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TEST_PASSWORD, TEST_EMAIL_DOMAIN } from "../fixtures/test-users";

let _client: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing Supabase QA env vars");
    _client = createClient(url, key);
  }
  return _client;
}

// ── User Management ─────────────────────────────────────────────

export async function createTestUser(email: string, displayName: string) {
  const sb = getAdminClient();
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error) throw new Error(`createTestUser(${email}): ${error.message}`);
  return data.user;
}

export async function completeOnboardingForUser(
  userId: string,
  displayName: string,
  dob: string
) {
  const sb = getAdminClient();
  const { error } = await sb
    .from("profiles")
    .update({
      display_name: displayName,
      date_of_birth: dob,
      accepted_terms_at: new Date().toISOString(),
      onboarding_completed: true,
    })
    .eq("id", userId);
  if (error) throw new Error(`completeOnboarding(${userId}): ${error.message}`);
}

export async function deleteTestUser(userId: string) {
  const sb = getAdminClient();
  await sb.auth.admin.deleteUser(userId);
}

export async function deleteAllTestUsers() {
  const sb = getAdminClient();
  const { data } = await sb.auth.admin.listUsers();
  const testUsers = (data?.users || []).filter((u) =>
    u.email?.endsWith(`@${TEST_EMAIL_DOMAIN}`)
  );
  for (const u of testUsers) {
    await sb.auth.admin.deleteUser(u.id);
  }
}

// ── Group Management ────────────────────────────────────────────

export async function createGroup(name: string, ownerUserId: string) {
  const sb = getAdminClient();
  const { data, error } = await sb
    .from("groups")
    .insert({ name, created_by: ownerUserId })
    .select()
    .single();
  if (error) throw new Error(`createGroup: ${error.message}`);

  // Add owner as approved member
  await sb.from("group_members").insert({
    group_id: data.id,
    user_id: ownerUserId,
    status: "approved",
    role: "owner",
    approved_at: new Date().toISOString(),
  });

  return data;
}

export async function addMemberToGroup(
  groupId: string,
  userId: string,
  role: "admin" | "member" = "member",
  status: "approved" | "pending" = "approved"
) {
  const sb = getAdminClient();
  const { error } = await sb.from("group_members").upsert({
    group_id: groupId,
    user_id: userId,
    status,
    role,
    approved_at: status === "approved" ? new Date().toISOString() : null,
  });
  if (error) throw new Error(`addMemberToGroup: ${error.message}`);
}

// ── Match Management ────────────────────────────────────────────

export async function createTestMatch(
  matchNumber: number,
  teamA: string,
  teamB: string,
  date: string,
  timeIst: string,
  status: "upcoming" | "live" | "completed" = "upcoming"
) {
  const sb = getAdminClient();
  const { data, error } = await sb
    .from("matches")
    .insert({
      match_number: matchNumber,
      team_a: teamA,
      team_b: teamB,
      date,
      time_ist: timeIst,
      venue: "Test Stadium",
      status,
    })
    .select()
    .single();
  if (error) throw new Error(`createTestMatch: ${error.message}`);
  return data;
}

export async function updateMatchStatus(
  matchId: number,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const sb = getAdminClient();
  const { error } = await sb
    .from("matches")
    .update({ status, ...extra })
    .eq("id", matchId);
  if (error) throw new Error(`updateMatchStatus: ${error.message}`);
}

export async function setMatchResults(
  matchId: number,
  results: Record<string, unknown>
) {
  const sb = getAdminClient();
  const { error } = await sb
    .from("matches")
    .update({
      status: "completed",
      resolved_at: new Date().toISOString(),
      ...results,
    })
    .eq("id", matchId);
  if (error) throw new Error(`setMatchResults: ${error.message}`);
}

export async function resolveMatchPredictions(matchId: number) {
  const sb = getAdminClient();
  const { error } = await sb.rpc("resolve_match_predictions", {
    p_match_id: matchId,
  });
  if (error) throw new Error(`resolveMatchPredictions: ${error.message}`);
}

// ── Scenario Management ─────────────────────────────────────────

export async function seedSystemScenarios(groupId: string, matchId: number) {
  const sb = getAdminClient();
  const { error } = await sb.rpc("seed_system_scenarios", {
    p_group_id: groupId,
    p_match_id: matchId,
  });
  if (error) throw new Error(`seedSystemScenarios: ${error.message}`);
}

export async function publishScenarios(groupId: string, matchId: number) {
  const sb = getAdminClient();
  const { error } = await sb.from("match_group_settings").upsert({
    group_id: groupId,
    match_id: matchId,
    scenarios_published: true,
  });
  if (error) throw new Error(`publishScenarios: ${error.message}`);
}

export async function getScenarios(groupId: string, matchId: number) {
  const sb = getAdminClient();
  const { data, error } = await sb
    .from("scenarios")
    .select("*")
    .eq("group_id", groupId)
    .eq("match_id", matchId)
    .eq("is_removed", false);
  if (error) throw new Error(`getScenarios: ${error.message}`);
  return data || [];
}

// ── Prediction Management ───────────────────────────────────────

export async function insertPrediction(
  userId: string,
  scenarioId: string,
  value: string
) {
  const sb = getAdminClient();
  const { error } = await sb.from("predictions").upsert({
    user_id: userId,
    scenario_id: scenarioId,
    value,
    submitted_at: new Date().toISOString(),
  });
  if (error) throw new Error(`insertPrediction: ${error.message}`);
}

// ── Cleanup ─────────────────────────────────────────────────────

export async function cleanupTestData() {
  const sb = getAdminClient();

  // Delete test groups (cascades to members, scenarios, predictions)
  const { data: testProfiles } = await sb
    .from("profiles")
    .select("id")
    .like("email", `%@${TEST_EMAIL_DOMAIN}`);

  const testUserIds = (testProfiles || []).map((p) => p.id);
  if (testUserIds.length > 0) {
    // Delete groups created by test users
    await sb.from("groups").delete().in("created_by", testUserIds);
  }

  // Delete test matches (match_number >= 9000 reserved for tests)
  await sb.from("matches").delete().gte("match_number", 9000);

  // Delete all test auth users
  await deleteAllTestUsers();
}
