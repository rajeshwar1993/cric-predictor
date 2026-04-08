# PUB-003: 404 + Error Pages

**Phase:** 14 — Public Pages
**Dependencies:** DSN-002
**Estimated scope:** Not Found (404) and Error (500) pages

---

## Description

Build the 404 Not Found page and the global error boundary page. Both are standalone (no nav bar) and use EmptyState component for consistent presentation.

---

## Acceptance Criteria

### 404 Page (`src/app/not-found.tsx`)
- [ ] Standalone (no nav bar, no footer)
- [ ] App logo centered
- [ ] EmptyState with:
  - Headline: "Page not found"
  - Description: "The page you're looking for doesn't exist or has been moved."
  - Action: "Go to Dashboard" button → `/dashboard`
- [ ] HTTP 404 status code

### Error Page (`src/app/error.tsx`)
- [ ] Standalone (no nav bar, no footer)
- [ ] Client Component (required by Next.js)
- [ ] App logo centered
- [ ] EmptyState with:
  - Icon: alert-triangle
  - Headline: "Something went wrong"
  - Description: "We couldn't load this page. Please try again."
  - Action: "Try again" button (calls `reset()`) + "Go to Dashboard" link
- [ ] Logs error to PostHog via `captureError()`
- [ ] Works for both server and client errors

### Group-Level Error Boundary (`src/app/(app)/group/[groupId]/error.tsx`)
- [ ] Same pattern as global error but scoped to group pages
- [ ] Includes "Back to Dashboard" link
- [ ] Fires error capture to PostHog

---

## Files to Create

```
web-app/src/app/
├── not-found.tsx
├── error.tsx
├── (app)/
│   └── group/
│       └── [groupId]/
│           └── error.tsx
```

---

## Technical Notes

### Error Boundary Pattern
```tsx
'use client'
import { useEffect } from 'react'
import { captureError } from '@/lib/analytics/error-handler'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureError(error)
  }, [error])

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 bg-concrete-black">
      <EmptyState
        icon="alert-triangle"
        headline="Something went wrong"
        description="We couldn't load this page. Please try again."
        action={
          <div className="flex gap-3">
            <Button onClick={reset}>Try again</Button>
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        }
      />
    </div>
  )
}
```

### 404 Page
```tsx
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 bg-concrete-black">
      <EmptyState
        icon="search-x"
        headline="Page not found"
        description="The page you're looking for doesn't exist or has been moved."
        action={
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        }
      />
    </div>
  )
}
```

---

## Storybook Requirements

Not practical for error/404 pages. Verify visually in browser by navigating to non-existent routes and triggering errors.
