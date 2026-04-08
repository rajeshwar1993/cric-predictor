# PRF-002: Delete Account

**Phase:** 12 — Profile & Account
**Dependencies:** PRF-001, DSN-003
**Estimated scope:** Delete account flow with destructive confirmation

---

## Description

Build the delete account flow. Soft-deletes the user's profile using the `delete_account` Postgres RPC, which handles admin succession and gang cleanup in a single transaction.

---

## Acceptance Criteria

- [ ] "Delete Account" section on profile page (or separate confirmation page)
- [ ] Warning text explaining consequences:
  - "This will permanently delete your account"
  - "Your predictions will be preserved in gangs for other members"
  - "If you are the admin of a gang, another member will be promoted. If no other members exist, the gang will be deleted."
  - "You can sign in again later with the same email to restore your account."
- [ ] DestructiveActionDialog:
  - Title: "Delete Account"
  - Description: consequences text
  - Confirm value: user's email address
  - Confirm label: "Delete Account"
- [ ] Calls `deleteAccount` server action
- [ ] Success: signs out, clears cookies, redirects to landing page with toast

### Server Action (`src/lib/actions/profile.ts` — add)
- [ ] `deleteAccount()` → `ActionResult`
- [ ] Auth check
- [ ] Call `delete_account` RPC: `supabase.rpc('delete_account', { p_user_id: userId })`
  - RPC handles: admin succession, gang cleanup, profile soft-delete, notifications
- [ ] Sign out user
- [ ] Clear all cookies
- [ ] Fire `ACCOUNT_DELETED` analytics event
- [ ] Redirect to `/`

---

## Files to Create

```
web-app/src/components/profile/
├── delete-account-section.tsx
└── delete-account-section.stories.tsx
```

---

## Technical Notes

### What the RPC Does (reminder)
1. Advisory lock on user ID
2. For each gang where user is sole admin:
   - Find earliest-joined approved member with non-deleted profile
   - If found: promote to admin, update `v2_gangs.created_by`, send `admin_promoted` notification
   - If not found: soft-delete gang, send `gang_deleted` notifications
3. Soft-delete user profile (`is_deleted = true`, `deleted_at = now()`)

### Re-signin After Deletion
Per PRD: if a user with `is_deleted = true` signs in again, the auth callback restores their profile. This is already handled in AUTH-002.

---

## Storybook Requirements

- `Default` — delete section with warning text
- `DialogOpen` — confirmation dialog open
- `TypedEmail` — email typed, confirm enabled
- `Deleting` — loading state
