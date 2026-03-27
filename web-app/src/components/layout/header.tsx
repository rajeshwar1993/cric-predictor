"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { usePostHogIdentify } from "@/hooks/use-posthog-identify";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationBell } from "@/components/layout/notification-bell";

export function Header() {
  const { user, profile, loading } = useAuth();
  usePostHogIdentify(user, profile);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-deep)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-deep)]/80">
      <div className="mx-auto flex h-14 max-w-[960px] items-center justify-between px-4">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
          <span className="font-display text-xl font-bold text-gradient">
            Bragg
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--bg-elevated)]" />
          ) : user ? (
            <>
              <NotificationBell userId={user.id} />
              <UserMenu
                displayName={profile?.display_name || user.email?.split("@")[0] || "User"}
                email={user.email || ""}
              />
            </>
          ) : (
            <Link
              href="/login"
              className="font-display text-sm font-semibold text-[var(--cyan)] hover:opacity-80 transition-opacity"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
