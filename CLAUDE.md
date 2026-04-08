# Bragg — Project Instructions

## Source of Truth

- **PRD:** `docs/PRD.V2.md` — the single source of truth for all product requirements, business logic, database schema, cron functions, and feature specs.
- **User Stories:** `docs/stories/` — detailed implementation stories derived from the PRD. See `docs/stories/README.md` for structure, implementation order, and global requirements.
- **Design System:** `docs/design-systems/electric-street.md` — the definitive reference for all visual decisions (colors, typography, spacing, components, motion, accessibility, copy voice).
- **Design System Visual:** `docs/design-systems/electric-street.html` — a rendered visual reference of the design system. Open in a browser for a live preview of all tokens, components, and patterns. Use alongside `electric-street.md` when building UI.
- **Design System Screenshots:** `docs/design-systems/*.png` — screenshot references of the design system for quick visual guidance.
- **Architecture:** `docs/architecture.md` — rendering strategy (server vs client), data fetching patterns, component architecture, suspense/loading, state management, real-time/polling, auth flow, error handling, and key data flow diagrams. Reference during all development work.

## Project Structure

- **`web-app/`** — the active Next.js 16 frontend codebase (App Router, React, TypeScript, Tailwind v4, shadcn/ui).
- **`supabase/`** — the active Supabase project (migrations, Edge Functions, seeds).

## Agents

This project has 3 specialized agents in `.claude/agents/`:

- **PM** (`pm.md`): Interactive brainstorming partner for refining requirements. Use when the feature ask is vague or needs product thinking. Spawn it for a conversation, not fire-and-forget.
- **PSE** (`pse.md`): Principal Software Engineer. Plans, architects, and implements features. Includes UI/UX and copy guidelines. Can be split into PSE-Frontend and PSE-Supabase for cross-domain work.
- **Reviewer** (`reviewer.md`): Combined code review + QA. Finds bugs, security issues, and missed edge cases. Always spawn as a fresh agent (never the same one that wrote the code).

## Build Feature Workflow

Use the `build-feature` skill for feature work. It runs 3 phases:

1. **Plan**: Refine requirements (optionally with PM agent), read the codebase, produce an implementation plan. User approves.
2. **Build**: PSE agent implements the feature.
3. **Review**: Fresh reviewer agent checks for issues.

For simple changes (bug fixes, small tweaks), skip the skill and work directly.

## Development Rules

### Before Any Change

- **Read the codebase first.** Before writing or modifying code, always read the relevant files, understand the existing patterns, and assess the impact of your changes. Never assume — verify.
- **Check the PRD and stories.** Every feature and behavior is documented. Cross-reference `docs/PRD.V2.md` and the relevant story in `docs/stories/` before starting work.

### Test-Driven Development

- **Write tests first** wherever applicable. For server actions, DAL functions, RPCs, and utility helpers — write the test before the implementation.
- **Unit tests are mandatory** for all business logic (server actions, Postgres functions, DAL queries, utility helpers).
- **Integration tests** for cross-cutting concerns (auth flow, middleware, cron pipelines).
- **Run tests before committing.** Code that breaks existing tests does not get committed.

### Code Quality & Linting

- **ESLint must pass with zero errors and zero warnings.** Run `npm run lint` before considering any story complete. Linting failures are blockers — do not skip or suppress them.
- **No `any` type.** Ever. Use proper types, generics, or `unknown` with type guards. If Supabase or a third-party library returns `any`, cast it to a typed interface immediately at the boundary.
- **No `@ts-ignore` or `@ts-expect-error`.** Fix the type error instead of suppressing it. The only exception is a documented third-party library bug with a linked issue — and even then, add a `// TODO: remove when <issue-url> is fixed` comment.
- **No `eslint-disable` comments** unless absolutely unavoidable (e.g., a one-off third-party integration pattern). If used, it must disable a specific rule (never `eslint-disable` with no rule name) and include a comment explaining why.
- **Strict TypeScript.** `tsconfig.json` uses `"strict": true`. This enables `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, and all other strict checks. Do not loosen these.
- **No unused variables or imports.** ESLint's `no-unused-vars` catches this. Clean up as you go.
- **Consistent code style.** Prettier handles formatting. Do not fight Prettier — configure it once (FND-002) and let it run on save/commit.
- **All code must be type-safe end-to-end.** From Supabase query → DAL function → Server Component → Client Component props — types flow through without breaks. Use the auto-generated `src/types/database.ts` for all DB types.

### Code Review

- **Every piece of work must be independently reviewed** after development is done. Always spawn a fresh Reviewer agent (never the same agent that wrote the code) to check for bugs, security issues, missed edge cases, and PRD compliance.

## UI / Component Work

When doing any UI or component work:

1. **Use the `/ui-ux-pro-max` skill** to ideate and design the UI before building. Use it to explore layout options, component structure, and interaction patterns. Then use the `/frontend-design` skill along with `docs/design-systems/electric-street.md` and `docs/design-systems/electric-street.html` to guide all visual decisions during implementation. Always read `docs/design-systems/electric-street.md` for token values, component specs, and rules. Open `docs/design-systems/electric-street.html` in a browser or view the screenshots in `docs/design-systems/*.png` for a rendered visual reference of how components should look. Follow the design system strictly. If a better approach would violate the design system, ask the user for permission before proceeding.
2. **Reuse before creating.** Always check `web-app/src/components/ui/` and `web-app/src/components/` for existing components before creating new ones. Prefer composing existing primitives over building from scratch.
3. **Small, focused components.** Break UI into reusable pieces. Each component should do one thing. Pages should be thin shells that compose components. Never build monolithic page files — split sections into separate component files.
4. **Storybook is mandatory.** Every UI component and page must have a Storybook entry (`*.stories.tsx`) alongside the component file. Include a `Default` story plus stories for every key state/variant (loading, empty, error, with data, etc.). See `docs/stories/README.md` § "Global UI story requirements" for full details.
5. **Mobile-first.** All components must render correctly at 375px width before expanding to tablet/desktop.
6. **Accessibility.** Semantic HTML, ARIA labels, keyboard navigation. Run axe-core checks. No critical violations.

## Conventions

- Feature branches: `feature/[short-description]`
- Design system: `docs/design-systems/electric-street.md`
- PRD: `docs/PRD.V2.md`
- Stories: `docs/stories/`
- PSE-Frontend and PSE-Supabase never modify each other's files
- All code lives in `web-app/` and `supabase/`
