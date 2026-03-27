import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { LIMITS, IPL_TEAMS } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Compute the prediction deadline for a match.
 * Default: 45 minutes before match start (IST).
 * Can be overridden via match_group_settings.prediction_deadline.
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
