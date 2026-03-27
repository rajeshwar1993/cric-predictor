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
  const { data, error } = await supabase
    .rpc("get_group_by_invite_code", { p_invite_code: inviteCode })
    .single();

  if (error) {
    logError({ layer: "dal", operation: "getGroupByInviteCode", metadata: { inviteCode } }, error);
    return null;
  }
  return data as Group;
}

export async function createGroup(
  name: string,
  createdBy: string
): Promise<Group | null> {
  const supabase = await createClient();

  // Create the group
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({ name, created_by: createdBy })
    .select()
    .single();

  if (groupError || !group) {
    if (groupError) logError({ layer: "dal", operation: "createGroup", metadata: { name, createdBy } }, groupError);
    return null;
  }

  // Add creator as owner
  const { error: memberError } = await supabase
    .from("group_members")
    .insert({
      group_id: group.id,
      user_id: createdBy,
      status: "approved",
      role: "owner",
      approved_at: new Date().toISOString(),
    });

  if (memberError) {
    logError({ layer: "dal", operation: "createGroup", metadata: { groupId: group.id, createdBy } }, memberError);
    return null;
  }

  return group;
}
