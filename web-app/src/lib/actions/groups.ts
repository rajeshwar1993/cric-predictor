"use server";

import { createClient } from "@/lib/supabase/server";
import * as groupsDal from "@/lib/dal/groups";
import * as membersDal from "@/lib/dal/members";
import { createGroupSchema, updateMemberSchema } from "@/lib/validators";
import { LIMITS } from "@/lib/constants";
import type { ActionResponse, Group, MemberRole } from "@/types";

export async function createGroup(name: string): Promise<ActionResponse<Group>> {
  const parsed = createGroupSchema.safeParse({ name });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Rate limit check
  const existingGroups = await groupsDal.getGroupsByUser(user.id);
  if (existingGroups.length >= LIMITS.MAX_GROUPS_PER_USER) {
    return {
      success: false,
      error: `You can create at most ${LIMITS.MAX_GROUPS_PER_USER} groups`,
    };
  }

  const group = await groupsDal.createGroup(parsed.data.name, user.id);
  if (!group) return { success: false, error: "Failed to create group" };

  return { success: true, data: group };
}

export async function joinGroup(inviteCode: string): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const group = await groupsDal.getGroupByInviteCode(inviteCode);
  if (!group) return { success: false, error: "Invalid invite code" };

  // Check existing membership
  const existing = await membersDal.getMembershipStatus(group.id, user.id);
  if (existing?.status === "approved") {
    return { success: false, error: "You are already a member" };
  }
  if (existing?.status === "pending") {
    return { success: false, error: "Your request is pending approval" };
  }

  const ok = await membersDal.requestToJoin(group.id, user.id);
  if (!ok) return { success: false, error: "Failed to submit join request" };

  return { success: true };
}

export async function manageMember(
  groupId: string,
  userId: string,
  action: "approve" | "reject" | "promote" | "demote" | "remove"
): Promise<ActionResponse> {
  const parsed = updateMemberSchema.safeParse({ groupId, userId, action });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Check caller is admin/owner
  const callerMembership = await membersDal.getMembershipStatus(groupId, user.id);
  if (!callerMembership || !["owner", "admin"].includes(callerMembership.role)) {
    return { success: false, error: "Only admins can manage members" };
  }

  let ok = false;
  switch (action) {
    case "approve":
      ok = await membersDal.updateMemberStatus(groupId, userId, "approved");
      break;
    case "reject":
      ok = await membersDal.updateMemberStatus(groupId, userId, "rejected");
      break;
    case "promote":
      if (callerMembership.role !== "owner") {
        return { success: false, error: "Only the owner can promote members" };
      }
      ok = await membersDal.updateMemberRole(groupId, userId, "admin");
      break;
    case "demote":
      if (callerMembership.role !== "owner") {
        return { success: false, error: "Only the owner can demote admins" };
      }
      ok = await membersDal.updateMemberRole(groupId, userId, "member");
      break;
    case "remove": {
      // Prevent removing the owner or self
      const targetMembership = await membersDal.getMembershipStatus(groupId, userId);
      if (targetMembership?.role === "owner") {
        return { success: false, error: "Cannot remove the group owner" };
      }
      if (userId === user.id) {
        return { success: false, error: "Cannot remove yourself" };
      }
      ok = await membersDal.removeMember(groupId, userId);
      break;
    }
  }

  if (!ok) return { success: false, error: `Failed to ${action} member` };
  return { success: true };
}
