---
name: build
description: >
  Unified development skill. Accepts a feature description (text), story files, bug files, or requirement docs.
  Orchestrates: resolve requirements -> plan -> implement -> verify -> review -> fix loop -> commit/merge.
  Trigger on phrases like: "build", "implement", "create feature", "develop", "run story", "run stories",
  "implement story", "fix bug", "run bugs", "process backlog", "start phase", "new feature", "let's build",
  "start working on", "feature request", or any reference to story IDs (e.g. FND-001), file paths, or work items.
---

# Skill: Build

This skill runs a **unified development pipeline** that adapts to any input — a feature description, a story file, a bug report, or a batch of work items.

You — the Claude instance reading this — are the **orchestrator**. You classify the input, coordinate agents, enforce gates, and present results.

---

## Input Classification

Parse the user's input and classify it into one of three modes:

### Mode 1: Text

The user provided a plain-language feature or bug description — no file references, no story IDs.

Examples:
- `/build add a match countdown timer`
- `build a group invite flow`
- `implement dark mode toggle`

### Mode 2: File (Single)

The user referenced ONE work item — a story ID, a file path, or a single bug/requirement file.

Examples:
- `/build FND-001`
- `/build docs/stories/FND-001-project-initialization.md`
- `/build docs/bugs/BUG-016.md`

Resolution: If a story ID is given (e.g., `FND-001`), resolve it to the file in `docs/stories/`. If a file path is given, use it directly.

### Mode 3: File (Batch)

The user referenced MULTIPLE work items, a phase, or "all" — plus an epic branch name.

Examples:
- `/build epic/v1 FND-001, FND-002, FND-003`
- `/build epic/foundation phase 1`
- `/build epic/full-build all`

Resolution: Read `docs/stories/README.md` to resolve the full list with dependency order.

### Classification Priority

If the input contains both text and a file/story reference (e.g., "build the login page from AUTH-001"), treat it as **File mode** — the file reference has higher specificity.

---

## Pre-Flight (All Modes)

1. **Verify git state**: Run `git status`. Working tree must be clean. If dirty, stop and tell the user.
2. **Classify input** using the rules above. Announce the detected mode to the user.
3. **Mode-specific setup**:

| Mode | Pre-flight extras |
|------|-------------------|
| **Text** | Generate a short kebab-case description (e.g., `match-countdown`, `group-invite-flow`). |
| **File (single)** | Resolve the file path. Verify the file exists. If an epic branch was provided, verify it exists (create if needed). |
| **File (batch)** | Verify epic branch exists (create if needed). Checkout epic branch. Read `docs/stories/README.md` to resolve the full item list. Validate dependencies (each item's dependencies must be already implemented or earlier in the run list). Present the run plan and wait for user confirmation — this is the **only** user gate in batch mode. |

**Batch run plan format:**
```
## Build Run Plan
Epic branch: [branch]
Items to implement (in order):
1. [ID] — [Title]
2. [ID] — [Title]
...

Proceed? (y/n)
```

---

## Pipeline

For each work item (single pass in Text/File-Single modes, loop in Batch mode), execute these steps sequentially.

**No shortcuts:** Always execute every step in order, regardless of how small or simple the change seems. A 3-line fix still gets E2E test updates, build verification, a reviewer pass, and a PRD check. The value of this pipeline is consistency — if you skip steps for "simple" changes, you create the exact gaps this skill exists to prevent. Never implement directly as the orchestrator; always spawn PSE agent(s) for Step 5.

### Step 1: Resolve Requirements

| Mode | Behavior |
|------|----------|
| **Text (vague/complex)** | Spawn **PM agent** via `Agent` tool for interactive brainstorming with the user. Prompt: `"Read and follow your instructions in .claude/agents/pm.md. The user wants to build: [requirement]. Work with them to refine this into clear requirements. Ask clarifying questions, make product decisions, identify edge cases, and define scope."` |
| **Text (clear)** | Skip the PM agent. Proceed directly to planning. |
| **File (single or batch)** | Spawn **PM agent** in autonomous resolve mode. Prompt: `"Read and follow your instructions in .claude/agents/pm.md. You are operating in AUTONOMOUS RESOLVE mode — not interactive brainstorming mode. Read the work item file: [file path]. Identify ambiguities and resolve them from: docs/PRD.V2.md → docs/architecture.md → docs/design-systems/electric-street.md → docs/stories/README.md → codebase patterns. Only include truly unresolvable questions in Open Questions. Output: What We're Building, Key Requirements, Resolved Ambiguities, Open Questions (only if unresolvable), Implementation Notes."` |

**If the PM returns open questions**: Present them to the user. Wait for answers. Append answers to the requirements summary.

**If the PM returns no open questions (or Text mode skipped PM)**: Proceed immediately.

### Step 2: Plan

| Mode | Behavior |
|------|----------|
| **Text** | Read `docs/PRD.V2.md` and the relevant codebase files. Check if this feature already exists in the PRD. Produce a structured implementation plan and present it to the user: |
| **File** | The work item file IS the plan — PSE plans internally during implementation. Skip to Step 3. |

**Text mode plan format:**
```
## Implementation Plan: [Feature Name]

### What We're Building
[1-2 sentences]

### Files to Create
- [file path] — [purpose]

### Files to Modify
- [file path] — [what changes]

### Key Decisions
- [Decision + reasoning]

### Database Changes
- [Migrations needed, or "None"]
```

### Step 3: User Approval Gate (Text mode only)

| Mode | Gate? |
|------|-------|
| **Text** | **YES** — present the plan. Do NOT proceed until the user approves. If they give feedback, adjust and re-present. |
| **File (single)** | **NO** — proceed autonomously. |
| **File (batch)** | **NO** — the pre-flight confirmation was the blanket approval. |

### Step 4: Branch

```bash
# Text mode
git checkout -b feature/[short-description]

# File mode with epic branch
git checkout [epic-branch]
git pull origin [epic-branch] 2>/dev/null || true
git checkout -b story/[item-id-lowercase]

# File mode without epic branch (single only)
git checkout -b feature/[item-id-lowercase]
```

Branch naming by work item type:
- Story: `story/[story-id-lowercase]` (e.g., `story/fnd-001`)
- Bug fix: `fix/[bug-id-or-description]` (e.g., `fix/bug-016`)
- Feature/requirement: `feature/[short-description]`

### Step 5: Implement

Spawn **PSE agent(s)** via the `Agent` tool.

**Single-domain feature** (frontend-only OR backend-only): Spawn one PSE agent.

**Cross-domain feature** (frontend + Supabase changes): Spawn two PSE agents with strict domain separation:
1. **PSE-Supabase** (runs first if frontend depends on DB types): owns `supabase/` only.
2. **PSE-Frontend** (runs after or in parallel if independent): owns `web-app/` only.

**Agent prompt template:**

For **Text mode**:
```
Read and follow your instructions in .claude/agents/pse.md.
Implement the following feature: [plan summary].
Files to read first: [list specific file paths].
Read docs/PRD.V2.md for relevant business logic, schema, and requirements.
Follow existing code patterns.

Your workflow:
1. Read the plan summary and all listed files.
2. Read existing components in web-app/src/components/ for reuse opportunities.
3. Implement:
   - Follow TDD where applicable.
   - Create Storybook stories (*.stories.tsx) for all UI components (Default + key states).
   - Add/update E2E tests in web-app/e2e/ for new or changed user flows.
   - Use design system tokens — never hardcode colors, spacing, or typography.
4. Run verification in order:
   a. cd web-app && npm run lint
   b. cd web-app && npx vitest run
   c. cd web-app && npm run build
5. Only declare done when ALL verification steps pass.
```

For **File mode**:
```
Read and follow your instructions in .claude/agents/pse.md.
You are implementing [ITEM-ID]. Work autonomously — do not wait for human approval.

**Work item file**: [file path] — read it in full. This is your primary spec.
**PM requirements summary**: [paste PM output]
**Global requirements**: Read docs/stories/README.md for conventions.
**Design system**: Read docs/design-systems/electric-street.md for visual decisions. Check docs/design-systems/*.png for visual reference.
**Architecture**: Read docs/architecture.md for rendering strategy, data flow, component patterns.

Your workflow:
1. Read the work item file and PM summary.
2. Read ALL files listed in "Files to Create" and "Files to Modify" sections that already exist.
3. Read existing components in web-app/src/components/ for reuse opportunities.
4. Plan internally (no approval needed).
5. Implement:
   - Follow TDD where applicable.
   - Create Storybook stories (*.stories.tsx) for all UI components (Default + key states).
   - Add/update E2E tests in web-app/e2e/tests/ for new or changed user flows.
   - Use design system tokens — never hardcode colors, spacing, or typography.
6. Run verification in order:
   a. cd web-app && npm run lint
   b. cd web-app && npx vitest run
   c. cd web-app && npm run build
   d. cd web-app && npm run build-storybook 2>&1 | tail -5 (if configured)
7. Only declare done when ALL verification steps pass.

Critical: Do NOT wait for user input. Make reasonable decisions and note them.
```

### Step 6: Build Verification (Orchestrator)

After PSE agent(s) finish, run verification independently:

```bash
cd web-app && npm run lint
cd web-app && npx vitest run 2>&1 | tail -30
cd web-app && npm run build 2>&1 | tail -20
```

**If any fail**: Route specific errors back to a PSE agent. Max **3 fix attempts**. If still failing, escalate to user.

### Step 7: Storybook Audit

Check that new/modified UI components have Storybook stories:

```bash
# Get new/modified component files (excluding stories and tests)
git diff [base-branch]...HEAD --name-only | grep -E '\.(tsx|jsx)$' | grep -v '\.stories\.' | grep -v '\.test\.'
```

For each component in `src/components/`, verify a `*.stories.tsx` exists. If missing, route back to PSE.

### Step 8: Review

Spawn a **fresh Reviewer agent** — MUST be a new agent, never the one that wrote the code.

```
Read and follow your instructions in .claude/agents/reviewer.md.
Review all code changes for [feature name / ITEM-ID].

**Context**: [plan summary or work item file path]
**Design system**: docs/design-systems/electric-street.md
**Global requirements**: docs/stories/README.md

Review steps:
1. Run git diff [base-branch]...HEAD to see all changes.
2. Read every changed file in full context.
3. Check against acceptance criteria / plan.
4. Check all focus areas (correctness, security, performance, edge cases, types, accessibility).
5. Verify Storybook stories and test coverage.
6. Verify E2E tests exist for new or changed user flows (web-app/e2e/tests/).

Be thorough but pragmatic. Focus on real bugs and missed requirements.
```

### Step 9: Fix Loop

**If blockers found**:
1. Extract blocker list.
2. Spawn PSE agent with specific fixes.
3. Re-run Step 6 (Build Verification).
4. Spawn fresh Reviewer for re-check (blockers only, not full re-review).
5. **Max 3 review cycles.** If blockers persist, escalate to user.

**If clean**: Proceed to commit.

**Warnings and suggestions** are logged but do NOT block. Present them in the summary.

### Step 10: Commit

```bash
git add -A

# Commit message adapts to work item type
git commit -m "$(cat <<'EOF'
feat([ID-or-description]): [Title]

Implements [brief description].
All acceptance criteria met. Build, lint, and tests pass.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

Use `fix(...)` prefix for bug fixes, `feat(...)` for features/stories.

### Step 11: Merge (Conditional)

| Mode | Merge behavior |
|------|----------------|
| **Text** | NO auto-merge. Leave on feature branch for user to decide. |
| **File with epic branch** | Merge back to epic: `git checkout [epic-branch] && git merge story/[id] --no-ff -m "Merge story/[id]: [Title]"` |
| **File without epic branch** | NO auto-merge. Leave on branch. |

### Step 12: PRD Update

After committing, check whether the feature/change is already documented in `docs/PRD.V2.md`.

- **If already in the PRD**: No action needed.
- **If NOT in the PRD** (new feature, new behavior, new schema, new endpoint): Update `docs/PRD.V2.md` to reflect what was built — add the feature to the relevant section, update schema if tables/columns were added, and document any new business logic. Keep the update concise and consistent with the PRD's existing style.

This ensures the PRD remains the single source of truth and stays in sync with the codebase.

### Step 13: Summary

**Text / File (single) summary:**
```
## [Feature / ITEM-ID] Complete

**Branch**: [branch name] (or: merged to [epic-branch])
**Files changed**: [count]
**Tests**: [pass count] passing
**Storybook**: [count] stories added/updated
**Review**: Clean (or: X warnings — [brief list])
**Build**: Passing
```

**Batch — after ALL items complete:**
```
## Run Complete

**Epic branch**: [branch]
**Items implemented**: [count]
1. [ID] — [Title] — Merged
2. [ID] — [Title] — Merged
...

**Total files changed**: [count]
**All builds passing**: Yes/No
**Review warnings** (non-blocking):
- [Accumulated warnings]

The epic branch is ready for review or PR.
```

---

## Error Recovery

| Scenario | Action |
|---|---|
| **PSE can't resolve an implementation issue** | Stop the item. Present the issue to the user. Resume after guidance. |
| **Build fails after 3 fix attempts** | Stop the item. Show failure output. Do not merge. |
| **Review blockers persist after 3 cycles** | Stop the item. Show remaining blockers. Ask user how to proceed. |
| **Merge conflict** | Run `git merge --abort`. Tell the user — they resolve manually. |
| **Dependency not met (batch)** | Skip the item. Tell the user which dependency is missing. Continue with next independent item if possible. |
| **Agent produces poor output** | Don't retry with same prompt. Add more context (specific file paths, existing patterns, error messages) and respawn. |
| **Conflicting agent outputs (PSE-Frontend vs PSE-Supabase)** | Orchestrator resolves based on the plan. If tradeoff is significant, ask the user. |
| **User goes silent at a gate** | Ping once with a summary. Don't proceed without approval. |
| **Git conflicts** | Rebase on base branch before the review phase. |

## Pausing and Resuming (Batch Mode)

If a batch run is interrupted (user stops, context limit, error):
- Note which items are done (merged to epic) and which remain.
- On resume, the user re-invokes with the remaining item IDs.
- Already-merged items are skipped (their branches exist in epic's history).

---

## Token / Context Management

- Give each agent ONLY the files relevant to its task. Specific paths, not entire directories.
- Pass the plan / PM summary as concise text, not a file reference that the agent has to re-parse.
- For large items, break implementation into sequential PSE chunks rather than one massive prompt.
- The orchestrator holds state between steps — agents are stateless and disposable.

---

## What This Skill Does NOT Do

- **No codebase analysis documents.** Agents read the code directly.
- **No architecture documents.** The implementation plan IS the architecture.
- **No mandatory feature docs directory.** Create docs only if the user asks.
- **No manifest or tracking files.** Progress is tracked by merged branches and conversation.
- **No traceability matrices.** If something's wrong, the reviewer will find it.
- **No PR creation.** The skill commits/merges. PR creation is a separate step.
- **No documentation phase.** Write docs only when the user explicitly requests them.
