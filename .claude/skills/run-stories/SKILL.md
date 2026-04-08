---
name: run-stories
description: >
  Automated story runner that processes implementation stories from docs/stories/ sequentially.
  Use when the user wants to implement one or more stories from the backlog.
  Trigger on phrases like: "run story", "implement story", "run stories", "implement phase",
  "start phase", "build story", "run FND-001", or any reference to implementing stories from docs/stories/.
  This skill orchestrates: PM resolve → PSE implement → Reviewer fix loop → merge, with minimal human intervention.
---

# Skill: Run Stories

This skill processes **implementation stories** from `docs/stories/` through an automated pipeline:
PM Resolve → PSE Implement → Build Verify → Review → Fix Loop → Merge.

You — the Claude instance reading this — are the **orchestrator**. You coordinate agents, enforce gates, and only escalate to the user when truly stuck.

---

## Input Format

The user provides:
1. **Epic branch name** — the parent branch. All story branches are cut from it and merged back.
2. **Story scope** — one of:
   - A single story ID: `FND-001`
   - Multiple story IDs: `FND-001, FND-002, FND-003`
   - A phase: `phase 1` or `phase:foundation`
   - All stories: `all`

Example invocations:
```
/run-stories epic/foundation FND-001
/run-stories epic/v1 phase 1
/run-stories epic/full-build all
```

---

## Pre-Flight

Before processing any stories:

1. **Verify git state**: Run `git status`. The working tree must be clean. If dirty, stop and tell the user.
2. **Verify epic branch exists**: Run `git branch --list [epic-branch]`. If it doesn't exist, ask the user whether to create it from the current branch.
3. **Checkout epic branch**: `git checkout [epic-branch]`
4. **Resolve story list**: Read `docs/stories/README.md` to get the dependency graph and implementation order.
   - If specific story IDs were given, validate they exist and sort them by dependency order.
   - If a phase was given, extract all stories in that phase, sorted by dependency order.
   - If `all` was given, build the full ordered list across all phases.
5. **Check dependencies**: For each story in the list, verify its dependencies are either:
   - Already implemented (check if the dependency's key files exist in the codebase), OR
   - Earlier in the current run's story list.
   - If a dependency is unmet and not in the run, stop and tell the user.
6. **Present the run plan** to the user:
   ```
   ## Story Run Plan
   Epic branch: [branch]
   Stories to implement (in order):
   1. [STORY-ID] — [Title]
   2. [STORY-ID] — [Title]
   ...

   Proceed? (y/n)
   ```
   Wait for user confirmation before starting. This is the **only** user gate in the entire run.

---

## Per-Story Pipeline

For each story in the resolved list, execute these steps sequentially:

### Step 1: Branch

```bash
git checkout [epic-branch]
git pull origin [epic-branch] 2>/dev/null || true
git checkout -b story/[STORY-ID-lowercase]
```

Example: `story/fnd-001`

### Step 2: PM Resolve

Spawn a **PM agent** via the `Agent` tool. The PM's job is NOT interactive brainstorming — it's autonomous requirement resolution.

Agent prompt:
```
Read and follow your instructions in .claude/agents/pm.md.

You are operating in AUTONOMOUS RESOLVE mode — not interactive brainstorming mode.

Your task: Read the story file and produce a clear requirements summary for the PSE agent.

**Story file**: docs/stories/[STORY-ID].md — read it in full.

**Resolution process**:
1. Read the story file completely.
2. Identify any ambiguities, gaps, or questions in the story.
3. For each question, attempt to resolve it by reading these docs (in order of priority):
   - docs/PRD.V2.md (product requirements, business logic, schema)
   - docs/architecture.md (rendering strategy, data flow, component patterns)
   - docs/design-systems/electric-street.md (visual tokens, component specs)
   - docs/stories/README.md (global requirements, conventions)
   - The codebase itself (existing patterns, existing components in web-app/src/)
4. If you can resolve the question from the docs, state the resolution and cite the source.
5. ONLY if a question truly cannot be resolved from any available docs or the codebase,
   include it in "Open Questions" for the user.

**Output format** — produce a concise summary:

## Story: [STORY-ID] — [Title]

### What We're Building
[2-3 sentences from the story]

### Key Requirements
[Extracted from acceptance criteria, enriched with any resolved details]

### Resolved Ambiguities
- [Question] → [Resolution] (Source: [doc])

### Open Questions (ONLY if truly unresolvable)
- [Question that cannot be answered from any available documentation]

### Implementation Notes
[Any technical context from architecture.md or existing codebase patterns that the PSE should know]

If there are ZERO open questions, do not include that section at all.
Keep your output concise — the story file itself has most of the detail. Focus on what the PSE needs beyond the story.
```

**If the PM returns open questions**: Present them to the user. Wait for answers. Append answers to the requirements summary.

**If the PM returns no open questions**: Proceed immediately to Step 3.

### Step 3: PSE Implement

Spawn a **PSE agent** via the `Agent` tool with `mode: "auto"` (or highest autonomy available).

Agent prompt:
```
Read and follow your instructions in .claude/agents/pse.md.

You are implementing story [STORY-ID]. Work autonomously — do not wait for human approval at any point.

**Story file**: docs/stories/[STORY-ID].md — read it in full. This is your primary spec.

**PM requirements summary**:
[Paste the PM's output here]

**Global requirements**: Read docs/stories/README.md for conventions that apply to all stories.

**Design system**: Read docs/design-systems/electric-street.md for all visual decisions.
Also check the screenshots in docs/design-systems/*.png for visual reference.

**Architecture**: Read docs/architecture.md for rendering strategy, data flow, and component patterns.

**Your workflow**:
1. Read the story file and PM summary.
2. Read ALL files listed in the story's "Files to Create" and "Files to Modify" sections that already exist.
3. Read existing components in web-app/src/components/ to understand patterns and reuse opportunities.
4. Plan your approach internally (no need to present for approval).
5. Implement the story:
   - Follow TDD where applicable (write tests first for server actions, DAL, utilities).
   - For UI components: create Storybook stories (*.stories.tsx) alongside every component.
     Include a Default story + stories for key states (Loading, Empty, Error, WithData, etc.).
   - Follow all naming conventions from docs/stories/README.md.
   - Use the design system tokens — never hardcode colors, spacing, or typography values.
6. After implementation, run these verification steps IN ORDER:
   a. `cd web-app && npm run lint` — fix any errors/warnings before proceeding.
   b. `cd web-app && npx vitest run` (or `npm test`) — fix any test failures.
   c. `cd web-app && npm run build` — fix any build errors.
   d. If you have Storybook configured: `cd web-app && npm run build-storybook 2>&1 | tail -5` — fix any story compilation errors.
7. Only declare done when ALL verification steps pass.

**Critical rules**:
- Do NOT wait for user input at any point. Make reasonable decisions and note them.
- Do NOT skip Storybook stories for UI components. They are mandatory.
- Do NOT skip tests for server actions, DAL functions, and utilities.
- Do NOT leave build/lint/test failures for the reviewer to catch.
- If you encounter an issue you truly cannot resolve, document it clearly and move on.
```

**Important**: If the story involves both frontend and Supabase changes (check the story file for migrations, RLS policies, Edge Functions), spawn two PSE agents with domain separation:
- **PSE-Supabase** first (if frontend depends on DB types): owns `supabase/` only.
- **PSE-Frontend** second (or in parallel if independent): owns `web-app/` only.
Pass the same story file and PM summary to both, with clear domain boundaries.

### Step 4: Build Verification (Orchestrator)

After the PSE agent(s) finish, the orchestrator runs verification independently:

```bash
cd web-app && npm run lint
cd web-app && npx vitest run 2>&1 | tail -30
cd web-app && npm run build 2>&1 | tail -20
```

**If any verification fails**:
- Route the specific errors back to a PSE agent with the exact failure output.
- The PSE fixes and re-runs verification.
- Max 3 fix attempts. If still failing after 3 attempts, stop and escalate to the user.

**If all pass**: Proceed to Step 5.

### Step 5: Storybook Audit

Check that Storybook stories exist for new UI components:

```bash
# Get list of new/modified component files (excluding test and story files)
git diff [epic-branch]...HEAD --name-only | grep -E '\.(tsx|jsx)$' | grep -v '\.stories\.' | grep -v '\.test\.'
```

For each component file in `src/components/` (both `ui/` and custom), verify a corresponding `*.stories.tsx` file exists:

```bash
# For each component file, check if stories exist
# Example: src/components/ui/button.tsx → src/components/ui/button.stories.tsx
```

**If stories are missing**: Route back to PSE with the list of components that need stories. PSE creates them.

**If all stories exist**: Proceed to Step 6.

### Step 6: Review

Spawn a **fresh Reviewer agent** via the `Agent` tool. This MUST be a new agent — never the same one that implemented the code.

Agent prompt:
```
Read and follow your instructions in .claude/agents/reviewer.md.

Review all code changes for story [STORY-ID].

**Story file**: docs/stories/[STORY-ID].md — read it to understand what was required.
**Design system**: docs/design-systems/electric-street.md — check visual compliance.
**Global requirements**: docs/stories/README.md — check conventions.

**Review steps**:
1. Run `git diff [epic-branch]...HEAD` to see all changes.
2. Read every changed file in full (not just the diff — understand the context).
3. Check against the story's acceptance criteria — is anything missed?
4. Check all focus areas from your instructions (correctness, security, performance, edge cases, types, accessibility).
5. Verify Storybook stories exist and cover key states.
6. Verify tests exist for server actions, DAL, and utilities.

**Output format**: Follow your standard review output format.

Be thorough but pragmatic. Focus on real bugs and missed requirements, not style preferences.
```

### Step 7: Fix Loop

**If the reviewer finds BLOCKERS**:
1. Extract the blocker list from the review.
2. Spawn a PSE agent with the specific fixes needed:
   ```
   Read .claude/agents/pse.md. Fix the following review blockers for story [STORY-ID]:

   [Paste blocker list with file paths and fix descriptions]

   After fixing, run: npm run lint && npx vitest run && npm run build
   All must pass.
   ```
3. After the PSE fixes, re-run **Step 4** (Build Verification).
4. Spawn a **fresh Reviewer agent** to re-check (only the blockers, not a full re-review):
   ```
   Read .claude/agents/reviewer.md.
   Re-review story [STORY-ID]. The previous review found these blockers:
   [List blockers]

   Verify each blocker has been fixed. Run git diff [epic-branch]...HEAD to see current state.
   Check for any new issues introduced by the fixes.
   ```
5. **Max 3 review cycles.** If blockers persist after 3 cycles, stop and escalate to the user with the remaining issues.

**If the review is clean (no blockers)**: Proceed to Step 8.

**Warnings and suggestions** from the review are logged but do NOT block the merge. Present them to the user at the end of the story summary.

### Step 8: Commit & Merge

```bash
# Stage all changes
git add -A

# Commit with story ID in message
git commit -m "$(cat <<'EOF'
feat([STORY-ID]): [Story title]

Implements [brief description of what was built].
All acceptance criteria met. Build, lint, and tests pass.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"

# Merge back to epic
git checkout [epic-branch]
git merge story/[STORY-ID-lowercase] --no-ff -m "Merge story/[STORY-ID-lowercase]: [Title]"
```

**Note**: Use `--no-ff` to preserve the story branch history in the merge commit.

### Step 9: Story Summary

After merging, output a brief summary:

```
## [STORY-ID] Complete

**Branch**: story/[id] → merged to [epic-branch]
**Files changed**: [count]
**Tests**: [pass count] passing
**Storybook**: [count] stories added
**Review**: Clean (or: X warnings — [brief list])
**Build**: Passing

[Move to next story or end run]
```

---

## After All Stories Complete

When all stories in the run are finished:

```
## Run Complete

**Epic branch**: [branch]
**Stories implemented**: [count]
1. [STORY-ID] — [Title] — Merged
2. [STORY-ID] — [Title] — Merged
...

**Total files changed**: [count]
**All builds passing**: Yes/No
**Review warnings** (non-blocking):
- [Any accumulated warnings across stories]

The epic branch is ready for review or PR.
```

---

## Error Recovery

| Scenario | Action |
|---|---|
| **PSE can't resolve an implementation issue** | Stop the story. Present the issue to the user. Resume after guidance. |
| **Build fails after 3 PSE fix attempts** | Stop the story. Show the user the failure output. Do not merge. |
| **Review blockers persist after 3 cycles** | Stop the story. Show remaining blockers. Ask user how to proceed. |
| **Merge conflict** | Run `git merge --abort`. Tell the user. They need to resolve manually. |
| **Story dependency not met** | Skip the story. Tell the user which dependency is missing. Continue with the next independent story if possible. |
| **Agent produces poor output** | Don't retry with the same prompt. Add more context (specific file paths, existing patterns, error messages) and respawn. |

## Pausing and Resuming

If the run is interrupted (user stops, context limit, error):
- The orchestrator notes which stories are done (merged to epic) and which remain.
- On resume, the user can re-invoke with the remaining story IDs.
- Already-merged stories are skipped (their branches exist in epic's history).

---

## Token / Context Management

- Each agent gets ONLY the files relevant to its task. Pass specific file paths, not directories.
- The story file + PM summary is the primary input to PSE. Don't dump the entire PRD.
- For large stories, break implementation into sequential PSE chunks if needed.
- The orchestrator holds the state between steps — agents are stateless and disposable.

---

## What This Skill Does NOT Do

- **No interactive brainstorming** — PM resolves autonomously. Use `build-feature` for interactive work.
- **No plan approval gates** — PSE plans and implements in one pass.
- **No codebase analysis documents** — agents read files directly.
- **No manifest or tracking files** — progress is tracked by merged branches.
- **No PR creation** — the skill merges to the epic branch. PR creation is a separate step.
