import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import type { Notification } from "@/types";

export async function getNotifications(
  userId: string,
  limit = 20
): Promise<Notification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, user_id, type, message, is_read, created_at, group_id, match_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (error) logError({ layer: "dal", operation: "getNotifications", metadata: { userId, limit } }, error);
    return [];
  }
  return data;
}

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) logError({ layer: "dal", operation: "getUnreadCount", metadata: { userId } }, error);
  return count || 0;
}

export async function markRead(notificationId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) logError({ layer: "dal", operation: "markRead", metadata: { notificationId } }, error);
  return !error;
}

export async function markAllRead(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) logError({ layer: "dal", operation: "markAllRead", metadata: { userId } }, error);
  return !error;
}

export async function createNotification(params: {
  userId: string;
  type: string;
  message: string;
  groupId?: string;
  matchId?: number;
}): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    message: params.message,
    group_id: params.groupId,
    match_id: params.matchId,
  });

  if (error) logError({ layer: "dal", operation: "createNotification", metadata: { userId: params.userId, type: params.type } }, error);
  return !error;
}
