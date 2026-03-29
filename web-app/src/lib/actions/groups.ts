"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logError, logInfo } from "@/lib/logger";
import { trackServerEvent, ANALYTICS_EVENTS } from "@/lib/analytics/server";
import * as groupsDal from "@/lib/dal/groups";
import * as membersDal from "@/lib/dal/members";
import { createGroupSchema, updateMemberSchema } from "@/lib/validators";
import { LIMITS } from "@/lib/constants";
import type { ActionResponse, Group, MemberRole } from "@/types";

export async function createGroup(name: string): Promise<ActionResponse<Group>> {
  logInfo({ layer: "action", operation: "createGroup", metadata: { name } });

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
      error: `You can create at most ${LIMITS.MAX_GROUPS_PER_USER} squads`,
    };
  }

  const group = await groupsDal.createGroup(parsed.data.name, user.id);
  if (!group) {
    logError({ layer: "action", operation: "createGroup", metadata: { userId: user.id, name: parsed.data.name } });
    return { success: false, error: "Couldn't create your squad — try again" };
  }

  trackServerEvent(user.id, ANALYTICS_EVENTS.GROUP_CREATED, { group_id: group.id, group_name: parsed.data.name });
  revalidatePath("/dashboard");
  return { success: true, data: group };
}

export async function joinGroup(inviteCode: string): Promise<ActionResponse> {
  logInfo({ layer: "action", operation: "joinGroup", metadata: { inviteCode } });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const group = await groupsDal.getGroupByInviteCode(inviteCode);
  if (!group) return { success: false, error: "Invalid invite code" };

  // Check if group is full
  const members = await membersDal.getMembers(group.id);
  if (members.length >= LIMITS.MAX_MEMBERS_PER_GROUP) {
    return { success: false, error: `This group is full (max ${LIMITS.MAX_MEMBERS_PER_GROUP} members)` };
  }

  // Check existing membership
  const existing = await membersDal.getMembershipStatus(group.id, user.id);
  if (existing?.status === "approved") {
    return { success: false, error: "You're already in this squad" };
  }
  if (existing?.status === "pending") {
    return { success: false, error: "Your request is already pending — hang tight" };
  }

  const ok = await membersDal.requestToJoin(group.id, user.id);
  if (!ok) {
    logError({ layer: "action", operation: "joinGroup", metadata: { userId: user.id, inviteCode } });
    return { success: false, error: "Couldn't get you in — try again" };
  }

  trackServerEvent(user.id, ANALYTICS_EVENTS.GROUP_JOIN_REQUESTED, { group_id: group.id });
  revalidatePath(`/group/${group.id}`, "layout");
  return { success: true };
}

export async function manageMember(
  groupId: string,
  userId: string,
  action: "approve" | "reject" | "promote" | "demote" | "remove"
): Promise<ActionResponse> {
  logInfo({ layer: "action", operation: "manageMember", metadata: { groupId, targetUserId: userId, action } });

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
    case "approve": {
      // Fast-path rejection (non-authoritative — DB trigger is the real guard)
      const currentMembers = await membersDal.getMembers(groupId);
      if (currentMembers.length >= LIMITS.MAX_MEMBERS_PER_GROUP) {
        return { success: false, error: `Group is full — max ${LIMITS.MAX_MEMBERS_PER_GROUP} members` };
      }
      const result = await membersDal.updateMemberStatus(groupId, userId, "approved");
      if (result.capacityExceeded) {
        return { success: false, error: `Group is full — max ${LIMITS.MAX_MEMBERS_PER_GROUP} members` };
      }
      ok = result.ok;
      break;
    }
    case "reject": {
      const result = await membersDal.updateMemberStatus(groupId, userId, "rejected");
      ok = result.ok;
      break;
    }
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
      const targetMembership = await membersDal.getMembershipStatus(groupId, userId);
      if (targetMembership?.role === "owner") {
        return { success: false, error: "Can't remove the squad owner" };
      }
      if (userId === user.id) {
        return { success: false, error: "Cannot remove yourself" };
      }
      // Only owner can remove admins
      if (targetMembership?.role === "admin" && callerMembership.role !== "owner") {
        return { success: false, error: "Only the owner can remove admins" };
      }
      ok = await membersDal.removeMember(groupId, userId);
      break;
    }
  }

  if (!ok) {
    logError({ layer: "action", operation: "manageMember", metadata: { callerId: user.id, groupId, targetUserId: userId, action } });
    return { success: false, error: `Failed to ${action} member` };
  }
  const eventMap: Record<string, string> = {
    approve: ANALYTICS_EVENTS.GROUP_MEMBER_APPROVED,
    reject: ANALYTICS_EVENTS.GROUP_MEMBER_REJECTED,
    promote: ANALYTICS_EVENTS.GROUP_MEMBER_PROMOTED,
    demote: ANALYTICS_EVENTS.GROUP_MEMBER_DEMOTED,
    remove: ANALYTICS_EVENTS.GROUP_MEMBER_REMOVED,
  };
  trackServerEvent(user.id, eventMap[action], { group_id: groupId, target_user_id: userId });
  revalidatePath(`/group/${groupId}`, "layout");
  return { success: true };
}
