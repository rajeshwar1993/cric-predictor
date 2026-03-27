import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import type { Group, GroupWithMeta } from "@/types";

export async function getGroupById(groupId: string): Promise<Group | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (error) {
    logError({ layer: "dal", operation: "getGroupById", metadata: { groupId } }, error);
    return null;
  }
  return data;
}

export async function getGroupsByUser(userId: string): Promise<GroupWithMeta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_members")
    .select(`
      group_id,
      role,
      groups (
        id,
        name,
        invite_code,
        created_by,
        created_at
      )
    `)
    .eq("user_id", userId)
    .eq("status", "approved");

  if (error || !data) {
    if (error) logError({ layer: "dal", operation: "getGroupsByUser", metadata: { userId } }, error);
    return [];
  }

  // Get member counts per group
  const groupIds = data.map((d) => d.group_id);
  const { data: countData } = await supabase
    .from("group_members")
    .select("group_id")
    .in("group_id", groupIds)
    .eq("status", "approved");

  const memberCounts: Record<string, number> = {};
  countData?.forEach((row) => {
    memberCounts[row.group_id] = (memberCounts[row.group_id] || 0) + 1;
  });

  return data
    .filter((d) => d.groups)
    .map((d) => {
      const group = d.groups as unknown as Group;
      return {
        ...group,
        member_count: memberCounts[group.id] || 0,
        user_role: d.role,
      };
    });
}

export async function getGroupByInviteCode(inviteCode: string): Promise<Group | null> {
  const supabase = await createClient();
  // Use SECURITY DEFINER RPC function to bypass RLS —
  // non-members need to look up groups by invite code to join.
  const { data, error } = await supabase
    .rpc("get_group_by_invite_code", { p_invite_code: inviteCode });

  if (error) {
    logError({ layer: "dal", operation: "getGroupByInviteCode", metadata: { inviteCode } }, error);
    return null;
  }
  // RPC returns an array; take the first row
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? null;
}

export async function createGroup(
  name: string,
  createdBy: string
): Promise<Group | null> {
  const supabase = await createClient();

  // Atomic: creates group + adds creator as owner in a single transaction.
  // If either fails, both roll back — no orphaned groups.
  const { data, error } = await supabase.rpc("create_group_with_owner", {
    p_name: name,
    p_created_by: createdBy,
  });

  if (error) {
    logError({ layer: "dal", operation: "createGroup", metadata: { name, createdBy } }, error);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return row ?? null;
}
