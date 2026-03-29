import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { LIMITS, IPL_TEAMS } from "./constants";
import type { WindowState } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Compute the prediction deadline for a match.
 * Default: 45 minutes before match start (IST).
 * Can be overridden via match_group_settings.prediction_deadline.
 *
 * TIMEZONE SEMANTICS:
 *   matchTimeIst is always in IST (UTC+05:30). We construct the Date with
 *   explicit "+05:30" offset so JavaScript converts to UTC internally.
 *   This mirrors the SQL: (date + time) AT TIME ZONE 'Asia/Kolkata'.
 *   India does NOT observe DST, so +05:30 is always correct.
 *   See also: supabase/migrations/020_document_deadline_timezone.sql
 */
export function computeDeadline(
  matchDate: string,
  matchTimeIst: string,
  customDeadline?: string | null
): Date {
  if (customDeadline) {
    const d = new Date(customDeadline);
    if (isNaN(d.getTime())) return new Date(0); // Invalid → treat as already passed
    return d;
  }
  // Construct IST datetime and subtract 45 minutes
  const istDatetime = new Date(`${matchDate}T${matchTimeIst}+05:30`);
  if (isNaN(istDatetime.getTime())) return new Date(0); // Invalid → treat as already passed
  return new Date(
    istDatetime.getTime() - LIMITS.PREDICTION_DEADLINE_MINUTES_BEFORE_MATCH * 60 * 1000
  );
}

/**
 * Check if the prediction deadline has passed.
 * Returns true (deadline passed) if date/time inputs are malformed — fail closed.
 */
export function isDeadlinePassed(
  matchDate: string,
  matchTimeIst: string,
  customDeadline?: string | null
): boolean {
  const deadline = computeDeadline(matchDate, matchTimeIst, customDeadline);
  return new Date() > deadline;
}

/**
 * Compute when the prediction window opens for a match.
 * Always 8:00 AM IST on the match date.
 *
 * TIMEZONE SEMANTICS:
 *   Constructs "matchDate + 08:00:00 + 05:30" so JavaScript
 *   converts to UTC internally. Mirrors the SQL:
 *   (m.date + '08:00:00'::time) AT TIME ZONE 'Asia/Kolkata'
 *
 * @param matchDate - Date string (e.g., "2026-04-01")
 * @returns Date object representing 8 AM IST on match day
 */
export function computeWindowOpen(matchDate: string): Date {
  const hour = LIMITS.PREDICTION_WINDOW_OPEN_HOUR_IST;
  const hourStr = hour.toString().padStart(2, "0");
  const windowOpen = new Date(`${matchDate}T${hourStr}:00:00+05:30`);
  if (isNaN(windowOpen.getTime())) return new Date(0); // Invalid → treat as already passed
  return windowOpen;
}

/**
 * Check if the prediction window is currently open.
 * Returns true only when: 8 AM IST on match day <= now < deadline.
 *
 * Returns false (window not open) if date/time inputs are malformed — fail closed.
 *
 * @param matchDate - Date string (e.g., "2026-04-01")
 * @param matchTimeIst - Time string in IST (e.g., "19:30:00")
 * @param customDeadline - Optional admin override for close time
 */
export function isWindowOpen(
  matchDate: string,
  matchTimeIst: string,
  customDeadline?: string | null
): boolean {
  const now = new Date();
  const windowOpen = computeWindowOpen(matchDate);
  const deadline = computeDeadline(matchDate, matchTimeIst, customDeadline);
  return now >= windowOpen && now < deadline;
}

/**
 * Determine the prediction window state for a match.
 * Used by server components to decide which UI state to render.
 *
 * @param match - Object with date and time_ist fields
 * @param customDeadline - Optional admin override for close time
 * @returns WindowState enum value
 */
export function getWindowState(
  match: { date: string; time_ist: string },
  customDeadline?: string | null
): WindowState {
  const now = new Date();
  const windowOpen = computeWindowOpen(match.date);
  const deadline = computeDeadline(match.date, match.time_ist, customDeadline);

  // Edge case: zero-duration window (deadline before window open)
  if (deadline <= windowOpen) return "WINDOW_CLOSED";

  if (now >= deadline) return "WINDOW_CLOSED";
  if (now >= windowOpen) return "WINDOW_OPEN";

  // Pre-window: distinguish between future day and match day
  // IST is always UTC+05:30 (no DST). Use explicit offset arithmetic
  // instead of toLocaleString which is fragile across runtimes.
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(now.getTime() + IST_OFFSET_MS);
  const matchDayIST = new Date(
    new Date(match.date + "T00:00:00+05:30").getTime() + IST_OFFSET_MS
  );

  // Compare dates only (year, month, day in IST) using UTC getters
  // since we already shifted by the IST offset
  const isSameDay =
    nowIST.getUTCFullYear() === matchDayIST.getUTCFullYear() &&
    nowIST.getUTCMonth() === matchDayIST.getUTCMonth() &&
    nowIST.getUTCDate() === matchDayIST.getUTCDate();

  if (isSameDay) return "PRE_WINDOW_MATCH_DAY";
  return "PRE_WINDOW_FUTURE";
}

/**
 * Format a match date for window copy (e.g., "Apr 6").
 * Short format: month abbreviation + day.
 */
export function formatWindowDate(matchDate: string): string {
  return new Date(matchDate + "T00:00:00+05:30").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Format a relative time string (e.g., "2h 15m", "45m", "3d")
 */
export function formatCountdown(targetDate: Date): string {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) return "Expired";

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Format a date string to IST display format
 */
export function formatMatchDate(date: string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format match time (IST) to 12-hour format
 */
export function formatMatchTime(timeIst: string): string {
  const [hours, minutes] = timeIst.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period} IST`;
}

/**
 * Get team color by code — derives from IPL_TEAMS constant (single source of truth)
 */
export function getTeamColor(teamCode: string): string {
  const team = IPL_TEAMS.find((t) => t.code === teamCode);
  return team?.color || "#64748B";
}

/**
 * Formats a Date or ISO string into a relative time string.
 * Examples: "just now", "1m ago", "5h ago", "2d ago"
 */
export function formatTimeAgo(date: Date | string): string {
  const timestamp = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
