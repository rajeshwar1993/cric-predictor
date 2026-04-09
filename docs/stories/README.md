# Bragg — Implementation Stories

> Detailed implementation stories for the Next.js 16 frontend (`web-app/`). Each story is self-contained with acceptance criteria, files to create, technical notes, and testing requirements.

---

## Source of Truth

- **PRD:** `docs/PRD.V2.md`
- **Architecture:** `docs/architecture.md`
- **Design System:** `docs/design-systems/electric-street.md` + `electric-street.html` + `*.png` screenshots
- **Supabase Reference:** `docs/supabase-reference.md`
- **Stories:** This directory (`docs/stories/`)

---

## Global Requirements

These apply to **every** story unless explicitly overridden.

### Code Quality
- TypeScript `strict: true` — no `any`, no `@ts-ignore`, no `@ts-expect-error`
- ESLint must pass with **zero errors, zero warnings** before a story is considered complete
- Prettier formatting enforced via config (no manual formatting debates)
- No unused variables, imports, or dead code

### Design System
- All UI must follow `docs/design-systems/electric-street.md` strictly
- Use design system tokens (colors, spacing, typography, radii, shadows) — never hardcode values
- Dark-only theme — no light mode
- Mobile-first: all components must render correctly at 375px width before scaling up
- Accessibility: semantic HTML, ARIA labels, keyboard navigation, axe-core checks

### Component Rules
- One component per file, kebab-case filenames (`gang-header.tsx`)
- PascalCase component names (`GangHeader`)
- Pages are thin server shells — compose section components, no business logic in `page.tsx`
- Default to Server Components; only add `'use client'` when interactivity is required
- Push client boundaries down — smallest possible interactive piece is client
- Reuse existing components from `src/components/ui/` and `src/components/` before creating new ones

### Testing
- Every UI component must have a Storybook entry (`*.stories.tsx`) colocated with the component
- Include `Default` story + stories for key states (Loading, Empty, Error, WithData, etc.)
- Unit tests for all server actions, DAL functions, and utility helpers
- Tests colocated with source: `gangs.ts` → `gangs.test.ts`

### Server Actions
- Return `{ success: true } | { success: false; error: string }`
- Always: auth check → rate limit → validate input → mutate → analytics event → revalidatePath → return
- Use Zod for input validation

### Data Access Layer (DAL)
- All reads go through `src/lib/dal/` functions
- Each DAL function creates its own server Supabase client
- Returns typed data or throws

### Naming Conventions
- Files: kebab-case (`live-scorecard.tsx`)
- Components: PascalCase (`LiveScorecard`)
- Server actions: camelCase verb-first (`createGang`, `submitPredictions`)
- DAL functions: camelCase get-prefix (`getGangDetails`)
- Route params: camelCase (`groupId`, `fixtureId`)
- Event constants: SCREAMING_SNAKE (`PREDICTION_SUBMITTED`)

---

## Implementation Order

Stories must be implemented in phase order. Within a phase, stories can be parallelized unless marked with explicit dependencies.

### Phase 1: Foundation (FND) — Project Setup
| Story | Title | Dependencies |
|-------|-------|-------------|
| [FND-001](FND-001-project-initialization.md) | Project Initialization | None |
| [FND-002](FND-002-supabase-clients.md) | Supabase Client Setup + DB Types | FND-001 |
| [FND-003](FND-003-design-tokens.md) | Design System Tokens + Fonts | FND-001 |
| [FND-004](FND-004-testing-infrastructure.md) | Storybook + Testing Infrastructure | FND-001 |
| [FND-005](FND-005-middleware.md) | Middleware (Auth, Onboarding, Terms) | FND-002 |
| [FND-006](FND-006-core-utilities.md) | Core Utilities (Date, Rate Limit, Helpers, Analytics) | FND-002 |

### Phase 2: Design System Components (DSN)
| Story | Title | Dependencies |
|-------|-------|-------------|
| [DSN-001](DSN-001-shadcn-primitives.md) | shadcn/ui Primitives | FND-003 |
| [DSN-002](DSN-002-custom-components.md) | Custom Components (StatBlock, EmptyState, Skeleton, Toast) | DSN-001 |
| [DSN-003](DSN-003-composite-components.md) | Composite Components (DestructiveDialog, SidePanel, LeaderboardRow) | DSN-001 |
| [DSN-004](DSN-004-share-card.md) | Share Card (screenshot-worthy result card) | DSN-001, DSN-002 |

### Phase 3: Layout Shell (LAY)
| Story | Title | Dependencies |
|-------|-------|-------------|
| [LAY-001](LAY-001-root-layout.md) | Root Layout + Page Wrapper | FND-003, DSN-001 |
| [LAY-002](LAY-002-nav-bar.md) | Nav Bar | LAY-001, DSN-003 |
| [LAY-003](LAY-003-footer.md) | Global Footer | LAY-001 |

### Phase 4: Auth Flow (AUTH)
| Story | Title | Dependencies |
|-------|-------|-------------|
| [AUTH-001](AUTH-001-login-page.md) | Login Page + Magic Link | LAY-001, FND-005, FND-006 |
| [AUTH-002](AUTH-002-auth-callback.md) | Auth Callback + Session Setup | FND-002, FND-005 |
| [AUTH-003](AUTH-003-onboarding.md) | Onboarding Page | AUTH-002, LAY-001 |
| [AUTH-004](AUTH-004-accept-terms-signout.md) | Accept Terms Page + Sign Out | AUTH-002, LAY-001 |

### Phase 5: Dashboard (DASH)
| Story | Title | Dependencies |
|-------|-------|-------------|
| [DASH-001](DASH-001-dashboard-page.md) | Dashboard Page + Gang Cards | AUTH-003, LAY-002, LAY-003 |
| [DASH-002](DASH-002-create-gang.md) | Create Gang | DASH-001 |
| [DASH-003](DASH-003-join-gang.md) | Join Gang + Pending Invite Banner | DASH-001 |

### Phase 6: Join Flow (JOIN)
| Story | Title | Dependencies |
|-------|-------|-------------|
| [JOIN-001](JOIN-001-join-page.md) | Join Page (Auth + Unauth Flows) | AUTH-001, DASH-003 |

### Phase 7: Gang Page (GANG)
| Story | Title | Dependencies |
|-------|-------|-------------|
| [GANG-001](GANG-001-gang-page-header.md) | Gang Page Shell + Header + Invite | DASH-001, DSN-002 |
| [GANG-002](GANG-002-pending-requests.md) | Pending Join Requests (Admin) | GANG-001 |
| [GANG-003](GANG-003-member-list.md) | Member List / Mini Leaderboard | GANG-001, DSN-003 |
| [GANG-004](GANG-004-leave-gang.md) | Leave Gang | GANG-001, DSN-003 |

### Phase 8: Matches (MTCH)
| Story | Title | Dependencies |
|-------|-------|-------------|
| [MTCH-001](MTCH-001-upcoming-matches.md) | Upcoming Matches + Match Card | GANG-001, DSN-002 |
| [MTCH-002](MTCH-002-live-scorecard.md) | Live Matches + Scorecard | MTCH-001, FND-006 |
| [MTCH-003](MTCH-003-recent-results.md) | Recent Results Section | MTCH-001 |

### Phase 9: Predictions (PRED)
| Story | Title | Dependencies |
|-------|-------|-------------|
| [PRED-001](PRED-001-predict-page.md) | Predict Page + Scenario Cards | MTCH-001, DSN-002 |
| [PRED-002](PRED-002-scenario-pickers.md) | Scenario Input Pickers | PRED-001 |
| [PRED-003](PRED-003-prediction-submit.md) | Prediction Form + Submit Action | PRED-002, FND-006 |

### Phase 10: Leaderboards (LDB)
| Story | Title | Dependencies |
|-------|-------|-------------|
| [LDB-001](LDB-001-match-leaderboard.md) | Match Leaderboard Page | GANG-003, MTCH-002 |
| [LDB-002](LDB-002-prediction-reveal.md) | Prediction Reveal Table | LDB-001, PRED-001 |
| [LDB-003](LDB-003-season-standings.md) | Season Standings Page | GANG-003 |

### Phase 11: Gang Settings (SET)
| Story | Title | Dependencies |
|-------|-------|-------------|
| [SET-001](SET-001-gang-settings.md) | Gang Settings Page | GANG-001, DSN-003 |
| [SET-002](SET-002-member-management.md) | Member Management | SET-001 |

### Phase 12: Profile & Account (PRF)
| Story | Title | Dependencies |
|-------|-------|-------------|
| [PRF-001](PRF-001-profile-page.md) | Profile Page | LAY-002, DSN-002 |
| [PRF-002](PRF-002-delete-account.md) | Delete Account | PRF-001, DSN-003 |

### Phase 13: Notifications (NTF)
| Story | Title | Dependencies |
|-------|-------|-------------|
| [NTF-001](NTF-001-notification-bell-panel.md) | Notification Bell + Panel | LAY-002, DSN-003, FND-006 |
| [NTF-002](NTF-002-realtime-mark-read.md) | Realtime Subscription + Mark Read | NTF-001 |

### Phase 14: Public Pages (PUB)
| Story | Title | Dependencies |
|-------|-------|-------------|
| [PUB-001](PUB-001-landing-page.md) | Landing Page | LAY-001, DSN-001, DSN-002 |
| [PUB-002](PUB-002-privacy-terms.md) | Privacy + Terms Pages | LAY-003 |
| [PUB-003](PUB-003-error-pages.md) | 404 + Error Pages | DSN-002 |

### Phase 15: Analytics & Polish (PERF)
| Story | Title | Dependencies |
|-------|-------|-------------|
| [PERF-001](PERF-001-posthog-events.md) | PostHog Events + Error Capture | FND-006, all feature stories |
| [PERF-002](PERF-002-web-vitals-seo.md) | Web Vitals + SEO + Open Graph | LAY-001, PUB-001 |

---

## Story Count Summary

| Phase | Stories | Focus |
|-------|---------|-------|
| 1. Foundation | 6 | Project setup, tooling, config |
| 2. Design System | 4 | UI primitives, custom components, share card |
| 3. Layout | 3 | App shell, nav, footer |
| 4. Auth | 4 | Login, callback, onboarding, terms |
| 5. Dashboard | 3 | Dashboard, create/join gang |
| 6. Join | 1 | Invite link flow |
| 7. Gang | 4 | Gang page sections |
| 8. Matches | 3 | Match display, live scores |
| 9. Predictions | 3 | Predict form and submit |
| 10. Leaderboards | 3 | Match + season leaderboards |
| 11. Settings | 2 | Gang admin settings |
| 12. Profile | 2 | Profile + delete account |
| 13. Notifications | 2 | Bell, panel, realtime |
| 14. Public | 3 | Landing, privacy, terms, errors |
| 15. Analytics | 2 | PostHog, Web Vitals, SEO |
| **Total** | **45** | |

---

## Parallelization Guide

Within each phase, stories without explicit dependency chains can be built in parallel by separate agents (PSE-Frontend, PSE-Supabase). Cross-phase work is blocked by the dependency table above.

**Recommended parallel tracks after Phase 1-3:**
- **Track A:** Auth → Dashboard → Join → Gang page
- **Track B:** Design system components → Matches → Predictions → Leaderboards
- **Track C:** Notifications → Profile → Settings
- **Track D:** Public pages (can start after Phase 3)

---

## Review Protocol

Every story must be reviewed by a fresh Reviewer agent after implementation. The reviewer checks:
1. PRD compliance (does it match the spec?)
2. Design system compliance (does it match Electric Street?)
3. Code quality (TypeScript strict, no lint errors)
4. Testing (Storybook stories exist, unit tests pass)
5. Accessibility (semantic HTML, keyboard nav, ARIA)
6. Security (auth checks, RLS awareness, input validation)
