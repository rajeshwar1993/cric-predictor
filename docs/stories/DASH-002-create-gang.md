# DASH-002: Create Gang

**Phase:** 5 — Dashboard
**Dependencies:** DASH-001
**Estimated scope:** Create gang form + server action calling Postgres RPC

---

## Description

Build the create gang form on the dashboard. User enters a gang name, submits, and is redirected to the new gang page. Uses the `create_gang` Postgres RPC which handles invite code generation, enrollment, and scenario seeding.

---

## Acceptance Criteria

### Create Gang Form (`src/components/gangs/create-gang-form.tsx`) — Client Component
- [ ] Input: "Gang name" with label, placeholder "Enter your gang name"
- [ ] Validation: 3–50 characters (after trim)
- [ ] Submit button: "Create Gang" (primary variant)
- [ ] Loading state while creating
- [ ] Success: toast + redirect to `/group/[newGangId]`
- [ ] Error: inline error message or toast

### Server Action (`src/lib/actions/gangs.ts`)
- [ ] `createGang(gangName: string)` → `ActionResult<{ gangId: string; inviteCode: string }>`
- [ ] Auth check
- [ ] Rate limit: 10 per hour
- [ ] Validate: name 3–50 chars after trim (Zod)
- [ ] Call `create_gang` RPC: `supabase.rpc('create_gang', { p_gang_name: name, p_creator_id: userId })`
- [ ] Handle errors:
  - `MAX_GANGS_REACHED` (P0001) → "You've reached the maximum of 40 gangs"
  - Other → "Failed to create gang. Please try again."
- [ ] Revalidate `/dashboard`
- [ ] Fire `GANG_CREATED` analytics event
- [ ] Return `{ gangId, inviteCode }`

### Placement on Dashboard
- [ ] When user has gangs: form appears below the gangs grid as a collapsible section or inline form
- [ ] When user has no gangs (empty state): form is prominently shown as part of the empty state

---

## Files to Create

```
web-app/src/
├── components/
│   └── gangs/
│       ├── create-gang-form.tsx
│       └── create-gang-form.stories.tsx
├── lib/
│   └── actions/
│       └── gangs.ts                # CREATE — gang server actions
```

---

## Technical Notes

### Server Action
```typescript
'use server'
import { createServerClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

const gangNameSchema = z.string().trim().min(3).max(50)

export async function createGang(gangName: string): Promise<ActionResult<{ gangId: string; inviteCode: string }>> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const rl = await rateLimit(user.id, 'create_gang', { max: 10, windowSeconds: 3600 })
  if (!rl.allowed) return { success: false, error: 'Too many requests. Try again later.' }

  const parsed = gangNameSchema.safeParse(gangName)
  if (!parsed.success) return { success: false, error: 'Gang name must be 3–50 characters' }

  const { data, error } = await supabase.rpc('create_gang', {
    p_gang_name: parsed.data,
    p_creator_id: user.id,
  })

  if (error) {
    if (error.message.includes('MAX_GANGS_REACHED')) {
      return { success: false, error: 'You\'ve reached the maximum of 40 gangs.' }
    }
    return { success: false, error: 'Failed to create gang. Please try again.' }
  }

  revalidatePath('/dashboard')
  return { success: true, data: { gangId: data, inviteCode: '' } } // inviteCode fetched separately if needed
}
```

### Client Form Pattern
```tsx
'use client'
import { useRouter } from 'next/navigation'
import { createGang } from '@/lib/actions/gangs'

export function CreateGangForm() {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    const result = await createGang(name)
    if (result.success) {
      toast.success('Gang created!')
      router.push(`/group/${result.data?.gangId}`)
    } else {
      setError(result.error)
    }
    setIsLoading(false)
  }
  // ...
}
```

---

## Storybook Requirements

- `Default` — empty form
- `Filled` — with gang name entered
- `ValidationError` — name too short
- `Loading` — submitting state
- `MaxGangsError` — limit reached error
