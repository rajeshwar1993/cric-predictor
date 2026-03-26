"use server";

import { createClient } from "@/lib/supabase/server";
import * as notificationsDal from "@/lib/dal/notifications";
import type { ActionResponse } from "@/types";

export async function markNotificationRead(
  notificationId: string
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // RLS ensures user can only update their own notifications,
  // but we verify auth at the action layer for defense-in-depth
  const ok = await notificationsDal.markRead(notificationId);
  if (!ok) return { success: false, error: "Failed to mark as read" };
  return { success: true };
}

export async function markAllNotificationsRead(): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const ok = await notificationsDal.markAllRead(user.id);
  if (!ok) return { success: false, error: "Failed to mark all as read" };
  return { success: true };
}
