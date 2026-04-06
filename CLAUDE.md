# Bragg — Project Instructions

## Source of Truth

- **PRD:** `docs/PRD.V2.md` — the single source of truth for all product requirements, business logic, database schema, cron functions, and feature specs.
- **User Stories:** `docs/stories/` — detailed implementation stories derived from the PRD. See `docs/stories/README.md` for structure, implementation order, and global requirements.
- **Design System:** `docs/design-system.md` — the definitive reference for all visual decisions (colors, typography, spacing, components, motion, accessibility, copy voice).
- **Design System Visual:** `docs/design-system-visual.html` — a rendered visual reference of the design system. Open in a browser for a live preview of all tokens, components, and patterns. Use alongside `design-system.md` when building UI.

## Project Structure

- **`web-app-2/`** — the active Next.js 16 frontend codebase (App Router, React, TypeScript, Tailwind v4, shadcn/ui).
- **`supabase-2/`** — the active Supabase project (migrations, Edge Functions, seeds).
- **`web-app/`** — DEPRECATED. Do not reference, modify, or import from this folder. Will be removed.
- **`supabase/`** — DEPRECATED. Do not reference, modify, or import from this folder. Will be removed.

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

### Code Review

- **Every piece of work must be independently reviewed** after development is done. Always spawn a fresh Reviewer agent (never the same agent that wrote the code) to check for bugs, security issues, missed edge cases, and PRD compliance.

## UI / Component Work

When doing any UI or component work:

1. **Use the `/ui-ux-pro-max` skill** to ideate and design the UI before building. Use it to explore layout options, component structure, and interaction patterns. Then use the `/frontend-design` skill along with `docs/design-system.md` and `docs/design-system-visual.html` to guide all visual decisions during implementation. Always read `docs/design-system.md` for token values, component specs, and rules. Open `docs/design-system-visual.html` in a browser for a rendered visual reference of how components should look. Follow the design system strictly. If a better approach would violate the design system, ask the user for permission before proceeding.
2. **Reuse before creating.** Always check `web-app-2/src/components/ui/` and `web-app-2/src/components/` for existing components before creating new ones. Prefer composing existing primitives over building from scratch.
3. **Small, focused components.** Break UI into reusable pieces. Each component should do one thing. Pages should be thin shells that compose components. Never build monolithic page files — split sections into separate component files.
4. **Storybook is mandatory.** Every UI component and page must have a Storybook entry (`*.stories.tsx`) alongside the component file. Include a `Default` story plus stories for every key state/variant (loading, empty, error, with data, etc.). See `docs/stories/README.md` § "Global UI story requirements" for full details.
5. **Mobile-first.** All components must render correctly at 375px width before expanding to tablet/desktop.
6. **Accessibility.** Semantic HTML, ARIA labels, keyboard navigation. Run axe-core checks. No critical violations.

## Conventions

- Feature branches: `feature/[short-description]`
- Design system: `docs/design-system.md`
- PRD: `docs/PRD.V2.md`
- Stories: `docs/stories/`
- PSE-Frontend and PSE-Supabase never modify each other's files
- All code lives in `web-app-2/` and `supabase-2/` — never in the deprecated `web-app/` or `supabase/` folders
