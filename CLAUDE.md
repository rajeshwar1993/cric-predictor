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

## UI / Component Work

When doing any UI or component work:

1. **Use the `/frontend-design` skill** along with `docs/design-system.md` to guide all visual decisions. Follow the design system strictly. If a better approach would violate the design system, ask the user for permission before proceeding.
2. **Reuse before creating.** Always check `src/components/ui/` and `src/components/` for existing components before creating new ones. Prefer composing existing primitives over building from scratch.
3. **Small, focused components.** Break UI into reusable pieces. Each component should do one thing. Pages should be thin shells that compose components.

## Conventions

- Feature branches: `feature/[short-description]`
- Design system: `docs/design-system.md`
- PSE-Frontend and PSE-Supabase never modify each other's files
