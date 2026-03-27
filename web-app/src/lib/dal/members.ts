import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import type { GroupMember, MemberRole, MemberStatus } from "@/types";

export async function getMembers(groupId: string): Promise<GroupMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_members")
    .select(`
      *,
      profile:profiles (
        id,
        display_name,
        email,
        avatar_url
      )
    `)
    .eq("group_id", groupId)
    .eq("status", "approved")
    .order("role", { ascending: true });

  if (error || !data) {
    if (error) logError({ layer: "dal", operation: "getMembers", metadata: { groupId } }, error);
    return [];
  }
  return data
    .filter((d) => d.profile != null)
    .map((d) => ({
      ...d,
      profile: d.profile as unknown as GroupMember["profile"],
    }));
}

export async function getPendingRequests(groupId: string): Promise<GroupMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_members")
    .select(`
      *,
      profile:profiles (
        id,
        display_name,
        email,
        avatar_url
      )
    `)
    .eq("group_id", groupId)
    .eq("status", "pending")
    .order("joined_at", { ascending: true });

  if (error || !data) {
    if (error) logError({ layer: "dal", operation: "getPendingRequests", metadata: { groupId } }, error);
    return [];
  }
  return data
    .filter((d) => d.profile != null)
    .map((d) => ({
      ...d,
      profile: d.profile as unknown as GroupMember["profile"],
    }));
}

export async function getMembershipStatus(
  groupId: string,
  userId: string
): Promise<{ status: MemberStatus; role: MemberRole } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_members")
    .select("status, role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single();

  if (error) {
    logError({ layer: "dal", operation: "getMembershipStatus", metadata: { groupId, userId } }, error);
    return null;
  }
  return data;
}

export async function requestToJoin(groupId: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("group_members").upsert(
    {
      group_id: groupId,
      user_id: userId,
      status: "pending",
      role: "member",
    },
    { onConflict: "group_id,user_id" }
  );
  if (error) logError({ layer: "dal", operation: "requestToJoin", metadata: { groupId, userId } }, error);
  return !error;
}

export async function updateMemberStatus(
  groupId: string,
  userId: string,
  status: MemberStatus
): Promise<{ ok: boolean; capacityExceeded?: boolean }> {
  const supabase = await createClient();
  const updateData: Record<string, unknown> = { status };
  if (status === "approved") {
    updateData.approved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("group_members")
    .update(updateData)
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) {
    logError({ layer: "dal", operation: "updateMemberStatus", metadata: { groupId, userId, status } }, error);
    // DB trigger raises check_violation when group is full
    const isCapacity = error.message?.includes("Group capacity exceeded");
    return { ok: false, capacityExceeded: isCapacity };
  }
  return { ok: true };
}

export async function updateMemberRole(
  groupId: string,
  userId: string,
  role: MemberRole
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("group_members")
    .update({ role })
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) logError({ layer: "dal", operation: "updateMemberRole", metadata: { groupId, userId, role } }, error);
  return !error;
}

export async function removeMember(groupId: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("group_members")
    .update({ status: "removed" as MemberStatus })
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) logError({ layer: "dal", operation: "removeMember", metadata: { groupId, userId } }, error);
  return !error;
}
