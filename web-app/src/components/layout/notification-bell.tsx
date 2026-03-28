"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/hooks/use-realtime";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/actions/notifications";
import { Bell, Check, CheckCheck } from "lucide-react";
import { getPostHogClient } from "@/lib/posthog/client";
import { ANALYTICS_EVENTS } from "@/lib/posthog/events";
import type { Notification } from "@/types";

interface NotificationBellProps {
  userId: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Initial fetch
  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) {
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter((n: any) => !n.is_read).length);
      }
    }
    fetch();
  }, [supabase, userId]);

  // Realtime updates
  const handleRealtimeUpdate = useCallback(() => {
    // Re-fetch on any notification change
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) {
          setNotifications(data as Notification[]);
          setUnreadCount(data.filter((n: any) => !n.is_read).length);
        }
      });
  }, [supabase, userId]);

  useRealtime("notifications", `user_id=eq.${userId}`, handleRealtimeUpdate);

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          const opening = !isOpen;
          setIsOpen(opening);
          if (opening) {
            getPostHogClient()?.capture(ANALYTICS_EVENTS.NOTIFICATION_BELL_OPENED, { unread_count: unreadCount });
          }
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 font-stats text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          {/* Panel */}
          <div className="absolute right-0 top-12 z-50 w-[calc(100vw-2rem)] sm:w-80 rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-elevated)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border-light)] px-4 py-3">
              <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-[var(--cyan)] hover:opacity-80"
                >
                  <CheckCheck className="h-3 w-3" />
                  Clear all
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-4 text-center text-sm text-[var(--text-muted)]">
                  All quiet — for now
                </p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => !n.is_read && handleMarkRead(n.id)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)] ${
                      !n.is_read ? "bg-[var(--cyan-soft)]" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${n.is_read ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)] font-medium"}`}>
                        {n.message}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {formatTimeAgo(n.created_at)}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--cyan)]" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
