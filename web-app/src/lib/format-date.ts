/**
 * Client-side date formatting helpers.
 *
 * These depend on the browser's timezone and locale.
 * Server Components should pass raw ISO strings as props;
 * Client Components call these formatters at render time.
 */

type DateInput = Date | string

function toDate(input: DateInput): Date {
  return typeof input === 'string' ? new Date(input) : input
}

/**
 * Checks whether two dates fall on the same calendar day
 * in the user's local timezone.
 */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Checks whether `date` is tomorrow relative to `now`
 * in the user's local timezone.
 */
function isTomorrow(date: Date, now: Date): boolean {
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return isSameDay(date, tomorrow)
}

/**
 * Format a match time for display.
 *
 * - If today:    "Today . 7:30 PM IST"
 * - If tomorrow: "Tomorrow . 7:30 PM IST"
 * - Otherwise:   "Sat, 28 Mar . 7:30 PM IST"
 *
 * The 12h/24h format follows the user's system locale.
 */
export function formatMatchTime(input: DateInput): string {
  const date = toDate(input)
  const now = new Date()

  const timeStr = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date)

  if (isSameDay(date, now)) {
    return `Today \u00B7 ${timeStr}`
  }

  if (isTomorrow(date, now)) {
    return `Tomorrow \u00B7 ${timeStr}`
  }

  const dayStr = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date)

  return `${dayStr} \u00B7 ${timeStr}`
}

/**
 * Format a deadline time — time only with timezone.
 *
 * Example: "6:45 PM IST"
 */
export function formatDeadline(input: DateInput): string {
  const date = toDate(input)
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date)
}

/**
 * Relative time formatter with fallback to absolute date.
 *
 * - < 1 min:  "Just now"
 * - < 60 min: "Xm ago"
 * - < 24h:    "Xh ago"
 * - < 7d:     "Xd ago"
 * - older:    formatDate() output
 */
export function formatTimeAgo(input: DateInput): string {
  const date = toDate(input)
  const now = Date.now()
  const diffMs = now - date.getTime()

  // Future dates or very small negatives — treat as just now
  if (diffMs < 0) {
    return 'Just now'
  }

  const SEC = 1000
  const MIN = 60 * SEC
  const HOUR = 60 * MIN
  const DAY = 24 * HOUR

  if (diffMs < MIN) {
    return 'Just now'
  }

  if (diffMs < HOUR) {
    const mins = Math.floor(diffMs / MIN)
    return `${mins}m ago`
  }

  if (diffMs < DAY) {
    const hours = Math.floor(diffMs / HOUR)
    return `${hours}h ago`
  }

  if (diffMs < 7 * DAY) {
    const days = Math.floor(diffMs / DAY)
    return `${days}d ago`
  }

  return formatDate(date)
}

/**
 * Simple absolute date format.
 *
 * Example: "28 Mar 2026"
 */
export function formatDate(input: DateInput): string {
  const date = toDate(input)
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZoneName: 'short',
  }).format(date)
}
